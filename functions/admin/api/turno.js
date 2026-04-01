import { getSession } from './_session.js';
import { BARBEROS_CONFIG, SLOT_DURATION, getServicios, getGoogleAccessToken, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, normalizeTel, checkOverlap } from './_gcal.js';

// ── Crear turno manual ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { barbero_id, fecha, hora, nombre, servicio, telefono } = await request.json();

  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (!servicio)        return json({ error: 'El servicio es obligatorio' }, 400);
  if (!fecha || !hora)  return json({ error: 'Falta fecha u hora' }, 400);

  const bId = session.role === 'owner' ? barbero_id : session.barbero_id;
  const cfg = BARBEROS_CONFIG[bId];
  if (!cfg) return json({ error: 'Barbero no encontrado' }, 404);

  const serviciosMap = await getServicios(env, bId);
  const duracion = serviciosMap[servicio] ?? SLOT_DURATION;

  // Validar overlap con reservas existentes del mismo día y barbero
  const { overlap, conflicto } = await checkOverlap(env, cfg.nombre, fecha, hora, duracion, serviciosMap);
  if (overlap) {
    return json({ error: `Ese horario se superpone con un turno existente (${conflicto})` }, 409);
  }

  // Crear evento en Google Calendar (best-effort)
  let calendarEventId = null;
  if (cfg.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
      const tk = await getGoogleAccessToken(sa);
      calendarEventId = await createCalendarEvent(
        cfg.calendarId,
        `Turno — ${nombre.trim()} (${servicio})`,
        fecha, hora, duracion, tk
      );
    } catch (e) {
      console.error('Calendar create error:', e);
    }
  }

  // Transformar fecha DD/MM/YYYY a YYYY-MM-DD
  const [d, m, y] = fecha.split('/').map(Number);
  const fechaISO = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Upsert cliente
  let clienteId = null;
  const telNorm = normalizeTel(telefono);
  const now = new Date().toISOString();
  try {
    const existing = await env.barberia_db.prepare(
      'SELECT id FROM clientes WHERE telefono = ?'
    ).bind(telNorm).first();
    
    if (existing) {
      clienteId = existing.id;
      await env.barberia_db.prepare(
        'UPDATE clientes SET nombre = ?, updated_at = ? WHERE id = ?'
      ).bind(nombre.trim(), now, clienteId).run();
    } else {
      const resCliente = await env.barberia_db.prepare(
        'INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)'
      ).bind(nombre.trim(), telNorm, now, now).run();
      clienteId = resCliente.meta?.last_row_id;
    }
  } catch (e) { console.error('Clientes upsert error:', e); }

  try {
    const result = await env.barberia_db.prepare(
      `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, source, created_at, cliente_id, fecha_iso)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?, ?)`
    ).bind(
      nombre.trim(),
      telNorm,
      servicio,
      cfg.nombre,
      fecha,
      `${fecha} ${hora}`,
      calendarEventId,
      now,
      clienteId,
      fechaISO
    ).run();
    
    // Background update recurrentes
    if (clienteId) {
      env.waitUntil((async () => {
        try {
          await env.barberia_db.prepare(
            'UPDATE clientes_recurrentes SET ultimo_turno_fecha_iso = ? WHERE cliente_id = ?'
          ).bind(fechaISO, clienteId).run();
        } catch (e) { console.error('Recurrentes update error:', e); }
      })());
    }

    return json({ success: true, id: result.meta?.last_row_id });
  } catch (e) {
    // Rollback del evento de Calendar si el INSERT falló
    if (calendarEventId && cfg.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk = await getGoogleAccessToken(sa);
        await deleteCalendarEvent(cfg.calendarId, calendarEventId, tk);
      } catch (_) {}
    }
    const isDouble = e?.message?.includes('UNIQUE constraint failed');
    return json({ error: isDouble ? 'Ese horario ya está reservado' : 'Error al guardar el turno' }, isDouble ? 409 : 500);
  }
}

// ── Editar turno (nombre, servicio, y opcionalmente barbero/fecha/hora) ───────
export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id, nombre, servicio, telefono, nuevo_barbero_id, nueva_fecha, nueva_hora } = await request.json();

  if (!id)             return json({ error: 'Falta id' }, 400);
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400);
  if (!servicio)       return json({ error: 'El servicio es obligatorio' }, 400);

  // Leer el turno actual
  const reserva = await env.barberia_db.prepare(
    'SELECT id, barbero, fecha, mensaje, calendar_event_id FROM reservas WHERE id = ?'
  ).bind(id).first();

  if (!reserva) return json({ error: 'Turno no encontrado' }, 404);

  const cfgActual = getBarberoConfigByNombre(reserva.barbero);
  if (session.role !== 'owner' && cfgActual?.id !== session.barbero_id) {
    return json({ error: 'Sin permisos para editar este turno' }, 403);
  }

  const cambiaBarbero  = nuevo_barbero_id && nuevo_barbero_id !== cfgActual?.id;
  const cambiaHorario  = nueva_fecha && nueva_hora;

  if (cambiaBarbero && session.role !== 'owner') {
    return json({ error: 'Sin permisos para cambiar el barbero' }, 403);
  }

  const bIdFinal   = cambiaBarbero ? nuevo_barbero_id : (cfgActual?.id || session.barbero_id);
  const cfgFinal   = BARBEROS_CONFIG[bIdFinal];
  if (!cfgFinal) return json({ error: 'Barbero no encontrado' }, 404);

  const fechaFinal = cambiaHorario ? nueva_fecha : reserva.fecha;
  const horaFinal  = cambiaHorario ? nueva_hora  : reserva.mensaje.split(' ')[1];
  const mensajeFinal = `${fechaFinal} ${horaFinal}`;

  // Validar overlap si cambia fecha/hora o barbero (excluyendo el turno actual)
  if (cambiaHorario || cambiaBarbero) {
    const serviciosMap = await getServicios(env, bIdFinal);
    const duracion = serviciosMap[servicio] ?? SLOT_DURATION;

    const { overlap: ov2, conflicto: c2 } = await checkOverlap(env, cfgFinal.nombre, fechaFinal, horaFinal, duracion, serviciosMap, reserva.mensaje);
    if (ov2) {
      return json({ error: `Ese horario se superpone con un turno existente (${c2})` }, 409);
    }

    // Calendar: eliminar el evento anterior, crear uno nuevo
    if (reserva.calendar_event_id && cfgActual?.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk = await getGoogleAccessToken(sa);
        await deleteCalendarEvent(cfgActual.calendarId, reserva.calendar_event_id, tk);
      } catch (e) { console.error('Calendar delete error:', e); }
    }

    let newCalendarEventId = null;
    if (cfgFinal.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk = await getGoogleAccessToken(sa);
        const serviciosMap2 = await getServicios(env, bIdFinal);
        newCalendarEventId = await createCalendarEvent(
          cfgFinal.calendarId,
          `Turno — ${nombre.trim()} (${servicio})`,
          fechaFinal, horaFinal, serviciosMap2[servicio] ?? SLOT_DURATION, tk
        );
      } catch (e) { console.error('Calendar create error:', e); }
    }

    const [df, mf, yf] = fechaFinal.split('/').map(Number);
    const fechaISO = `${yf}-${String(mf).padStart(2, '0')}-${String(df).padStart(2, '0')}`;

    await env.barberia_db.prepare(
      'UPDATE reservas SET nombre = ?, telefono = ?, servicio = ?, barbero = ?, fecha = ?, mensaje = ?, calendar_event_id = ?, fecha_iso = ? WHERE id = ?'
    ).bind(nombre.trim(), normalizeTel(telefono), servicio, cfgFinal.nombre, fechaFinal, mensajeFinal, newCalendarEventId, fechaISO, id).run();

  } else {
    // Solo nombre / servicio: actualizar D1 y el título del evento en Calendar
    await env.barberia_db.prepare(
      'UPDATE reservas SET nombre = ?, telefono = ?, servicio = ? WHERE id = ?'
    ).bind(nombre.trim(), normalizeTel(telefono), servicio, id).run();

    if (reserva.calendar_event_id && cfgActual?.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk = await getGoogleAccessToken(sa);
        await updateCalendarEvent(cfgActual.calendarId, reserva.calendar_event_id, `Turno — ${nombre.trim()} (${servicio})`, tk);
      } catch (e) { console.error('Calendar update error:', e); }
    }
  }

  return json({ success: true });
}

// ── Eliminar turno ────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);

  const { id } = await request.json();
  if (!id) return json({ error: 'Falta id' }, 400);

  const reserva = await env.barberia_db.prepare(
    'SELECT id, barbero, calendar_event_id FROM reservas WHERE id = ?'
  ).bind(id).first();

  if (!reserva) return json({ error: 'Turno no encontrado' }, 404);

  const cfg = getBarberoConfigByNombre(reserva.barbero);
  if (session.role !== 'owner' && cfg?.id !== session.barbero_id) {
    return json({ error: 'Sin permisos para eliminar este turno' }, 403);
  }

  // Eliminar de D1 primero (fuente de verdad)
  await env.barberia_db.prepare('DELETE FROM reservas WHERE id = ?').bind(id).run();

  // Eliminar de Calendar (best-effort)
  if (reserva.calendar_event_id && cfg?.calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
      const tk = await getGoogleAccessToken(sa);
      await deleteCalendarEvent(cfg.calendarId, reserva.calendar_event_id, tk);
    } catch (e) {
      console.error('Calendar delete error:', e);
    }
  }

  return json({ success: true });
}


function getBarberoConfigByNombre(nombre) {
  for (const [id, cfg] of Object.entries(BARBEROS_CONFIG)) {
    if (cfg.nombre === nombre) return { ...cfg, id };
  }
  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
