// Utilidades compartidas de Google Calendar para el panel admin

export const DEFAULT_SCHEDULE = {
  1: { start: 9, end: 20 },
  2: { start: 9, end: 20 },
  3: { start: 9, end: 20 },
  4: { start: 9, end: 20 },
  5: { start: 9, end: 20 },
  6: { start: 9, end: 17 },
};

export const BARBEROS_CONFIG = {
  gebyano: { nombre: 'Gebyano', calendarId: null,                     schedule: DEFAULT_SCHEDULE },
  lobo:    { nombre: 'Lobo',    calendarId: null,                     schedule: DEFAULT_SCHEDULE },
  felipe:  { nombre: 'Felipe',  calendarId: 'felipevalor7@gmail.com', schedule: DEFAULT_SCHEDULE },
};

export const SLOT_DURATION = 30;

export const SERVICIOS = {
  'Corte':          30,
  'Corte + Barba':  45,
  'Barba':          15,
  'Afeitado':       15,
  'Niños':          30,
};

// ── Feriados argentinos ───────────────────────────────────────────────────────
export const FERIADOS = {
  2026: [
    { fecha: '1/1/2026',   nombre: 'Año Nuevo' },
    { fecha: '16/2/2026',  nombre: 'Carnaval' },
    { fecha: '17/2/2026',  nombre: 'Carnaval' },
    { fecha: '24/3/2026',  nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
    { fecha: '2/4/2026',   nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
    { fecha: '3/4/2026',   nombre: 'Viernes Santo' },
    { fecha: '1/5/2026',   nombre: 'Día del Trabajador' },
    { fecha: '25/5/2026',  nombre: 'Revolución de Mayo' },
    { fecha: '15/6/2026',  nombre: 'Feriado puente' },
    { fecha: '20/6/2026',  nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
    { fecha: '9/7/2026',   nombre: 'Día de la Independencia' },
    { fecha: '17/8/2026',  nombre: 'Paso a la Inmortalidad del Gral. José de San Martín' },
    { fecha: '12/10/2026', nombre: 'Día del Respeto a la Diversidad Cultural' },
    { fecha: '20/11/2026', nombre: 'Día de la Soberanía Nacional' },
    { fecha: '8/12/2026',  nombre: 'Inmaculada Concepción de María' },
    { fecha: '25/12/2026', nombre: 'Navidad' },
  ],
  2027: [
    { fecha: '1/1/2027',   nombre: 'Año Nuevo' },
    { fecha: '15/2/2027',  nombre: 'Carnaval' },
    { fecha: '16/2/2027',  nombre: 'Carnaval' },
    { fecha: '24/3/2027',  nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
    { fecha: '2/4/2027',   nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
    { fecha: '26/3/2027',  nombre: 'Viernes Santo' },
    { fecha: '1/5/2027',   nombre: 'Día del Trabajador' },
    { fecha: '25/5/2027',  nombre: 'Revolución de Mayo' },
    { fecha: '21/6/2027',  nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
    { fecha: '9/7/2027',   nombre: 'Día de la Independencia' },
    { fecha: '16/8/2027',  nombre: 'Paso a la Inmortalidad del Gral. José de San Martín' },
    { fecha: '11/10/2027', nombre: 'Día del Respeto a la Diversidad Cultural' },
    { fecha: '22/11/2027', nombre: 'Día de la Soberanía Nacional' },
    { fecha: '8/12/2027',  nombre: 'Inmaculada Concepción de María' },
    { fecha: '25/12/2027', nombre: 'Navidad' },
  ],
};

// Devuelve true si la fecha es feriado no trabajado para ese barbero
export async function checkFeriado(fecha, barbero_id, env) {
  const [d, m, y] = fecha.split('/').map(Number);
  const lista = FERIADOS[y] || [];
  const esFeriado = lista.some(f => f.fecha === fecha);
  if (!esFeriado) return false;

  try {
    const override = await env.barberia_db.prepare(
      'SELECT trabaja FROM feriados_override WHERE barbero_id = ? AND fecha = ?'
    ).bind(barbero_id, fecha).first();
    // Si hay override y trabaja=1 → no es feriado bloqueante
    if (override && override.trabaja === 1) return false;
  } catch { /* si falla la tabla, tratar como feriado */ }

  return true;
}

// Lee horario de D1; si no hay filas usa DEFAULT_SCHEDULE
export async function getSchedule(barbero_id, env) {
  try {
    const { results } = await env.barberia_db.prepare(
      'SELECT dow, activo, hora_inicio, hora_fin FROM barbero_horarios WHERE barbero_id = ?'
    ).bind(barbero_id).all();

    if (!results.length) return DEFAULT_SCHEDULE;

    const schedule = {};
    for (const row of results) {
      if (row.activo) schedule[row.dow] = { start: row.hora_inicio, end: row.hora_fin };
    }
    return schedule;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function generateSlots(schedule, dow) {
  const s = schedule[dow];
  if (!s) return [];
  const slots = [];
  const pad = n => String(n).padStart(2, '0');
  for (let h = s.start; h < s.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return slots;
}

export async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const b64u  = str => btoa(str).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const b64ub = b64 => b64.replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const header  = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64u(JSON.stringify({
    iss:   serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  }));
  const signingInput = `${header}.${payload}`;

  const pemBody = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${b64ub(btoa(String.fromCharCode(...new Uint8Array(sig))))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await res.json();
  if (!access_token) throw new Error('No access token');
  return access_token;
}

export async function getCalendarEvents(calendarId, fecha, accessToken) {
  const [d, m, y] = fecha.split('/').map(Number);
  const pad = n => String(n).padStart(2, '0');
  const ds = `${y}-${pad(m)}-${pad(d)}`;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?timeMin=${encodeURIComponent(`${ds}T00:00:00-03:00`)}` +
    `&timeMax=${encodeURIComponent(`${ds}T23:59:59-03:00`)}` +
    `&singleEvents=true&orderBy=startTime`;

  const res  = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  const data = await res.json();
  return (data.items || [])
    .filter(e => e.status !== 'cancelled' && e.start?.dateTime && e.end?.dateTime)
    .map(e => ({ id: e.id, summary: e.summary || '', start: e.start.dateTime, end: e.end.dateTime }));
}

export function buildEventTimes(fecha, hora, duracionMin) {
  const [d, m, y] = fecha.split('/').map(Number);
  const [h, min]  = hora.split(':').map(Number);
  const pad = n => String(n).padStart(2, '0');
  const ds  = `${y}-${pad(m)}-${pad(d)}`;
  const startISO = `${ds}T${pad(h)}:${pad(min)}:00-03:00`;
  const total    = h * 60 + min + duracionMin;
  const endISO   = `${ds}T${pad(Math.floor(total / 60))}:${pad(total % 60)}:00-03:00`;
  return { startISO, endISO };
}

export async function createCalendarEvent(calendarId, summary, fecha, hora, duracionMin, accessToken) {
  const { startISO, endISO } = buildEventTimes(fecha, hora, duracionMin);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        start: { dateTime: startISO, timeZone: 'America/Argentina/Buenos_Aires' },
        end:   { dateTime: endISO,   timeZone: 'America/Argentina/Buenos_Aires' },
      }),
    }
  );
  if (!res.ok) throw new Error(JSON.stringify(await res.json()));
  const data = await res.json();
  return data.id;
}

export async function updateCalendarEvent(calendarId, eventId, summary, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary }),
    }
  );
  // 404/410 = el evento ya no existe, no es error crítico
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(JSON.stringify(await res.json()));
  }
}

export async function deleteCalendarEvent(calendarId, eventId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  // 404/410 = ya no existe, se ignora
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar delete failed: ${res.status}`);
  }
}
