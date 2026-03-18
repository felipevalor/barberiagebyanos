import { getToken } from './auth.js';
import { DEFAULT_SCHEDULE, FERIADOS, SLOT_DURATION } from './_gcal.js';

// Argentina = UTC-3, sin cambio de horario
const ARG_OFFSET_MS = -3 * 60 * 60 * 1000;

export async function onRequestGet({ request, env }) {
  const token = getToken(request);
  if (!token) return json({ error: 'No autorizado' }, 401);

  const session = await env.barberia_db.prepare(
    "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return json({ error: 'Sesión inválida' }, 401);

  const isOwner   = session.role === 'owner';
  const filtroUrl = new URL(request.url).searchParams.get('barbero'); // owner puede filtrar

  // ── Fecha/hora actual en Argentina ────────────────────────────────────────
  const utcNow = new Date();
  // argNow: usamos métodos .getUTC* para leer la hora argentina (offseteado)
  const argNow = new Date(utcNow.getTime() + ARG_OFFSET_MS);

  const todayStr   = toFecha(argNow);
  const argHourMin = argNow.getUTCHours() * 60 + argNow.getUTCMinutes();
  const mesN       = argNow.getUTCMonth() + 1;
  const yearN      = argNow.getUTCFullYear();
  const mesAnt     = mesN === 1 ? 12 : mesN - 1;
  const yearAnt    = mesN === 1 ? yearN - 1 : yearN;
  const todayArgMidnight = Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate());

  const weekDates = getWeekDates(argNow);
  const weekStrs  = weekDates.map(toFecha);

  // ── Barberos activos ───────────────────────────────────────────────────────
  const { results: barberos } = await env.barberia_db.prepare(
    'SELECT id, nombre, tel FROM barberos_config WHERE activo = 1 ORDER BY orden ASC'
  ).all();

  const nombreById = {}, telById = {};
  for (const b of barberos) { nombreById[b.id] = b.nombre; telById[b.id] = b.tel; }

  // ── Scope según rol y filtro ───────────────────────────────────────────────
  let targetIds, targetNombres;
  if (isOwner && filtroUrl && filtroUrl !== 'todos' && nombreById[filtroUrl]) {
    targetIds    = [filtroUrl];
    targetNombres = [nombreById[filtroUrl]];
  } else if (isOwner) {
    targetIds    = barberos.map(b => b.id);
    targetNombres = barberos.map(b => b.nombre);
  } else {
    targetIds    = [session.barbero_id];
    targetNombres = [nombreById[session.barbero_id]].filter(Boolean);
  }

  if (targetNombres.length === 0) return json({ error: 'Sin barberos activos' }, 400);

  const showPorBarbero = isOwner && (!filtroUrl || filtroUrl === 'todos');

  // ── Preparar queries ───────────────────────────────────────────────────────
  const mesLike    = `%/${mesN}/${yearN}`;
  const mesAntLike = `%/${mesAnt}/${yearAnt}`;
  const todayLike  = `${todayStr} %`;
  const wPh  = weekStrs.map(() => '?').join(',');
  const nPh  = targetNombres.map(() => '?').join(',');
  const idPh = targetIds.map(() => '?').join(',');

  const multiN = targetNombres.length > 1;

  const hoyQ = env.barberia_db.prepare(
    multiN
      ? `SELECT nombre, servicio, barbero, mensaje FROM reservas WHERE mensaje LIKE ? AND barbero IN (${nPh}) ORDER BY mensaje ASC`
      : `SELECT nombre, servicio, barbero, mensaje FROM reservas WHERE mensaje LIKE ? AND barbero = ? ORDER BY mensaje ASC`
  ).bind(todayLike, ...targetNombres);

  const semQ = env.barberia_db.prepare(
    multiN
      ? `SELECT fecha, barbero FROM reservas WHERE fecha IN (${wPh}) AND barbero IN (${nPh})`
      : `SELECT fecha, barbero FROM reservas WHERE fecha IN (${wPh}) AND barbero = ?`
  ).bind(...weekStrs, ...targetNombres);

  const mesQ = env.barberia_db.prepare(
    multiN
      ? `SELECT fecha, barbero, servicio FROM reservas WHERE fecha LIKE ? AND barbero IN (${nPh})`
      : `SELECT fecha, barbero, servicio FROM reservas WHERE fecha LIKE ? AND barbero = ?`
  ).bind(mesLike, ...targetNombres);

  const mesAntQ = env.barberia_db.prepare(
    multiN
      ? `SELECT COUNT(*) as cnt FROM reservas WHERE fecha LIKE ? AND barbero IN (${nPh})`
      : `SELECT COUNT(*) as cnt FROM reservas WHERE fecha LIKE ? AND barbero = ?`
  ).bind(mesAntLike, ...targetNombres);

  const anioAntLike = `%/${mesN}/${yearN - 1}`;
  const anioAntQ = env.barberia_db.prepare(
    multiN
      ? `SELECT COUNT(*) as cnt FROM reservas WHERE fecha LIKE ? AND barbero IN (${nPh}) AND source = 'import'`
      : `SELECT COUNT(*) as cnt FROM reservas WHERE fecha LIKE ? AND barbero = ? AND source = 'import'`
  ).bind(anioAntLike, ...targetNombres);

  const horariosQ = env.barberia_db.prepare(
    `SELECT barbero_id, dow, activo, hora_inicio, hora_fin FROM barbero_horarios WHERE barbero_id IN (${idPh})`
  ).bind(...targetIds);

  // Último turno por cliente recurrente: usa MAX(id) como proxy de reserva más reciente
  const recQ = multiN
    ? env.barberia_db.prepare(
        `SELECT cr.id, cr.nombre, cr.barbero_id, cr.servicio, cr.frecuencia_dias,
           (SELECT r.fecha FROM reservas r
            INNER JOIN barberos_config bc ON bc.id = cr.barbero_id
            WHERE LOWER(r.nombre) = LOWER(cr.nombre) AND r.barbero = bc.nombre
            ORDER BY r.id DESC LIMIT 1) as ultimo_turno
         FROM clientes_recurrentes cr WHERE cr.activo = 1`
      )
    : env.barberia_db.prepare(
        `SELECT cr.id, cr.nombre, cr.barbero_id, cr.servicio, cr.frecuencia_dias,
           (SELECT r.fecha FROM reservas r
            WHERE LOWER(r.nombre) = LOWER(cr.nombre) AND r.barbero = ?
            ORDER BY r.id DESC LIMIT 1) as ultimo_turno
         FROM clientes_recurrentes cr WHERE cr.activo = 1 AND cr.barbero_id = ?`
      ).bind(targetNombres[0], targetIds[0]);

  // ── Batch execution ────────────────────────────────────────────────────────
  const [
    { results: rHoy },
    { results: rSem },
    { results: rMes },
    { results: mesAntRows },
    { results: anioAntRows },
    { results: horarios },
    { results: recurrentes },
  ] = await env.barberia_db.batch([hoyQ, semQ, mesQ, mesAntQ, anioAntQ, horariosQ, recQ]);

  const mesAntCount  = mesAntRows?.[0]?.cnt ?? 0;
  const anioAntCount = anioAntRows?.[0]?.cnt ?? 0;

  // ── Schedule map ───────────────────────────────────────────────────────────
  const schedMap = {};
  for (const id of targetIds) schedMap[id] = { ...DEFAULT_SCHEDULE };
  for (const row of horarios) {
    if (!schedMap[row.barbero_id]) schedMap[row.barbero_id] = {};
    if (row.activo) schedMap[row.barbero_id][row.dow] = { start: row.hora_inicio, end: row.hora_fin };
    else delete schedMap[row.barbero_id][row.dow];
  }

  function slotsForDate(dateUTC, bIds) {
    const dow = dateUTC.getUTCDay();
    if (dow === 0) return 0; // domingo
    const fStr = toFecha(dateUTC);
    if ((FERIADOS[dateUTC.getUTCFullYear()] || []).some(f => f.fecha === fStr)) return 0;
    return bIds.reduce((sum, id) => {
      const sc = schedMap[id]?.[dow];
      return sc ? sum + (sc.end - sc.start) * (60 / SLOT_DURATION) : sum;
    }, 0);
  }

  // ── Semana ─────────────────────────────────────────────────────────────────
  let slotsSem = 0;
  const porDia = weekDates.map(d => {
    const fStr = toFecha(d);
    const cnt   = rSem.filter(r => r.fecha === fStr).length;
    const slots = slotsForDate(d, targetIds);
    slotsSem += slots;
    return {
      fecha: fStr,
      dow:   ['dom','lun','mar','mié','jue','vie','sáb'][d.getUTCDay()],
      count: cnt,
      slots,
      esHoy: fStr === todayStr,
    };
  });

  // ── Mes ────────────────────────────────────────────────────────────────────
  const daysInMes = new Date(Date.UTC(yearN, mesN, 0)).getUTCDate();
  let slotsMes = 0;
  for (let d = 1; d <= daysInMes; d++) {
    slotsMes += slotsForDate(new Date(Date.UTC(yearN, mesN - 1, d)), targetIds);
  }

  // ── Top servicios ──────────────────────────────────────────────────────────
  const svcMap = {};
  for (const r of rMes) if (r.servicio) svcMap[r.servicio] = (svcMap[r.servicio] || 0) + 1;
  const topServicios = Object.entries(svcMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, count]) => ({
      nombre,
      count,
      pct: rMes.length ? Math.round(count / rMes.length * 100) : 0,
    }));

  // ── Recurrentes en riesgo ──────────────────────────────────────────────────
  const riesgo = recurrentes
    .filter(c => {
      if (!c.ultimo_turno) return false;
      const [d, m, y] = c.ultimo_turno.split('/').map(Number);
      return Date.UTC(y, m - 1, d) + c.frecuencia_dias * 86400000 < todayArgMidnight;
    })
    .map(c => {
      const [d, m, y] = c.ultimo_turno.split('/').map(Number);
      const diasRetraso = Math.floor(
        (todayArgMidnight - Date.UTC(y, m - 1, d) - c.frecuencia_dias * 86400000) / 86400000
      );
      return {
        id:             c.id,
        nombre:         c.nombre,
        barbero_id:     c.barbero_id,
        servicio:       c.servicio,
        frecuencia_dias: c.frecuencia_dias,
        ultimo_turno:   c.ultimo_turno,
        dias_retraso:   diasRetraso,
        barbero_tel:    telById[c.barbero_id] || null,
      };
    })
    .filter(c => c.dias_retraso > 0)
    .sort((a, b) => b.dias_retraso - a.dias_retraso)
    .slice(0, 10);

  // ── Turnos de hoy ──────────────────────────────────────────────────────────
  const turnos = rHoy.map(r => {
    const hora = r.mensaje?.split(' ')[1] || '00:00';
    const [h, min] = hora.split(':').map(Number);
    return {
      hora,
      nombre:  r.nombre,
      servicio: r.servicio,
      barbero: r.barbero,
      pasado:  h * 60 + min < argHourMin,
    };
  });

  // ── Por barbero (owner, vista "todos") ─────────────────────────────────────
  let porBarbero = null;
  if (showPorBarbero) {
    porBarbero = barberos.map(b => {
      let bSlotsMes = 0;
      for (let d = 1; d <= daysInMes; d++) {
        bSlotsMes += slotsForDate(new Date(Date.UTC(yearN, mesN - 1, d)), [b.id]);
      }
      const bMesCnt = rMes.filter(r => r.barbero === b.nombre).length;
      const bSemCnt = rSem.filter(r => r.barbero === b.nombre).length;
      return {
        barbero_id:  b.id,
        nombre:      b.nombre,
        mes_count:   bMesCnt,
        semana_count: bSemCnt,
        pct_mes:     bSlotsMes > 0 ? Math.round(bMesCnt / bSlotsMes * 100) : 0,
      };
    });
  }

  const mesCount  = rMes.length;
  const semCount  = rSem.length;
  const delta     = mesCount - mesAntCount;
  const deltaAnio = mesCount - anioAntCount;

  return json({
    hoy: {
      fecha:    todayStr,
      turnos,
      count:    rHoy.length,
      proximos: turnos.filter(t => !t.pasado).length,
    },
    semana: {
      count:        semCount,
      slots_totales: slotsSem,
      pct:          slotsSem > 0 ? Math.round(semCount / slotsSem * 100) : 0,
      por_dia:      porDia,
    },
    mes: {
      count:        mesCount,
      slots_totales: slotsMes,
      pct:          slotsMes > 0 ? Math.round(mesCount / slotsMes * 100) : 0,
    },
    comparativo: {
      mes_anterior_count:  mesAntCount,
      delta,
      delta_pct: mesAntCount > 0 ? Math.round(delta / mesAntCount * 100) : null,
      anio_anterior_count: anioAntCount,
      delta_anio:          deltaAnio,
      delta_anio_pct:      anioAntCount > 0 ? Math.round(deltaAnio / anioAntCount * 100) : null,
      mes_num:             mesN,
      anio_anterior:       yearN - 1,
    },
    top_servicios:      topServicios,
    recurrentes_riesgo: riesgo,
    por_barbero:        porBarbero,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toFecha(d) {
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

function getWeekDates(d) {
  const dow = d.getUTCDay(); // 0=dom
  const mon = new Date(d.getTime());
  mon.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon.getTime());
    day.setUTCDate(mon.getUTCDate() + i);
    return day;
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
