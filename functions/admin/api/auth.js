const COOKIE = 'admin_token';
const MAX_AGE = 60 * 60 * 24; // 24 horas

function isSecure(request) {
  const host = new URL(request.url).hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}

function setCookie(token, request) {
  const secure = isSecure(request) ? ' Secure;' : '';
  return `${COOKIE}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/admin; Max-Age=${MAX_AGE}`;
}

function clearCookie(request) {
  const secure = isSecure(request) ? ' Secure;' : '';
  return `${COOKIE}=; HttpOnly;${secure} SameSite=Strict; Path=/admin; Max-Age=0`;
}

export async function onRequestPost({ request, env }) {
  const { barbero_id, password } = await request.json();

  const passwords = JSON.parse(env.ADMIN_PASSWORDS || '{}');
  if (!passwords[barbero_id] || passwords[barbero_id] !== password) {
    return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const role  = barbero_id === 'gebyano' ? 'owner' : 'barbero';
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000).toISOString();

  await env.barberia_db.prepare(
    'INSERT INTO admin_sessions (token, barbero_id, role, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, barbero_id, role, expiresAt).run();

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
