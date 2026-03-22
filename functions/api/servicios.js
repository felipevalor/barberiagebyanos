import { SERVICIOS } from '../admin/api/_gcal.js';

// GET /api/servicios?barbero_id=X → servicios con duracion (por barbero) y precio (del catálogo)

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const bId = url.searchParams.get('barbero_id');

  if (!bId) return json([]);

  try {
    const [scRes, catRes] = await Promise.all([
      env.barberia_db.prepare('SELECT nombre, duracion_min FROM servicios_config WHERE barbero_id = ?').bind(bId).all(),
      env.barberia_db.prepare('SELECT nombre, precio_ars FROM catalogo WHERE activo = 1').all(),
    ]);

    const durMap = {};
    for (const r of scRes.results) durMap[r.nombre] = r.duracion_min;

    const precioMap = {};
    for (const r of catRes.results) precioMap[r.nombre] = r.precio_ars;

    const servicios = Object.entries(SERVICIOS).map(([nombre, dur]) => ({
      nombre,
      duracion_min: durMap[nombre] ?? dur,
      precio_ars:   precioMap[nombre] ?? null,
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
