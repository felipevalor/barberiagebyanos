// GET /api/barberos → lista de barberos activos (+ inactivos) para el frontend

const DEFAULT_SCHEDULE = {
  1: { start: 9, end: 20 },
  2: { start: 9, end: 20 },
  3: { start: 9, end: 20 },
  4: { start: 9, end: 20 },
  5: { start: 9, end: 20 },
  6: { start: 9, end: 17 },
};

const FALLBACK = [
  { id: 'gebyano', nombre: 'Gebyano', tel: '5493416021009',  disponible: false, calendarId: null,                     schedule: DEFAULT_SCHEDULE },
  { id: 'lobo',    nombre: 'Lobo',    tel: '5493412754502',  disponible: true,  calendarId: null,                     schedule: DEFAULT_SCHEDULE },
  { id: 'felipe',  nombre: 'Felipe',  tel: '5493416513207',  disponible: true,  calendarId: 'felipevalor7@gmail.com', schedule: DEFAULT_SCHEDULE },
  { id: 'ns',      nombre: 'NS',      tel: null,             disponible: false, calendarId: null,                     schedule: null },
  { id: 'bql',     nombre: 'BQL',     tel: null,             disponible: false, calendarId: null,                     schedule: null },
];

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT id, nombre, tel, calendar_id, activo, orden FROM barberos_config ORDER BY orden ASC'
    ).all();

    if (!results.length) return json(FALLBACK);

    const barberos = results.map(r => ({
      id:         r.id,
      nombre:     r.nombre,
      // strip leading + so WA deep links work: wa.me/5493416021009
      tel:        r.tel ? r.tel.replace(/^\+/, '') : null,
      disponible: r.activo === 1,
      calendarId: r.calendar_id || null,
      schedule:   DEFAULT_SCHEDULE,
    }));

    return json(barberos);
  } catch {
    return json(FALLBACK);
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
