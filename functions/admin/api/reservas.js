import { getToken } from './auth.js';

export async function onRequestGet({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();

  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const url    = new URL(request.url);
  const fecha  = url.searchParams.get('fecha');     // "13/3/2026"
  const filtro = url.searchParams.get('barbero');   // opcional, solo para owner

  if (!fecha) return json({ error: 'Falta fecha' }, 400);

  let stmt;
  const pattern = `${fecha} %`;

  if (session.role === 'owner') {
    if (filtro && filtro !== 'todos') {
      const nombre = filtro.charAt(0).toUpperCase() + filtro.slice(1);
      stmt = env.barberia_db.prepare(
        'SELECT * FROM reservas WHERE mensaje LIKE ? AND barbero = ? ORDER BY mensaje ASC'
      ).bind(pattern, nombre);
    } else {
      stmt = env.barberia_db.prepare(
        'SELECT * FROM reservas WHERE mensaje LIKE ? ORDER BY mensaje ASC'
      ).bind(pattern);
    }
  } else {
    const nombre = session.barbero_id.charAt(0).toUpperCase() + session.barbero_id.slice(1);
    stmt = env.barberia_db.prepare(
      'SELECT * FROM reservas WHERE mensaje LIKE ? AND barbero = ? ORDER BY mensaje ASC'
    ).bind(pattern, nombre);
  }

  const { results } = await stmt.all();

  return json({ reservas: results, role: session.role, barbero_id: session.barbero_id });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
