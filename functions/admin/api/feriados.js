import { getToken } from './auth.js';
import { FERIADOS } from './_gcal.js';

// GET /admin/api/feriados?barbero=X  → lista de feriados con estado trabaja/no trabaja
// PUT /admin/api/feriados             → { barbero_id, fecha, trabaja: 0|1 }

export async function onRequestGet({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const url = new URL(request.url);
  const bId = session.role === 'owner' ? (url.searchParams.get('barbero') || session.barbero_id) : session.barbero_id;

  // Obtener overrides del barbero desde D1
  const { results: overrides } = await env.barberia_db.prepare(
    'SELECT fecha, trabaja FROM feriados_override WHERE barbero_id = ?'
  ).bind(bId).all();

  const overrideMap = {};
  for (const o of overrides) overrideMap[o.fecha] = o.trabaja;

  // Combinar feriados de todos los años configurados
  const feriados = [];
  for (const [year, lista] of Object.entries(FERIADOS)) {
    for (const f of lista) {
      feriados.push({
        fecha:   f.fecha,
        nombre:  f.nombre,
        year:    Number(year),
        trabaja: overrideMap[f.fecha] ?? 0,  // por defecto NO trabaja (1=trabaja, 0=no trabaja)
      });
    }
  }

  return json({ feriados });
}

export async function onRequestPut({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const { barbero_id, fecha, trabaja } = await request.json();
  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;

  if (!bId || !fecha || trabaja === undefined) {
    return json({ error: 'Faltan campos' }, 400);
  }

  if (trabaja === 1) {
    // Guardar override: este barbero trabaja ese feriado
    await env.barberia_db.prepare(
      'INSERT OR REPLACE INTO feriados_override (barbero_id, fecha, trabaja) VALUES (?, ?, 1)'
    ).bind(bId, fecha).run();
  } else {
    // Eliminar override (vuelve al comportamiento default: no trabaja)
    await env.barberia_db.prepare(
      'DELETE FROM feriados_override WHERE barbero_id = ? AND fecha = ?'
    ).bind(bId, fecha).run();
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
