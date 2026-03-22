// GET /api/promos → promos activas para la landing

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT id, nombre, precio_ars, unidad, nota, badge FROM promos WHERE activo = 1 ORDER BY orden ASC'
    ).all();
    return json(results);
  } catch {
    return json([]);
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
  });
}
