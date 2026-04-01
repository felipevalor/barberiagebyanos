import { BARBEROS_CONFIG, SERVICIOS, sendWhatsAppNotification, getServicios, getGoogleAccessToken, createCalendarEvent, normalizeTel, checkOverlap } from '../admin/api/_gcal.js';
import { isRateLimited } from './_ratelimit.js';

const ALLOWED_ORIGINS = [
  'https://gebyanos.com.ar',
  'https://barberia-d8q.pages.dev',
];

function getCors(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pages.dev');
  const allowedOrigin = allowed ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (await isRateLimited(request, env, 'reserva-post', 5, 60)) {
    return res({ success: false, error: 'Demasiadas solicitudes. Intentá en un momento.' }, 429, request);
  }
  try {
    const body = await request.json();
    const { nombre, telefono, servicio, barberoId, barbero: barberoNombre, fecha, hora, calendarId, duracion, precio_ars } = body;

    if (!nombre?.trim() || !telefono?.trim() || !servicio || !fecha || !hora) {
      return res({ success: false, error: 'Faltan campos obligatorios' }, 400, request);
    }

    // Resolver barberoId desde nombre si no viene
    const bId = barberoId || Object.keys(BARBEROS_CONFIG).find(
      k => BARBEROS_CONFIG[k].nombre === barberoNombre
    );
    const cfg = bId ? BARBEROS_CONFIG[bId] : null;

    // ── Validar disponibilidad (overlap) ─────────────────────────────────────
    const serviciosMap = bId ? await getServicios(env, bId) : { ...SERVICIOS };
    const durMin       = duracion ?? serviciosMap[servicio] ?? 30;

    const nombreBarbero = cfg?.nombre || barberoNombre || '';
    const { overlap } = await checkOverlap(env, nombreBarbero, fecha, hora, durMin, serviciosMap);
    if (overlap) {
      return res({ success: false, error: 'Ese horario ya fue tomado. Elegí otro.' }, 409, request);
    }

    // ── Guardar en D1 (sin calendar_event_id por ahora) ──────────────────────
    const mensaje = `${fecha} ${hora}`;
    const calId   = calendarId || cfg?.calendarId;
    const cancelToken = crypto.randomUUID();
    await env.barberia_db.prepare(
      `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, cancel_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
    ).bind(
      nombre.trim(),
      normalizeTel(telefono),
      servicio,
      nombreBarbero,
      fecha,
      mensaje,
      cancelToken,
      new Date().toISOString()
    ).run();

    // ── Upsert en clientes (best-effort, no bloquea) ─────────────────────────
    const telNorm = normalizeTel(telefono);
    const now = new Date().toISOString();
    waitUntil(
      (async () => {
        try {
          const existing = await env.barberia_db.prepare(
            'SELECT id FROM clientes WHERE telefono = ?'
          ).bind(telNorm).first();
          if (existing) {
            await env.barberia_db.prepare(
              'UPDATE clientes SET nombre = ?, updated_at = ? WHERE id = ?'
            ).bind(nombre.trim(), now, existing.id).run();
          } else {
            await env.barberia_db.prepare(
              'INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)'
            ).bind(nombre.trim(), telNorm, now, now).run();
          }
        } catch (e) { console.error('Clientes upsert error:', e); }
      })()
    );

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
      bId ? sendWhatsAppNotification(bId, { nombre: nombre.trim(), servicio, fecha, hora, precio_ars: precio_ars ?? null }, env).catch(() => {}) : Promise.resolve(),
    ]));

    return res({ success: true, turno: { nombre: nombre.trim(), servicio, barbero: nombreBarbero, fecha, hora }, cancel_token: cancelToken }, 200, request);

  } catch (error) {
    const isDouble = error?.message?.includes('UNIQUE constraint failed');
    return res(
      { success: false, error: isDouble ? 'Ese horario ya fue tomado. Elegí otro.' : 'Error interno' },
      isDouble ? 409 : 500,
      request
    );
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: getCors(request) });
}

function res(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), { status, headers: getCors(request) });
}
