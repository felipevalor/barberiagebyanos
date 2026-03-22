// GET /api/catalogo → servicios del catálogo global para la landing

const FALLBACK = [
  { nombre: 'Corte',              incluye: 'Tijera o máquina · Perfilado de cejas · Café o bebida', precio_ars: null },
  { nombre: 'Corte + Barba',      incluye: 'El combo completo · Perfilado de cejas · Café o bebida', precio_ars: null },
  { nombre: 'Barba',              incluye: 'Perfilado y definición · Café o bebida',                  precio_ars: null },
  { nombre: 'Afeitado',           incluye: 'Navaja · Toalla caliente · Café o bebida',                precio_ars: null },
  { nombre: 'Niños (10-13 años)', incluye: 'Perfilado de cejas · Café o bebida',                     precio_ars: null },
  { nombre: 'Niños (0-9 años)',   incluye: 'Perfilado de cejas · Café o bebida',                     precio_ars: null },
];

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT nombre, incluye, precio_ars FROM catalogo WHERE activo = 1 ORDER BY orden ASC'
    ).all();
    return json(results.length ? results : FALLBACK);
  } catch {
    return json(FALLBACK);
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
  });
}
