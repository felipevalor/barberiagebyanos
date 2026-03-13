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
