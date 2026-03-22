import { getSession } from './_session.js';

// GET    /admin/api/promos         → todas las promos
// POST   /admin/api/promos         → crear promo
// PUT    /admin/api/promos?id=X    → editar promo
// DELETE /admin/api/promos?id=X    → eliminar promo


export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { results } = await env.barberia_db.prepare(
    'SELECT id, nombre, precio_ars, unidad, nota, badge, activo, orden FROM promos ORDER BY orden ASC'
  ).all();

  return json({ promos: results });
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { nombre, precio_ars, unidad, nota, badge, activo } = await request.json();
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (precio_ars != null && (!Number.isInteger(precio_ars) || precio_ars < 0)) {
    return json({ error: 'Precio inválido' }, 400);
  }

  const { meta } = await env.barberia_db.prepare(
    `INSERT INTO promos (nombre, precio_ars, unidad, nota, badge, activo, orden)
     VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(orden)+1, 0) FROM promos))`
  ).bind(nombre.trim(), precio_ars ?? null, unidad?.trim() || null, nota?.trim() || null, badge?.trim() || null, activo ? 1 : 1).run();

  return json({ ok: true, id: meta.last_row_id });
}

export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'), 10);
  if (!id) return json({ error: 'ID requerido' }, 400);

  const { nombre, precio_ars, unidad, nota, badge, activo } = await request.json();
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (precio_ars != null && (!Number.isInteger(precio_ars) || precio_ars < 0)) {
    return json({ error: 'Precio inválido' }, 400);
  }

  const { meta } = await env.barberia_db.prepare(
    'UPDATE promos SET nombre=?, precio_ars=?, unidad=?, nota=?, badge=?, activo=? WHERE id=?'
  ).bind(nombre.trim(), precio_ars ?? null, unidad?.trim() || null, nota?.trim() || null, badge?.trim() || null, activo ? 1 : 0, id).run();

  if (!meta.changes) return json({ error: 'Promo no encontrada' }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'), 10);
  if (!id) return json({ error: 'ID requerido' }, 400);

  const { meta } = await env.barberia_db.prepare('DELETE FROM promos WHERE id = ?').bind(id).run();
  if (!meta.changes) return json({ error: 'Promo no encontrada' }, 404);
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
