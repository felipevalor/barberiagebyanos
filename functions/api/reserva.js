import { BARBEROS_CONFIG, SERVICIOS, sendWhatsAppNotification, getServicios, getGoogleAccessToken, createCalendarEvent } from '../admin/api/_gcal.js';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    const body = await request.json();
    const { nombre, telefono, servicio, barberoId, barbero: barberoNombre, fecha, hora, calendarId, duracion } = body;

    if (!nombre?.trim() || !telefono?.trim() || !servicio || !fecha || !hora) {
      return res({ success: false, error: 'Faltan campos obligatorios' }, 400);
    }

    // Resolver barberoId desde nombre si no viene
    const bId = barberoId || Object.keys(BARBEROS_CONFIG).find(
      k => BARBEROS_CONFIG[k].nombre === barberoNombre
    );
    const cfg = bId ? BARBEROS_CONFIG[bId] : null;

    // ── Validar disponibilidad (overlap) ─────────────────────────────────────
    const serviciosMap = bId ? await getServicios(env, bId) : { ...SERVICIOS };
    const durMin       = duracion ?? serviciosMap[servicio] ?? 30;

    const [hNew, mNew] = hora.split(':').map(Number);
    const newStart = hNew * 60 + mNew;
    const newEnd   = newStart + durMin;

    const nombreBarbero = cfg?.nombre || barberoNombre || '';
    const { results: existentes } = await env.barberia_db.prepare(
      'SELECT mensaje, servicio FROM reservas WHERE mensaje LIKE ? AND barbero = ?'
    ).bind(`${fecha} %`, nombreBarbero).all();

    for (const r of existentes) {
      const rHora = r.mensaje?.split(' ')[1];
      if (!rHora) continue;
      const [rh, rm] = rHora.split(':').map(Number);
      const rStart = rh * 60 + rm;
      const rEnd   = rStart + (serviciosMap[r.servicio] ?? 30);
      if (newStart < rEnd && newEnd > rStart) {
        return res({ success: false, error: 'Ese horario ya fue tomado. Elegí otro.' }, 409);
      }
    }

    // ── Guardar en D1 (sin calendar_event_id por ahora) ──────────────────────
    const mensaje = `${fecha} ${hora}`;
    const calId   = calendarId || cfg?.calendarId;
    await env.barberia_db.prepare(
      `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
    ).bind(
      nombre.trim(),
      telefono.trim().replace(/[\s\-().+]/g, ''),
      servicio,
      nombreBarbero,
      fecha,
      mensaje,
      new Date().toISOString()
    ).run();

    // ── Calendar + WA en background (no bloquean la respuesta) ───────────────
    waitUntil(Promise.all([
      // Crear evento en Google Calendar y actualizar D1 con el event_id
      (async () => {
        if (!calId || !env.GOOGLE_SERVICE_ACCOUNT) return;
        try {
          const sa  = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
          const tk  = await getGoogleAccessToken(sa);
          const eid = await createCalendarEvent(calId, `Turno — ${nombre.trim()} (${servicio})`, fecha, hora, durMin, tk);
          if (eid) {
            await env.barberia_db.prepare(
              'UPDATE reservas SET calendar_event_id = ? WHERE mensaje = ? AND barbero = ?'
            ).bind(eid, mensaje, nombreBarbero).run();
          }
        } catch (e) { console.error('Calendar error:', e); }
      })(),
      // Notificar al barbero por WA
      bId ? sendWhatsAppNotification(bId, { nombre: nombre.trim(), servicio, fecha, hora }, env).catch(() => {}) : Promise.resolve(),
    ]));

    return res({ success: true, turno: { nombre: nombre.trim(), servicio, barbero: nombreBarbero, fecha, hora } });

  } catch (error) {
    const isDouble = error?.message?.includes('UNIQUE constraint failed');
    return res(
      { success: false, error: isDouble ? 'Ese horario ya fue tomado. Elegí otro.' : 'Error interno' },
      isDouble ? 409 : 500
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

function res(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
