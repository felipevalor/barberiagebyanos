import { getSession } from './_session.js';
import { BARBEROS_CONFIG, getSchedule } from './_gcal.js';

// GET    /admin/api/recurrentes?barbero=X  → lista con próximo turno sugerido
// POST   /admin/api/recurrentes            → { barbero_id, nombre, servicio, frecuencia_dias, hora_preferida, precio_especial, notas }
// PUT    /admin/api/recurrentes            → { id, ...campos editables }
// DELETE /admin/api/recurrentes            → { id }

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const url = new URL(request.url);
  const bId = session.role === 'owner'
    ? (url.searchParams.get('barbero') || session.barbero_id)
    : session.barbero_id;

  const { results: clientes } = await env.barberia_db.prepare(
    'SELECT * FROM clientes_recurrentes WHERE barbero_id = ? ORDER BY nombre ASC'
  ).bind(bId).all();

  // Último turno de cada cliente en una sola query
  const cfg = BARBEROS_CONFIG[bId];
  const { results: historial } = await env.barberia_db.prepare(
    `SELECT nombre, MAX(fecha) as ultimo_turno FROM reservas WHERE barbero = ? GROUP BY nombre`
  ).bind(cfg?.nombre || '').all();

  const ultimoMap = {};
  for (const h of historial) ultimoMap[h.nombre.toLowerCase()] = h.ultimo_turno;

  const hoy = new Date();
  const schedule = await getSchedule(bId, env);

  const data = clientes.map(c => {
    const ultimo = ultimoMap[c.nombre.toLowerCase()];
    let dt;
    if (ultimo) {
      const [d, m, y] = ultimo.split('/').map(Number);
      dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + c.frecuencia_dias);
      if (dt < hoy) dt = new Date(hoy);
    } else {
      dt = new Date(hoy);
    }
    // Advance to next working day if needed (max 7 iterations to avoid infinite loop)
    for (let i = 0; i < 7 && !schedule[dt.getDay()]; i++) dt.setDate(dt.getDate() + 1);
    return { ...c, ultimo_turno: ultimo || null, proximo_turno: formatFecha(dt) };
  });

  return json({ clientes: data });
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { barbero_id, nombre, servicio, frecuencia_dias, hora_preferida, precio_especial, notas } = await request.json();
  const bId = session.role === 'owner' ? (barbero_id || session.barbero_id) : session.barbero_id;

  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (!servicio)        return json({ error: 'El servicio es obligatorio' }, 400);
  if (!frecuencia_dias || frecuencia_dias < 1) return json({ error: 'Frecuencia inválida' }, 400);

  await env.barberia_db.prepare(
    `INSERT INTO clientes_recurrentes (barbero_id, nombre, servicio, frecuencia_dias, hora_preferida, precio_especial, notas, activo, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).bind(bId, nombre.trim(), servicio, frecuencia_dias, hora_preferida || null, precio_especial || null, notas || null, new Date().toISOString()).run();

  return json({ ok: true });
}

export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id, nombre, servicio, frecuencia_dias, hora_preferida, precio_especial, notas, activo } = await request.json();
  if (!id) return json({ error: 'Falta id' }, 400);

  const cliente = await env.barberia_db.prepare(
    'SELECT barbero_id FROM clientes_recurrentes WHERE id = ?'
  ).bind(id).first();
  if (!cliente) return json({ error: 'Cliente no encontrado' }, 404);
  if (session.role !== 'owner' && cliente.barbero_id !== session.barbero_id) {
    return json({ error: 'Sin permisos' }, 403);
  }

  await env.barberia_db.prepare(
    `UPDATE clientes_recurrentes
     SET nombre=?, servicio=?, frecuencia_dias=?, hora_preferida=?, precio_especial=?, notas=?, activo=?
     WHERE id=?`
  ).bind(
    nombre?.trim(), servicio, frecuencia_dias,
    hora_preferida || null, precio_especial || null, notas || null,
    activo ?? 1, id
  ).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id } = await request.json();
  if (!id) return json({ error: 'Falta id' }, 400);

  const cliente = await env.barberia_db.prepare(
    'SELECT barbero_id FROM clientes_recurrentes WHERE id = ?'
  ).bind(id).first();
  if (!cliente) return json({ error: 'Cliente no encontrado' }, 404);
  if (session.role !== 'owner' && cliente.barbero_id !== session.barbero_id) {
    return json({ error: 'Sin permisos' }, 403);
  }

  await env.barberia_db.prepare('DELETE FROM clientes_recurrentes WHERE id = ?').bind(id).run();
  return json({ ok: true });
}


function formatFecha(d) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
