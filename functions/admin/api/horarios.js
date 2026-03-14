import { getToken } from './auth.js';
import { BARBEROS_CONFIG, DEFAULT_SCHEDULE } from './_gcal.js';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ── GET: horario de un barbero ────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const url = new URL(request.url);
  const bId = session.role === 'owner' ? (url.searchParams.get('barbero') || session.barbero_id) : session.barbero_id;

  if (!BARBEROS_CONFIG[bId]) return json({ error: 'Barbero no encontrado' }, 404);

  const { results } = await env.barberia_db.prepare(
    'SELECT dow, activo, hora_inicio, hora_fin FROM barbero_horarios WHERE barbero_id = ?'
  ).bind(bId).all();

  const byDow = {};
  for (const r of results) byDow[r.dow] = r;

  // Devuelve siempre los 7 días, rellenando desde DEFAULT_SCHEDULE si faltan filas
  const schedule = Array.from({ length: 7 }, (_, dow) => {
    if (byDow[dow]) {
      return { dow, nombre: DIAS[dow], activo: !!byDow[dow].activo, hora_inicio: byDow[dow].hora_inicio, hora_fin: byDow[dow].hora_fin };
    }
    const def = DEFAULT_SCHEDULE[dow];
    return { dow, nombre: DIAS[dow], activo: !!def, hora_inicio: def?.start ?? 9, hora_fin: def?.end ?? 20 };
  });

  return json({ schedule });
}

// ── PUT: guardar horario ──────────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { barbero_id, schedule } = await request.json();
  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;

  if (!BARBEROS_CONFIG[bId]) return json({ error: 'Barbero no encontrado' }, 404);
  if (!Array.isArray(schedule) || schedule.length !== 7) return json({ error: 'Formato inválido' }, 400);

  for (const day of schedule) {
    if (day.activo && day.hora_fin <= day.hora_inicio) {
      return json({ error: `${DIAS[day.dow]}: la hora de fin debe ser mayor a la de inicio` }, 400);
    }
  }

  const stmt = env.barberia_db.prepare(
    'INSERT OR REPLACE INTO barbero_horarios (barbero_id, dow, activo, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)'
  );

  await env.barberia_db.batch(
    schedule.map(d => stmt.bind(bId, d.dow, d.activo ? 1 : 0, d.hora_inicio, d.hora_fin))
  );

  return json({ success: true });
}

async function getSession(request, env) {
  const token = getToken(request);
  if (!token) return null;
  return env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
