import { getSession } from './_session.js';
import { BARBEROS_CONFIG, SLOT_DURATION, getGoogleAccessToken, createCalendarEvent, deleteCalendarEvent } from './_gcal.js';

// ── Bloquear slot libre ───────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { barbero_id, fecha, hora } = await request.json();
  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;
  const cfg  = BARBEROS_CONFIG[bId];

  if (!cfg) return json({ error: 'Barbero no encontrado' }, 404);
  if (!cfg.calendarId) return json({ error: 'Este barbero no tiene calendario configurado todavía' }, 400);

  try {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
    const tk = await getGoogleAccessToken(sa);
    await createCalendarEvent(cfg.calendarId, '🔒 Bloqueado — Gebyanos Admin', fecha, hora, SLOT_DURATION, tk);
    return json({ success: true });
  } catch (e) {
    console.error('Bloquear error:', e);
    return json({ error: 'Error al bloquear el turno' }, 500);
  }
}

// ── Desbloquear slot (eliminar evento de Calendar) ────────────────────────────
export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { barbero_id, calendarEventId } = await request.json();
  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;
  const cfg  = BARBEROS_CONFIG[bId];

  if (!cfg)            return json({ error: 'Barbero no encontrado' }, 404);
  if (!cfg.calendarId) return json({ error: 'Sin calendario configurado' }, 400);
  if (!calendarEventId) return json({ error: 'Falta calendarEventId' }, 400);

  try {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
    const tk = await getGoogleAccessToken(sa);
    await deleteCalendarEvent(cfg.calendarId, calendarEventId, tk);
    return json({ success: true });
  } catch (e) {
    console.error('Desbloquear error:', e);
    return json({ error: 'Error al desbloquear el turno' }, 500);
  }
}


function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
