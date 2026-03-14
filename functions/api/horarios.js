import { DEFAULT_SCHEDULE } from '../admin/api/_gcal.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function onRequestGet({ request, env }) {
  const barbero_id = new URL(request.url).searchParams.get('barbero');
  if (!barbero_id) return res({ error: 'Falta barbero' }, 400);

  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT dow, activo, hora_inicio, hora_fin FROM barbero_horarios WHERE barbero_id = ?'
    ).bind(barbero_id).all();

    if (!results.length) return res(DEFAULT_SCHEDULE);

    const schedule = {};
    for (const row of results) {
      if (row.activo) schedule[row.dow] = { start: row.hora_inicio, end: row.hora_fin };
    }
    return res(schedule);
  } catch {
    return res(DEFAULT_SCHEDULE);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

function res(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
