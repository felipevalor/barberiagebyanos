import { getToken } from './auth.js';
import { BARBEROS_CONFIG, SERVICIOS, SLOT_DURATION, generateSlots, getSchedule, checkFeriado, getGoogleAccessToken, getCalendarEvents } from './_gcal.js';

export async function onRequestGet({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const url   = new URL(request.url);
  const fecha = url.searchParams.get('fecha');
  const bId   = session.role === 'owner' ? url.searchParams.get('barbero') : session.barbero_id;

  if (!fecha) return json({ error: 'Falta fecha' }, 400);
  if (!bId)   return json({ error: 'Falta barbero' }, 400);

  const cfg = BARBEROS_CONFIG[bId];
  if (!cfg) return json({ error: 'Barbero no encontrado' }, 404);

  const [d, m, y] = fecha.split('/').map(Number);
  const pad = n => String(n).padStart(2, '0');
  const dow = new Date(`${y}-${pad(m)}-${pad(d)}T12:00:00Z`).getUTCDay();

  const schedule  = await getSchedule(bId, env);
  const slotHours = generateSlots(schedule, dow);
  if (slotHours.length === 0) {
    return json({ slots: [], calendarConfigured: !!cfg.calendarId, diaNoLaboral: true });
  }

  // Verificar si es feriado no trabajado
  if (await checkFeriado(fecha, bId, env)) {
    return json({ slots: [], calendarConfigured: !!cfg.calendarId, diaNoLaboral: true, esFeriado: true });
  }

  // Reservas del día desde D1 — incluimos id y calendar_event_id
  const { results: reservas } = await env.barberia_db.prepare(
    'SELECT id, nombre, servicio, mensaje, calendar_event_id FROM reservas WHERE mensaje LIKE ? AND barbero = ? ORDER BY mensaje ASC'
  ).bind(`${fecha} %`, cfg.nombre).all();

  const reservasByHora = {};
  // Ventanas de duración: { startMin, endMin, nombre, servicio }
  const reservaWindows = [];
  for (const r of reservas) {
    const hora = r.mensaje?.split(' ')[1];
    if (!hora) continue;
    reservasByHora[hora] = r;
    const [h, min] = hora.split(':').map(Number);
    const startMin = h * 60 + min;
    const duracion = SERVICIOS[r.servicio] ?? SLOT_DURATION;
    reservaWindows.push({ startMin, endMin: startMin + duracion, nombre: r.nombre, servicio: r.servicio });
  }

  // Eventos de Google Calendar
  let calendarEvents = [];
  if (cfg.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
      const tk = await getGoogleAccessToken(sa);
      calendarEvents = await getCalendarEvents(cfg.calendarId, fecha, tk);
    } catch (e) {
      console.error('Calendar read error:', e);
    }
  }

  // Construir lista de slots con estado
  const slots = slotHours.map(hora => {
    const [h, min] = hora.split(':').map(Number);
    const slotMin = h * 60 + min;

    // 1. Reserva exacta en este horario
    if (reservasByHora[hora]) {
      const r = reservasByHora[hora];
      return {
        hora,
        status: 'reservado',
        id: r.id,
        nombre: r.nombre,
        servicio: r.servicio,
        calendar_event_id: r.calendar_event_id || null,
      };
    }

    // 2. Slot cubierto por la duración de una reserva anterior (ej: 15:00 bloqueado por Corte+Barba de 14:30)
    const cubierto = reservaWindows.find(w => slotMin > w.startMin && slotMin < w.endMin);
    if (cubierto) {
      return { hora, status: 'ocupado', nombre: cubierto.nombre, servicio: cubierto.servicio };
    }

    // 3. Evento de Google Calendar no-turno (bloqueo manual)
    if (calendarEvents.length > 0) {
      const slotStart = new Date(`${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00-03:00`);
      const slotEnd   = new Date(slotStart.getTime() + SLOT_DURATION * 60 * 1000);

      const bloqueoEv = calendarEvents.find(ev => {
        if (ev.summary.startsWith('Turno —')) return false;
        return slotStart < new Date(ev.end) && slotEnd > new Date(ev.start);
      });
      if (bloqueoEv) return { hora, status: 'bloqueado', calendarEventId: bloqueoEv.id };
    }

    return { hora, status: 'libre' };
  });

  return json({ slots, calendarConfigured: !!cfg.calendarId, diaNoLaboral: false });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
