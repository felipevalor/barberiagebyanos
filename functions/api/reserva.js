export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json();
    const { nombre, servicio, barbero, fecha, hora, calendarId, duracion } = body;

    if (!nombre || !servicio || !barbero) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan campos obligatorios' }),
        { status: 400, headers: corsHeaders }
      );
    }

    let calendarEventId = null;
    if (calendarId && env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const accessToken = await getGoogleAccessToken(serviceAccount);
        calendarEventId = await createCalendarEvent(calendarId, nombre, servicio, fecha, hora, duracion || 30, accessToken);
      } catch (calError) {
        console.error('Calendar error:', calError);
      }
    }

    await env.barberia_db.prepare(
      `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      nombre,
      '',
      servicio,
      barbero || '',
      fecha || '',
      fecha && hora ? `${fecha} ${hora}` : '',
      calendarEventId,
      new Date().toISOString()
    ).run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const isDoubleBooking = error?.message?.includes('UNIQUE constraint failed');
    return new Response(
      JSON.stringify({ success: false, error: isDoubleBooking ? 'Turno ya reservado' : 'Error interno' }),
      { status: isDoubleBooking ? 409 : 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

function base64url(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlFromBase64(b64) {
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
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
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signingInput}.${base64urlFromBase64(signatureB64)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const { access_token } = await tokenRes.json();
  if (!access_token) throw new Error('No access token received');
  return access_token;
}

async function createCalendarEvent(calendarId, nombre, servicio, fecha, hora, duracion, accessToken) {
  const [day, month, year] = fecha.split('/').map(Number);
  const [h, m] = hora.split(':').map(Number);

  const pad = n => String(n).padStart(2, '0');
  const dateStr  = `${year}-${pad(month)}-${pad(day)}`;
  const startISO = `${dateStr}T${pad(h)}:${pad(m)}:00-03:00`;

  const totalMin = h * 60 + m + duracion;
  const endISO   = `${dateStr}T${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}:00-03:00`;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `Turno — ${nombre} (${servicio})`,
        start: { dateTime: startISO, timeZone: 'America/Argentina/Buenos_Aires' },
        end:   { dateTime: endISO,   timeZone: 'America/Argentina/Buenos_Aires' },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  const data = await res.json();
  return data.id;
}
