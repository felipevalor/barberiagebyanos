import { FERIADOS } from '../admin/api/_gcal.js';

// GET /api/feriados?barbero=X  → devuelve array de fechas bloqueadas para el barbero
// Usado por main.js para filtrar días en el selector de fecha

export async function onRequestGet({ request, env }) {
  const url  = new URL(request.url);
  const bId  = url.searchParams.get('barbero');

  if (!bId) return json({ error: 'Falta barbero' }, 400);

  // Obtener overrides: fechas donde trabaja = 1 (trabaja en feriado)
  let overrides = {};
  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT fecha, trabaja FROM feriados_override WHERE barbero_id = ?'
    ).bind(bId).all();
    for (const r of results) overrides[r.fecha] = r.trabaja;
  } catch { /* si falla, usa defaults */ }

  // Fechas bloqueadas = feriados donde trabaja !== 1
  const bloqueadas = [];
  for (const lista of Object.values(FERIADOS)) {
    for (const f of lista) {
      if ((overrides[f.fecha] ?? 0) !== 1) {
        bloqueadas.push(f.fecha);
      }
    }
  }

  return json({ feriados: bloqueadas });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
