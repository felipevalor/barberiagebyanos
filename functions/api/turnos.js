// GET /api/turnos?barbero=Gebyano&fecha=15/3/2026&barberoId=gebyano
// Devuelve slots ocupados: reservas D1 + eventos de Google Calendar del barbero.
// Si el barbero tiene calendarId configurado, los eventos personales también bloquean slots.

import { getGoogleAccessToken, getCalendarEvents, BARBEROS_CONFIG, getServicios, SLOT_DURATION, SERVICIOS } from '../admin/api/_gcal.js';
import { isRateLimited } from './_ratelimit.js';

// Fallback cuando D1 no responde o barberoId no se provee.
// Mergea los nombres canónicos de _gcal.js::SERVICIOS con los nombres
// extendidos que el frontend puede enviar (ej: "Niños 10-13 años").
// Así si SERVICIOS se actualiza, el fallback lo recoge automáticamente.
const SERVICIOS_DUR_FALLBACK = {
  ...SERVICIOS,
  'Niños 10-13 años': 30,
  'Niños 0-9 años':   30,
};

export async function onRequestGet({ request, env }) {
  if (await isRateLimited(request, env, 'turnos-get', 30, 60)) {
    return json({ error: 'Demasiadas solicitudes.' }, 429);
  }
  const url       = new URL(request.url);
  const barbero   = url.searchParams.get('barbero')?.trim();
  const barberoId = url.searchParams.get('barberoId')?.trim();
  const fecha     = url.searchParams.get('fecha')?.trim();

  if (!barbero || !fecha) return json({ occupied: [] });

  // ── Durations: DB-backed per barbero, fallback to static map ─────────────
  let serviciosMap = SERVICIOS_DUR_FALLBACK;
  if (barberoId) {
    try { serviciosMap = await getServicios(env, barberoId); } catch { /* use fallback */ }
  }

  // ── D1: reservas existentes ───────────────────────────────────────────────
  const { results } = await env.barberia_db.prepare(
    'SELECT mensaje, servicio FROM reservas WHERE barbero = ? AND fecha = ?'
  ).bind(barbero, fecha).all();

  const occupied = results
    .map(r => ({ hora: r.mensaje?.split(' ')[1], duracion: serviciosMap[r.servicio] || SLOT_DURATION }))
    .filter(r => r.hora);

  // ── Google Calendar: eventos personales del barbero ───────────────────────
  if (barberoId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      // Buscar calendarId: primero D1, fallback a BARBEROS_CONFIG hardcodeado
      let calendarId = BARBEROS_CONFIG[barberoId]?.calendarId || null;
      try {
        const row = await env.barberia_db.prepare(
          'SELECT calendar_id FROM barberos_config WHERE id = ?'
        ).bind(barberoId).first();
        if (row?.calendar_id) calendarId = row.calendar_id;
      } catch {}

      if (calendarId) {
        const sa     = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk     = await getGoogleAccessToken(sa);
        const events = await getCalendarEvents(calendarId, fecha, tk);

        for (const ev of events) {
          // Extraer hora local directamente del ISO string (-03:00) para evitar
          // conversiones UTC incorrectas dentro del Worker
          const hora     = ev.start.slice(11, 16); // "17:30"
          // diff de timestamps es correcto independientemente del timezone (UTC invariante)
          const duracion = Math.round((new Date(ev.end) - new Date(ev.start)) / 60000);
          occupied.push({ hora, duracion });
        }
      }
    } catch { /* fallo de GCal nunca bloquea la respuesta */ }
  }

  return json({ occupied });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
