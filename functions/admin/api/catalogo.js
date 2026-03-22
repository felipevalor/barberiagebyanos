import { getToken } from './auth.js';

// GET    /admin/api/catalogo          → lista completa
// POST   /admin/api/catalogo          → { nombre, incluye, precio_ars }
// PUT    /admin/api/catalogo?id=X     → { nombre, incluye, precio_ars, activo }
// DELETE /admin/api/catalogo?id=X

async function getSession(request, env) {
  const token = getToken(request);
  if (!token) return null;
  return env.barberia_db.prepare(
    "SELECT barbero_id FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
}

export async function onRequestGet({ request, env }) {
  if (!await getSession(request, env)) return json({ error: 'No autorizado' }, 401);

  const { results } = await env.barberia_db.prepare(
    'SELECT id, nombre, incluye, precio_ars, activo, orden FROM catalogo ORDER BY orden ASC'
  ).all();

  return json({ items: results });
}

export async function onRequestPost({ request, env }) {
  if (!await getSession(request, env)) return json({ error: 'No autorizado' }, 401);

  const { nombre, incluye, precio_ars } = await request.json();
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (precio_ars != null && (!Number.isInteger(precio_ars) || precio_ars < 0)) {
    return json({ error: 'Precio inválido' }, 400);
  }

  try {
    const { meta } = await env.barberia_db.prepare(
      `INSERT INTO catalogo (nombre, incluye, precio_ars, orden)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(orden)+1, 0) FROM catalogo))`
    ).bind(nombre.trim(), incluye?.trim() ?? '', precio_ars ?? null).run();
    return json({ ok: true, id: meta.last_row_id });
  } catch (e) {
    if (e?.message?.includes('UNIQUE')) return json({ error: `Ya existe un servicio con ese nombre` }, 400);
    throw e;
  }
}

export async function onRequestPut({ request, env }) {
  if (!await getSession(request, env)) return json({ error: 'No autorizado' }, 401);

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'), 10);
  if (!id) return json({ error: 'ID requerido' }, 400);

  const { nombre, incluye, precio_ars, activo } = await request.json();
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (precio_ars != null && (!Number.isInteger(precio_ars) || precio_ars < 0)) {
    return json({ error: 'Precio inválido' }, 400);
  }

  try {
    const { meta } = await env.barberia_db.prepare(
      'UPDATE catalogo SET nombre=?, incluye=?, precio_ars=?, activo=? WHERE id=?'
    ).bind(nombre.trim(), incluye?.trim() ?? '', precio_ars ?? null, activo ? 1 : 0, id).run();
    if (!meta.changes) return json({ error: 'Servicio no encontrado' }, 404);
    return json({ ok: true });
  } catch (e) {
    if (e?.message?.includes('UNIQUE')) return json({ error: 'Ya existe un servicio con ese nombre' }, 400);
    throw e;
  }
}

export async function onRequestDelete({ request, env }) {
  if (!await getSession(request, env)) return json({ error: 'No autorizado' }, 401);

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'), 10);
  if (!id) return json({ error: 'ID requerido' }, 400);

  const { meta } = await env.barberia_db.prepare('DELETE FROM catalogo WHERE id = ?').bind(id).run();
  if (!meta.changes) return json({ error: 'Servicio no encontrado' }, 404);
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
