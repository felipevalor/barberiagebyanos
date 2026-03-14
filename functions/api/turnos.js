// GET /api/turnos?barbero=Gebyano&fecha=15/3/2026
// Devuelve los slots ocupados en D1 para un barbero/fecha dado.
// Usado por el frontend para marcar slots como busy cuando calendarId es null.

const SERVICIOS_DUR = {
  'Corte': 30, 'Corte + Barba': 45, 'Barba': 15,
  'Afeitado': 15, 'Niños 10-13 años': 30, 'Niños 0-9 años': 30,
};

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const barbero = url.searchParams.get('barbero')?.trim();
  const fecha   = url.searchParams.get('fecha')?.trim();

  if (!barbero || !fecha) return json({ occupied: [] });

  const { results } = await env.barberia_db.prepare(
    'SELECT mensaje, servicio FROM reservas WHERE barbero = ? AND fecha = ?'
  ).bind(barbero, fecha).all();

  const occupied = results
    .map(r => ({ hora: r.mensaje?.split(' ')[1], duracion: SERVICIOS_DUR[r.servicio] || 30 }))
    .filter(r => r.hora);

  return json({ occupied });
}

function json(data) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
