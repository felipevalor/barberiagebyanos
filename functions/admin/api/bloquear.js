import { getToken } from './auth.js';
import { BARBEROS_CONFIG, SLOT_DURATION, getGoogleAccessToken } from './_gcal.js';

export async function onRequestPost({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const { barbero_id, fecha, hora } = await request.json();
  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;
  const cfg  = BARBEROS_CONFIG[bId];

  if (!cfg) return json({ error: 'Barbero no encontrado' }, 404);

  if (!cfg.calendarId) {
    return json({ error: 'Este barbero no tiene calendario configurado todavía' }, 400);
  }

  try {
    const sa          = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
    const accessToken = await getGoogleAccessToken(sa);

    const [d, m, y] = fecha.split('/').map(Number);
    const [h, min]  = hora.split(':').map(Number);
    const pad = n => String(n).padStart(2, '0');
    const ds  = `${y}-${pad(m)}-${pad(d)}`;
    const startISO = `${ds}T${pad(h)}:${pad(min)}:00-03:00`;
    const total    = h * 60 + min + SLOT_DURATION;
    const endISO   = `${ds}T${pad(Math.floor(total / 60))}:${pad(total % 60)}:00-03:00`;

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: '🔒 Bloqueado — Gebyanos Admin',
          start: { dateTime: startISO, timeZone: 'America/Argentina/Buenos_Aires' },
          end:   { dateTime: endISO,   timeZone: 'America/Argentina/Buenos_Aires' },
        }),
      }
    );

    if (!res.ok) throw new Error(JSON.stringify(await res.json()));
    return json({ success: true });
  } catch (e) {
    console.error('Bloquear error:', e);
    return json({ error: 'Error al bloquear el turno' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
