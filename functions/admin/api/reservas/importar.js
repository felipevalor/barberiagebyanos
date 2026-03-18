// POST /admin/api/reservas/importar  (owner only)
// Body: { csv: "fecha;barbero;servicio;nombre;telefono\n..." }
// Importa historial de cortes en la tabla reservas con source='import'.
// Si se vuelve a importar el mismo rango de fechas, borra los imports previos primero.

import { getToken } from '../auth.js';
import { normalizeTel } from '../_gcal.js';

export async function onRequestPost({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);
  const session = await env.barberia_db.prepare(
    "SELECT role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'No autorizado' }, 401);
  if (session.role !== 'owner') return json({ error: 'Solo el owner puede importar historial' }, 403);

  const { csv } = await request.json();
  if (!csv?.trim()) return json({ error: 'Sin datos' }, 400);

  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  const rows = [];
  let skipped = 0, errors = 0;
  const now = new Date().toISOString();

  for (const line of lines) {
    // Saltar encabezado
    if (/^fecha[;,]/i.test(line)) continue;

    const sep   = line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));

    const fechaRaw = parts[0];
    const fecha    = parseFecha(fechaRaw);
    if (!fecha) { errors++; continue; }

    const barbero  = parts[1]?.trim();
    if (!barbero)  { errors++; continue; }

    const servicio = parts[2]?.trim() || 'Corte';
    const nombre   = parts[3]?.trim() || '';
    const telefono = normalizeTel(parts[4]) || '';

    rows.push({ fecha, barbero, servicio, nombre, telefono, now });
  }

  if (!rows.length) return json({ error: 'No se encontraron filas válidas', errors }, 400);

  // Detectar rango de fechas del CSV para limpiar imports previos del mismo período
  const fechas = rows.map(r => toDateObj(r.fecha)).filter(Boolean).sort((a, b) => a - b);
  const fechaMin = toFecha(fechas[0]);
  const fechaMax = toFecha(fechas[fechas.length - 1]);

  // Borrar imports previos del mismo rango (re-import seguro)
  const { results: existentes } = await env.barberia_db.prepare(
    "SELECT fecha FROM reservas WHERE source = 'import' LIMIT 1"
  ).all();

  if (existentes.length > 0) {
    // Detectar si hay overlap entre el rango importado y los existentes
    // Borrar por fecha exacta para no afectar otros rangos
    const fechasSet = [...new Set(rows.map(r => r.fecha))];
    const ph = fechasSet.map(() => '?').join(',');
    await env.barberia_db.prepare(
      `DELETE FROM reservas WHERE source = 'import' AND fecha IN (${ph})`
    ).bind(...fechasSet).run();
  }

  // Insertar en batches de 50
  let created = 0;
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const stmts = chunk.map(r =>
      env.barberia_db.prepare(
        `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 'import', ?)`
      ).bind(r.nombre, r.telefono, r.servicio, r.barbero, r.fecha, `${r.fecha} 00:00`, r.now)
    );
    try {
      await env.barberia_db.batch(stmts);
      created += chunk.length;
    } catch (e) {
      console.error('Import batch error:', e);
      errors += chunk.length;
    }
  }

  return json({ ok: true, created, skipped, errors, rango: { desde: fechaMin, hasta: fechaMax } });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseFecha(raw) {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  // ISO: 2025-03-14
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    if (!validDate(d, m, y)) return null;
    return `${d}/${m}/${y}`;
  }
  // DD/MM/YYYY o D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    if (!validDate(d, m, y)) return null;
    return `${d}/${m}/${y}`;
  }
  return null;
}

function validDate(d, m, y) {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return false;
  return true;
}

function toDateObj(fecha) {
  // fecha = "D/M/YYYY"
  const parts = fecha.split('/').map(Number);
  if (parts.length !== 3) return null;
  return new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
}

function toFecha(d) {
  if (!d) return '';
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
