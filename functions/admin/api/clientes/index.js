// GET    /admin/api/clientes?q=X&limit=N  → lista / autocomplete
// POST   /admin/api/clientes              → crear cliente
// PUT    /admin/api/clientes              → editar cliente
// DELETE /admin/api/clientes              → eliminar cliente

import { getSession } from '../_session.js';
import { normalizeTel } from '../_gcal.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const url   = new URL(request.url);
  const q     = url.searchParams.get('q')?.trim() || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '500'), 500);

  // Barberos solo ven sus propios clientes (quienes reservaron con ellos)
  const isBarber = session.role !== 'owner';
  let barberoNombre = null;
  if (isBarber) {
    const cfg = await env.barberia_db.prepare(
      'SELECT nombre FROM barberos_config WHERE id = ?'
    ).bind(session.barbero_id).first();
    barberoNombre = cfg?.nombre || null;
  }

  let results;
  if (isBarber && barberoNombre) {
    const subquery = `SELECT DISTINCT telefono FROM reservas WHERE barbero = ? AND telefono IS NOT NULL AND telefono != ''`;
    if (q.length >= 1) {
      const like = `%${q}%`;
      ({ results } = await env.barberia_db.prepare(
        `SELECT id, nombre, telefono, notas FROM clientes
         WHERE telefono IN (${subquery})
           AND (LOWER(nombre) LIKE LOWER(?) OR telefono LIKE ?)
         ORDER BY LOWER(nombre) ASC LIMIT ?`
      ).bind(barberoNombre, like, like, limit).all());
    } else {
      ({ results } = await env.barberia_db.prepare(
        `SELECT id, nombre, telefono, notas FROM clientes
         WHERE telefono IN (${subquery})
         ORDER BY LOWER(nombre) ASC LIMIT ?`
      ).bind(barberoNombre, limit).all());
    }
  } else {
    if (q.length >= 1) {
      const like = `%${q}%`;
      ({ results } = await env.barberia_db.prepare(
        `SELECT id, nombre, telefono, notas
         FROM clientes
         WHERE LOWER(nombre) LIKE LOWER(?) OR telefono LIKE ?
         ORDER BY LOWER(nombre) ASC LIMIT ?`
      ).bind(like, like, limit).all());
    } else {
      ({ results } = await env.barberia_db.prepare(
        `SELECT id, nombre, telefono, notas
         FROM clientes
         ORDER BY LOWER(nombre) ASC LIMIT ?`
      ).bind(limit).all());
    }
  }

  return json({ clientes: results, scope: isBarber ? 'barber' : 'all' });
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { nombre, telefono, notas } = await request.json();
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);

  const now = new Date().toISOString();
  try {
    const result = await env.barberia_db.prepare(
      'INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(nombre.trim(), normalizeTel(telefono) || null, notas?.trim() || null, now, now).run();
    return json({ ok: true, id: result.meta?.last_row_id });
  } catch (e) {
    return json({ error: 'Error al crear cliente' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id, nombre, telefono, notas } = await request.json();
  if (!id)             return json({ error: 'Falta id' }, 400);
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);

  await env.barberia_db.prepare(
    'UPDATE clientes SET nombre = ?, telefono = ?, notas = ?, updated_at = ? WHERE id = ?'
  ).bind(nombre.trim(), normalizeTel(telefono) || null, notas?.trim() || null, new Date().toISOString(), id).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id } = await request.json();
  if (!id) return json({ error: 'Falta id' }, 400);

  await env.barberia_db.prepare('DELETE FROM clientes WHERE id = ?').bind(id).run();
  return json({ ok: true });
}


function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
