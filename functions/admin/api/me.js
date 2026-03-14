import { getToken } from './auth.js';

export async function onRequestGet({ request, env }) {
  const token = getToken(request);
  if (!token) return unauthorized();

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();

  if (!session) return unauthorized();

  return new Response(JSON.stringify({ barbero_id: session.barbero_id, role: session.role }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
