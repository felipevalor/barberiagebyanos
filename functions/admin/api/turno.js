import { getToken } from './auth.js';
import { BARBEROS_CONFIG, SLOT_DURATION, getServicios, getGoogleAccessToken, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './_gcal.js';

// ── Crear turno manual ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { barbero_id, fecha, hora, nombre, servicio } = await request.json();

  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (!servicio)        return json({ error: 'El servicio es obligatorio' }, 400);
  if (!fecha || !hora)  return json({ error: 'Falta fecha u hora' }, 400);

  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;
  const cfg = BARBEROS_CONFIG[bId];
  if (!cfg) return json({ error: 'Barbero no encontrado' }, 404);

  const serviciosMap = await getServicios(env, bId);
  const duracion = serviciosMap[servicio] ?? SLOT_DURATION;

  // Validar overlap con reservas existentes del mismo día y barbero
  const [hNew, minNew] = hora.split(':').map(Number);
  const newStart = hNew * 60 + minNew;
  const newEnd   = newStart + duracion;

  const { results: existentes } = await env.barberia_db.prepare(
    'SELECT mensaje, servicio FROM reservas WHERE mensaje LIKE ? AND barbero = ?'
  ).bind(`${fecha} %`, cfg.nombre).all();

  for (const r of existentes) {
    const rHora = r.mensaje?.split(' ')[1];
    if (!rHora) continue;
    const [rh, rm] = rHora.split(':').map(Number);
    const rStart = rh * 60 + rm;
    const rEnd   = rStart + (serviciosMap[r.servicio] ?? SLOT_DURATION);
    if (newStart < rEnd && newEnd > rStart) {
      return json({ error: `Ese horario se superpone con un turno existente (${rHora} · ${r.servicio})` }, 409);
    }
  }

  // Crear evento en Google Calendar (best-effort)
  let calendarEventId = null;
  if (cfg.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
      const tk = await getGoogleAccessToken(sa);
      calendarEventId = await createCalendarEvent(
        cfg.calendarId,
        `Turno — ${nombre.trim()} (${servicio})`,
        fecha, hora, duracion, tk
      );
    } catch (e) {
      console.error('Calendar create error:', e);
    }
  }

  try {
    const result = await env.barberia_db.prepare(
      `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, created_at)
       VALUES (?, '', ?, ?, ?, ?, ?, ?)`
    ).bind(
      nombre.trim(),
      servicio,
      cfg.nombre,
      fecha,
      `${fecha} ${hora}`,
      calendarEventId,
      new Date().toISOString()
    ).run();

    return json({ success: true, id: result.meta?.last_row_id });
  } catch (e) {
    // Rollback del evento de Calendar si el INSERT falló
    if (calendarEventId && cfg.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk = await getGoogleAccessToken(sa);
        await deleteCalendarEvent(cfg.calendarId, calendarEventId, tk);
      } catch (_) {}
    }
    const isDouble = e?.message?.includes('UNIQUE constraint failed');
    return json({ error: isDouble ? 'Ese horario ya está reservado' : 'Error al guardar el turno' }, isDouble ? 409 : 500);
  }
}

// ── Editar turno (nombre + servicio) ─────────────────────────────────────────
export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id, nombre, servicio } = await request.json();

  if (!id)               return json({ error: 'Falta id' }, 400);
  if (!nombre?.trim())   return json({ error: 'El nombre es obligatorio' }, 400);
  if (!servicio)         return json({ error: 'El servicio es obligatorio' }, 400);

  // Leer el turno para verificar permisos y obtener calendar_event_id
  const reserva = await env.barberia_db.prepare(
    'SELECT id, barbero, calendar_event_id FROM reservas WHERE id = ?'
  ).bind(id).first();

  if (!reserva) return json({ error: 'Turno no encontrado' }, 404);

  // Barbero solo puede editar sus propios turnos
  const cfg = getBarberoConfigByNombre(reserva.barbero);
  if (session.role !== 'owner' && cfg?.id !== session.barbero_id) {
    return json({ error: 'Sin permisos para editar este turno' }, 403);
  }

  // Actualizar en D1
  await env.barberia_db.prepare(
    'UPDATE reservas SET nombre = ?, servicio = ? WHERE id = ?'
  ).bind(nombre.trim(), servicio, id).run();

  // Actualizar en Calendar (best-effort)
  if (reserva.calendar_event_id && cfg?.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
      const tk = await getGoogleAccessToken(sa);
      await updateCalendarEvent(
        cfg.calendarId,
        reserva.calendar_event_id,
        `Turno — ${nombre.trim()} (${servicio})`,
        tk
      );
    } catch (e) {
      console.error('Calendar update error:', e);
    }
  }

  return json({ success: true });
}

// ── Eliminar turno ────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id } = await request.json();
  if (!id) return json({ error: 'Falta id' }, 400);

  const reserva = await env.barberia_db.prepare(
    'SELECT id, barbero, calendar_event_id FROM reservas WHERE id = ?'
  ).bind(id).first();

  if (!reserva) return json({ error: 'Turno no encontrado' }, 404);

  const cfg = getBarberoConfigByNombre(reserva.barbero);
  if (session.role !== 'owner' && cfg?.id !== session.barbero_id) {
    return json({ error: 'Sin permisos para eliminar este turno' }, 403);
  }

  // Eliminar de D1 primero (fuente de verdad)
  await env.barberia_db.prepare('DELETE FROM reservas WHERE id = ?').bind(id).run();

  // Eliminar de Calendar (best-effort)
  if (reserva.calendar_event_id && cfg?.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
      const tk = await getGoogleAccessToken(sa);
      await deleteCalendarEvent(cfg.calendarId, reserva.calendar_event_id, tk);
    } catch (e) {
      console.error('Calendar delete error:', e);
    }
  }

  return json({ success: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getSession(request, env) {
  const token = getToken(request);
  if (!token) return null;
  return env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
}

function getBarberoConfigByNombre(nombre) {
  for (const [id, cfg] of Object.entries(BARBEROS_CONFIG)) {
    if (cfg.nombre === nombre) return { ...cfg, id };
  }
  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
