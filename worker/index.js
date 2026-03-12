/**
 * El Filo - Cloudflare Worker
 * API Endpoint: POST /api/reserva
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle Preflight OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: POST /api/reserva
    if (url.pathname === "/api/reserva" && request.method === "POST") {
      try {
        const body = await request.json();
        const { nombre, telefono, servicio, mensaje } = body;

        // Validation
        if (!nombre || !telefono || !servicio) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Insert into D1
        await env.barberia_db.prepare(
          "INSERT INTO reservas (nombre, telefono, servicio, mensaje) VALUES (?, ?, ?, ?)"
        )
        .bind(nombre, telefono, servicio, mensaje || null)
        .run();

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: "Internal Server Error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Default 404
    return new Response("Not Found", { status: 404 });
  },
};
