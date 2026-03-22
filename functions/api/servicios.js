import { SERVICIOS } from '../admin/api/_gcal.js';

// GET /api/servicios?barbero_id=X → servicios con duracion y precio para el cliente

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const bId = url.searchParams.get('barbero_id');

  if (!bId) return json([]);

  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT nombre, duracion_min, precio_ars FROM servicios_config WHERE barbero_id = ?'
    ).bind(bId).all();

    const dbMap = {};
    for (const r of results) dbMap[r.nombre] = r;

    const servicios = Object.entries(SERVICIOS).map(([nombre, dur]) => ({
      nombre,
      duracion_min: dbMap[nombre]?.duracion_min ?? dur,
      precio_ars:   dbMap[nombre]?.precio_ars ?? null,
    }));

    return json(servicios);
  } catch {
    return json(Object.entries(SERVICIOS).map(([nombre, dur]) => ({
      nombre,
      duracion_min: dur,
      precio_ars:   null,
    })));
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
}
