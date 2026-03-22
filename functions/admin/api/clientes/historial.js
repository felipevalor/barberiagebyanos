// GET /admin/api/clientes/historial?id=X → reservas del cliente (por tel o nombre)

import { getSession } from '../_session.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Falta id' }, 400);

  const cliente = await env.barberia_db.prepare(
    'SELECT nombre, telefono FROM clientes WHERE id = ?'
  ).bind(id).first();
  if (!cliente) return json({ error: 'Cliente no encontrado' }, 404);

  let historial = [];

  // Primero por teléfono (más preciso)
  if (cliente.telefono) {
    const { results } = await env.barberia_db.prepare(
      `SELECT servicio, barbero, fecha, mensaje
       FROM reservas WHERE telefono = ?
       ORDER BY mensaje DESC LIMIT 50`
    ).bind(cliente.telefono).all();
    historial = results;
  }

  // Fallback o complemento: por nombre si no hay resultados
  if (!historial.length) {
    const { results } = await env.barberia_db.prepare(
      `SELECT servicio, barbero, fecha, mensaje
       FROM reservas WHERE LOWER(nombre) = LOWER(?)
       ORDER BY mensaje DESC LIMIT 50`
    ).bind(cliente.nombre).all();
    historial = results;
  }

  return json({ historial });
}


function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
