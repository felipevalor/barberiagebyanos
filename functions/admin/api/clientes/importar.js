// POST /admin/api/clientes/importar
// Body: { csv: "nombre;celular\n..." }
// Upsert: si el teléfono ya existe → actualiza nombre. Si no → crea nuevo.

import { getToken } from '../auth.js';
import { normalizeTel } from '../_gcal.js';

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);
  if (session.role !== 'owner') return json({ error: 'Solo el owner puede importar' }, 403);

  const { csv } = await request.json();
  if (!csv?.trim()) return json({ error: 'Sin datos' }, 400);

  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  let created = 0, updated = 0, errors = 0;
  const now = new Date().toISOString();

  for (const line of lines) {
    // Saltar encabezados
    if (/^nombre[;,]/i.test(line) || /^name[;,]/i.test(line)) continue;

    const sep   = line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
    const nombre = parts[0];
    const tel    = normalizeTel(parts[1]) || null;

    if (!nombre) { errors++; continue; }

    try {
      if (tel) {
        const existing = await env.barberia_db.prepare(
          'SELECT id FROM clientes WHERE telefono = ?'
        ).bind(tel).first();

        if (existing) {
          await env.barberia_db.prepare(
            'UPDATE clientes SET nombre = ?, updated_at = ? WHERE id = ?'
          ).bind(nombre, now, existing.id).run();
          updated++;
        } else {
          await env.barberia_db.prepare(
            'INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)'
          ).bind(nombre, tel, now, now).run();
          created++;
        }
      } else {
        await env.barberia_db.prepare(
          'INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at) VALUES (?, NULL, NULL, ?, ?)'
        ).bind(nombre, now, now).run();
        created++;
      }
    } catch { errors++; }
  }

  return json({ ok: true, created, updated, errors });
}

async function getSession(request, env) {
  const token = getToken(request);
  if (!token) return null;
  return env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
