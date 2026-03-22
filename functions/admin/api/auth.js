const COOKIE  = 'admin_token';
const MAX_AGE = 60 * 60 * 24; // 24 horas

// Rate limiting: máx intentos fallidos antes de bloquear temporalmente
const MAX_FAILS    = 5;
const BLOCK_MS     = 15 * 60 * 1000; // 15 minutos

function isSecure(request) {
  const host = new URL(request.url).hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}

function setCookie(token, request) {
  const secure = isSecure(request) ? ' Secure;' : '';
  return `${COOKIE}=${token}; HttpOnly;${secure} SameSite=Lax; Path=/admin; Max-Age=${MAX_AGE}`;
}

function clearCookie(request) {
  const secure = isSecure(request) ? ' Secure;' : '';
  return `${COOKIE}=; HttpOnly;${secure} SameSite=Lax; Path=/admin; Max-Age=0`;
}

// Hashea texto plano con SHA-256; devuelve hex string.
// Los passwords en ADMIN_PASSWORDS deben estar en este formato:
//   sha256("mipassword") → guardado como hex
async function sha256(text) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Devuelve la IP del request (header CF real, fallback a socket)
function getIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

// Verifica si la IP está bloqueada; devuelve true si debe rechazarse.
// Efecto secundario: elimina registros expirados de la misma IP.
async function isRateLimited(ip, env) {
  try {
    const row = await env.barberia_db.prepare(
      'SELECT count, reset_at FROM login_attempts WHERE ip = ?'
    ).bind(ip).first();

    if (!row) return false;

    // Si el bloqueo expiró, limpiar y dejar pasar
    if (new Date(row.reset_at) <= new Date()) {
      await env.barberia_db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
      return false;
    }

    return row.count >= MAX_FAILS;
  } catch {
    return false; // si falla la tabla, no bloquear
  }
}

// Registra un intento fallido. Crea o incrementa el contador.
async function recordFailedAttempt(ip, env) {
  try {
    const resetAt = new Date(Date.now() + BLOCK_MS).toISOString();
    await env.barberia_db.prepare(`
      INSERT INTO login_attempts (ip, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(ip) DO UPDATE SET count = count + 1, reset_at = excluded.reset_at
    `).bind(ip, resetAt).run();
  } catch { /* no bloquea el flujo */ }
}

// Limpia intentos fallidos tras login exitoso
async function clearFailedAttempts(ip, env) {
  try {
    await env.barberia_db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
  } catch {}
}

export async function onRequestPost({ request, env }) {
  // ── CSRF: verificar que el Origin sea del mismo sitio ───────────────────────
  if (isSecure(request)) {
    const origin = request.headers.get('Origin');
    const host   = new URL(request.url).host;
    if (origin && new URL(origin).host !== host) {
      return json({ error: 'Origen no permitido' }, 403);
    }
  }

  const ip = getIP(request);

  // ── Rate limiting ────────────────────────────────────────────────────────────
  if (await isRateLimited(ip, env)) {
    return json({ error: 'Demasiados intentos. Intentá en 15 minutos.' }, 429);
  }

  const { barbero_id, password } = await request.json();

  // ── Verificación de contraseña (SHA-256) ─────────────────────────────────────
  // ADMIN_PASSWORDS puede tener hashes o texto plano (compatibilidad).
  // Para migrar: cambiar el secret a { "id": "sha256hex(password)" }
  const passwords = JSON.parse(env.ADMIN_PASSWORDS || '{}');
  const stored    = passwords[barbero_id];

  if (!stored) {
    await recordFailedAttempt(ip, env);
    return json({ error: 'Credenciales inválidas' }, 401);
  }

  // Si el valor almacenado es un hex SHA-256 (64 chars), comparar con hash del input.
  // Si no (plaintext legacy), comparar directo.
  const isHashed       = /^[0-9a-f]{64}$/.test(stored);
  const inputToCompare = isHashed ? await sha256(password) : password;

  if (stored !== inputToCompare) {
    await recordFailedAttempt(ip, env);
    return json({ error: 'Credenciales inválidas' }, 401);
  }

  // ── Login exitoso ────────────────────────────────────────────────────────────
  await clearFailedAttempts(ip, env);

  const barberoRow = await env.barberia_db.prepare(
    'SELECT rol FROM barberos_config WHERE id = ?'
  ).bind(barbero_id).first();
  const role    = barberoRow?.rol || 'barbero';
  const token   = crypto.randomUUID();
  const expires = new Date(Date.now() + MAX_AGE * 1000).toISOString();

  await env.barberia_db.prepare(
    'INSERT INTO admin_sessions (token, barbero_id, role, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, barbero_id, role, expires).run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie(token, request),
    },
  });
}

export async function onRequestDelete({ request, env }) {
  const token = getToken(request);
  if (token) {
    await env.barberia_db.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run();
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookie(request),
    },
  });
}

export function getToken(request) {
  return request.headers.get('Cookie')?.match(/admin_token=([^;]+)/)?.[1] ?? null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
