/**
 * Barbería Gebyanos - Cloudflare Worker
 * Guarda reservas en D1 y permite consultar el registro.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      const body = await request.json();
      const { nombre, servicio, barbero, fecha } = body;

      // Validación
      if (!nombre || !servicio || !barbero) {
        return new Response(
          JSON.stringify({ success: false, error: 'Faltan campos obligatorios' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Guardar en D1
      await env.barberia_db.prepare(
        `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        nombre,
        '',                          // teléfono vacío
        servicio,
        barbero,
        fecha || '',                 // nueva columna fecha
        '',                          // mensaje vacío
        new Date().toISOString()
      ).run();

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      console.error('Worker error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Error interno' }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
