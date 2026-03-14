// GET  /api/mi-turno?nombre=Juan+García  → próximo turno futuro
// DELETE /api/mi-turno?nombre=X&mensaje=Y → cancelar turno
// PUT  /api/mi-turno  body:{nombre,old_mensaje,new_fecha,new_hora} → modificar turno

const SERVICIOS_DUR = {
  'Corte': 30, 'Corte + Barba': 45, 'Barba': 15,
  'Afeitado': 15, 'Niños 10-13 años': 30, 'Niños 0-9 años': 30,
};

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const nombre = url.searchParams.get('nombre')?.trim();

  if (!nombre || nombre.length < 3) {
    return json({ error: 'Nombre muy corto' }, 400);
  }

  const { results } = await env.barberia_db.prepare(
    `SELECT nombre, servicio, barbero, mensaje
     FROM reservas
     WHERE LOWER(nombre) = LOWER(?)
     ORDER BY mensaje ASC`
  ).bind(nombre).all();

  // Fecha/hora actual en Argentina (UTC-3)
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));

  const futuros = results.filter(r => {
    const parts = r.mensaje?.split(' ');
    if (!parts || parts.length < 2) return false;
    const [d, m, y] = parts[0].split('/').map(Number);
    const [h, min]  = parts[1].split(':').map(Number);
    return new Date(y, m - 1, d, h, min) >= ahora;
  });

  if (!futuros.length) return json({ turno: null });

  const r     = futuros[0];
  const hora  = r.mensaje.split(' ')[1];
  const fecha = r.mensaje.split(' ')[0];

  return json({ turno: { nombre: r.nombre, servicio: r.servicio, barbero: r.barbero, fecha, hora, mensaje: r.mensaje } });
}

export async function onRequestDelete({ request, env }) {
  const url     = new URL(request.url);
  const nombre  = url.searchParams.get('nombre')?.trim();
  const mensaje = url.searchParams.get('mensaje')?.trim();

  if (!nombre || !mensaje) return json({ error: 'Datos incompletos' }, 400);

  await env.barberia_db.prepare(
    'DELETE FROM reservas WHERE LOWER(nombre) = LOWER(?) AND mensaje = ?'
  ).bind(nombre, mensaje).run();

  return json({ ok: true });
}

export async function onRequestPut({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido' }, 400); }

  const { nombre, old_mensaje, new_fecha, new_hora } = body;
  if (!nombre || !old_mensaje || !new_fecha || !new_hora) {
    return json({ error: 'Datos incompletos' }, 400);
  }

  // Obtener el barbero y servicio del turno existente
  const existing = await env.barberia_db.prepare(
    'SELECT barbero, servicio FROM reservas WHERE LOWER(nombre) = LOWER(?) AND mensaje = ?'
  ).bind(nombre, old_mensaje).first();

  if (!existing) return json({ error: 'Turno no encontrado' }, 404);

  // Verificar que el nuevo horario no esté ocupado
  const durMin = SERVICIOS_DUR[existing.servicio] || 30;
  const [hNew, mNew] = new_hora.split(':').map(Number);
  const newStart = hNew * 60 + mNew;
  const newEnd   = newStart + durMin;

  const { results: existentes } = await env.barberia_db.prepare(
    'SELECT mensaje, servicio FROM reservas WHERE barbero = ? AND fecha = ? AND mensaje != ?'
  ).bind(existing.barbero, new_fecha, old_mensaje).all();

  for (const r of existentes) {
    const rHora = r.mensaje?.split(' ')[1];
    if (!rHora) continue;
    const [rh, rm] = rHora.split(':').map(Number);
    const rStart = rh * 60 + rm;
    const rEnd   = rStart + (SERVICIOS_DUR[r.servicio] || 30);
    if (newStart < rEnd && newEnd > rStart) {
      return json({ error: 'Ese horario ya fue tomado. Elegí otro.' }, 409);
    }
  }

  // Actualizar
  try {
    await env.barberia_db.prepare(
      'UPDATE reservas SET fecha = ?, mensaje = ? WHERE LOWER(nombre) = LOWER(?) AND mensaje = ?'
    ).bind(new_fecha, `${new_fecha} ${new_hora}`, nombre, old_mensaje).run();
  } catch (e) {
    if (e?.message?.includes('UNIQUE')) {
      return json({ error: 'Ese horario ya fue tomado. Elegí otro.' }, 409);
    }
    return json({ error: 'Error interno' }, 500);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
