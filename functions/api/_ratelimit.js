/**
 * Rate limiting simple basado en D1.
 * Máximo de requests por IP y endpoint en una ventana de tiempo.
 *
 * @param {Request} request
 * @param {Object} env - Cloudflare env con binding barberia_db
 * @param {string} endpoint - Identificador del endpoint (ej: 'reserva-post')
 * @param {number} maxRequests - Máximo de requests permitidos en la ventana
 * @param {number} windowSeconds - Duración de la ventana en segundos
 * @returns {Promise<boolean>} true si debe bloquearse, false si pasa
 */
export async function isRateLimited(request, env, endpoint, maxRequests = 10, windowSeconds = 60) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const now = new Date();
    const row = await env.barberia_db.prepare(
      'SELECT count, reset_at FROM api_rate_limits WHERE ip = ? AND endpoint = ?'
    ).bind(ip, endpoint).first();

    if (row) {
      if (new Date(row.reset_at) <= now) {
        await env.barberia_db.prepare(
          'DELETE FROM api_rate_limits WHERE ip = ? AND endpoint = ?'
        ).bind(ip, endpoint).run();
      } else if (row.count >= maxRequests) {
        return true;
      }
    }

    const resetAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();
    await env.barberia_db.prepare(`
      INSERT INTO api_rate_limits (ip, endpoint, count, reset_at) VALUES (?, ?, 1, ?)
      ON CONFLICT(ip, endpoint) DO UPDATE SET count = count + 1
    `).bind(ip, endpoint, resetAt).run();

    return false;
  } catch {
    return false;
  }
}
