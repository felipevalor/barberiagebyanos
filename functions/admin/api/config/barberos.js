// GET    /admin/api/config/barberos       → listar todos (con campo rol)
// POST   /admin/api/config/barberos       → crear barbero (siempre rol=barbero)
// PUT    /admin/api/config/barberos       → editar barbero, protege entradas owner
// DELETE /admin/api/config/barberos?id=X → eliminar barbero, protege entradas owner

import { getToken } from '../auth.js';

async function requireOwner(request, env) {
  const token = getToken(request);
  if (!token) return null;
  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session || session.role !== 'owner') return null;
  return session;
}

export async function onRequestGet({ request, env }) {
  if (!await requireOwner(request, env)) return json({ error: 'No autorizado' }, 401);

  const { results } = await env.barberia_db.prepare(
    'SELECT id, nombre, tel, calendar_id, activo, orden, rol FROM barberos_config ORDER BY orden ASC'
  ).all();

  return json({ barberos: results });
}

export async function onRequestPost({ request, env }) {
  if (!await requireOwner(request, env)) return json({ error: 'No autorizado' }, 401);

  const { id, nombre, tel, calendar_id, activo = 1, orden = 0 } = await request.json();
  if (!id?.trim() || !nombre?.trim()) return json({ error: 'id y nombre son obligatorios' }, 400);

  try {
    // rol siempre 'barbero' — owners no pueden crear otros owners desde la UI
    await env.barberia_db.prepare(
      'INSERT INTO barberos_config (id, nombre, tel, calendar_id, activo, orden, rol, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id.trim(), nombre.trim(), tel || null, calendar_id || null, activo ? 1 : 0, orden, 'barbero', new Date().toISOString()).run();
  } catch (e) {
    if (e?.message?.includes('UNIQUE')) return json({ error: `Ya existe un barbero con id "${id}"` }, 409);
    return json({ error: 'Error interno' }, 500);
  }

  return json({ ok: true });
}

export async function onRequestPut({ request, env }) {
  if (!await requireOwner(request, env)) return json({ error: 'No autorizado' }, 401);

  const { id, nombre, tel, calendar_id, activo, orden } = await request.json();
  // nota: campo 'rol' se ignora intencionalmente — no es editable desde la UI
  if (!id) return json({ error: 'Falta id' }, 400);
  if (!nombre?.trim()) return json({ error: 'Falta nombre' }, 400);

  // Proteger entradas con rol = 'owner' — no se pueden modificar
  try {
    const target = await env.barberia_db.prepare(
      'SELECT rol FROM barberos_config WHERE id = ?'
    ).bind(id).first();

    if (!target) return json({ error: `Barbero "${id}" no encontrado` }, 404);
    if (target.rol === 'owner') return json({ error: 'No se puede modificar un administrador' }, 403);

    await env.barberia_db.prepare(
      'UPDATE barberos_config SET nombre = ?, tel = ?, calendar_id = ?, activo = ?, orden = ? WHERE id = ?'
    ).bind(nombre.trim(), tel || null, calendar_id || null, activo ? 1 : 0, orden ?? 0, id).run();
  } catch (e) {
    if (e?.message?.includes('403')) throw e;
    return json({ error: 'Error interno' }, 500);
  }

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!await requireOwner(request, env)) return json({ error: 'No autorizado' }, 401);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Falta id' }, 400);

  try {
    const target = await env.barberia_db.prepare(
      'SELECT rol FROM barberos_config WHERE id = ?'
    ).bind(id).first();

    if (!target) return json({ error: `Barbero "${id}" no encontrado` }, 404);
    if (target.rol === 'owner') return json({ error: 'No se puede eliminar un administrador' }, 403);

    await env.barberia_db.prepare('DELETE FROM barberos_config WHERE id = ?').bind(id).run();
  } catch {
    return json({ error: 'Error interno' }, 500);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
