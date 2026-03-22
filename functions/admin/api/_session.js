import { getToken } from './auth.js';

// Verifica sesión y renueva el TTL en background (best-effort, no bloquea).
// Devuelve { barbero_id, role } o null si no hay sesión válida.
export async function getSession(request, env) {
  const token = getToken(request);
  if (!token) return null;

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();

  if (session) {
    // Refresh: extiende la sesión 24h desde el último uso (fire-and-forget)
    env.barberia_db.prepare(
      "UPDATE admin_sessions SET expires_at = datetime('now', '+1 day') WHERE token = ?"
    ).bind(token).run().catch(() => {});
  }

  return session;
}
