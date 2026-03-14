import { getToken } from './auth.js';
import { SERVICIOS } from './_gcal.js';

// GET /admin/api/servicios?barbero=X  → duraciones del barbero (D1 o fallback)
// PUT /admin/api/servicios            → { barbero_id, servicios: [{nombre, duracion_min}] }

export async function onRequestGet({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const url = new URL(request.url);
  const bId = session.role === 'owner' ? (url.searchParams.get('barbero') || session.barbero_id) : session.barbero_id;

  const { results } = await env.barberia_db.prepare(
    'SELECT nombre, duracion_min FROM servicios_config WHERE barbero_id = ?'
  ).bind(bId).all();

  const dbMap = {};
  for (const r of results) dbMap[r.nombre] = r.duracion_min;

  const servicios = Object.entries(SERVICIOS).map(([nombre, duracion]) => ({
    nombre,
    duracion_min: dbMap[nombre] ?? duracion,
  }));

  return json({ servicios });
}

export async function onRequestPut({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const { barbero_id, servicios } = await request.json();
  // owner puede editar cualquier barbero; barbero solo el suyo
  const bId = session.role === 'owner' ? (barbero_id || session.barbero_id) : session.barbero_id;

  if (!Array.isArray(servicios) || !servicios.length) return json({ error: 'Faltan servicios' }, 400);

  for (const s of servicios) {
    if (!s.nombre) return json({ error: 'Nombre inválido' }, 400);
    if (!Number.isInteger(s.duracion_min) || s.duracion_min < 15 || s.duracion_min % 15 !== 0) {
      return json({ error: `Duración inválida para "${s.nombre}": debe ser múltiplo de 15 y mínimo 15 min` }, 400);
    }
  }

  const stmts = servicios.map(s =>
    env.barberia_db.prepare(
      'INSERT OR REPLACE INTO servicios_config (barbero_id, nombre, duracion_min) VALUES (?, ?, ?)'
    ).bind(bId, s.nombre, s.duracion_min)
  );
  await env.barberia_db.batch(stmts);

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
