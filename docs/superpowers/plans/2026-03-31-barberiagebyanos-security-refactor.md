# Barbería Gebyanos — Security & Architecture Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver los 4 CRITICAL y 7 HIGH encontrados en el code review pre-fase 2, sin cambiar el comportamiento del sitio para los usuarios.

**Architecture:** Tres fases desplegables de forma independiente. Fase A (seguridad) es la más urgente y tiene el menor riesgo. Fase B (backend) limpia la deuda arquitectónica del worker. Fase C (frontend) modulariza main.js para que la fase 2 sea implementable.

**Tech Stack:** HTML + CSS + JS vanilla (sin frameworks ni bundler), Cloudflare Workers/Pages, D1 (SQLite edge), ES Modules nativos del browser.

---

## Scope check — subsistemas independientes

Este spec cubre 3 subsistemas que pueden desplegarse por separado:
- **Fase A** (Tasks 1-7): Fixes de seguridad — deploy + test en ~2h
- **Fase B** (Tasks 8-11): Refactor backend — deploy + test en ~2h
- **Fase C** (Tasks 12-17): Modularización frontend — deploy + test en ~3h

Cada fase produce software funcionando por sí sola. Si el tiempo apremia, hacer solo Fase A antes de empezar la fase 2 del producto.

---

## File Structure

### Fase A — Seguridad

| Acción | Archivo |
|--------|---------|
| Crear | `migrations/021_add_cancel_token.sql` |
| Modificar | `.dev.vars` (SHA-256 passwords) |
| Modificar | `functions/api/reserva.js` (CORS + cancel_token) |
| Modificar | `functions/api/mi-turno.js` (require cancel_token) |
| Crear | `public/js/ui-utils.js` (escapeHtml) |
| Modificar | `public/js/main.js` (aplicar escapeHtml) |

### Fase B — Backend

| Acción | Archivo |
|--------|---------|
| Crear | `migrations/022_api_rate_limits.sql` |
| Crear | `functions/api/_ratelimit.js` |
| Modificar | `functions/api/reserva.js` (rate limiting) |
| Modificar | `functions/api/mi-turno.js` (rate limiting) |
| Modificar | `functions/api/turnos.js` (rate limiting) |
| Modificar | `functions/admin/api/reservas.js` (getSession) |
| Modificar | `functions/admin/api/stats.js` (getSession + extract helpers) |
| Modificar | `functions/admin/api/agenda.js` (getSession) |
| Modificar | `functions/admin/api/_gcal.js` (checkOverlap + remover tels hardcodeados) |
| Modificar | `functions/api/barberos.js` (remover BARBEROS_CONFIG duplicado) |
| Modificar | `functions/api/mi-turno.js` (remover SERVICIOS_DUR duplicado) |

### Fase C — Frontend

| Acción | Archivo |
|--------|---------|
| Crear | `public/js/config.js` |
| Crear | `public/js/cursor.js` |
| Crear | `public/js/catalogo.js` |
| Crear | `public/js/calendar-picker.js` |
| Crear | `public/js/reserva.js` |
| Crear | `public/js/mi-turno-section.js` |
| Modificar | `public/js/main.js` (entry point + imports) |
| Modificar | `public/js/ui-utils.js` (mover aquí desde Fase A) |
| Modificar | `public/index.html` (agregar type="module") |
| Crear | `public/css/reserva.css` |
| Modificar | `public/css/style.css` (remover estilos de reserva) |

---

# FASE A — Seguridad

## Task 1: SHA-256 passwords en .dev.vars

**Files:**
- Modify: `.dev.vars`

El código en `functions/admin/api/auth.js` ya detecta si el password es un hash SHA-256 (string hex de 64 chars) o texto plano. Solo hay que actualizar los valores en `.dev.vars`.

- [ ] **Step 1: Generar los hashes**

Correr en terminal (o en la consola del browser):

```bash
node -e "
const crypto = require('crypto');
['gebyano123','lobo123','felipe123'].forEach(p => {
  const h = crypto.createHash('sha256').update(p).digest('hex');
  console.log(p, '->', h);
})
"
```

Guardar los 3 hashes para el paso siguiente.

- [ ] **Step 2: Actualizar .dev.vars**

Reemplazar la línea `ADMIN_PASSWORDS` con los hashes (valores de ejemplo, reemplazar con los que generaste):

```
ADMIN_PASSWORDS={"gebyano":"<hash_de_gebyano123>","lobo":"<hash_de_lobo123>","felipe":"<hash_de_felipe123>"}
```

- [ ] **Step 3: Verificar que login sigue funcionando**

```bash
npx wrangler pages dev ./public
```

Ir a `/admin`, intentar login con las mismas contraseñas de antes. Debe funcionar igual.

- [ ] **Step 4: Commit**

```bash
git add .dev.vars
git commit -m "security: migrar passwords admin a SHA-256"
```

---

## Task 2: Fix CORS — restringir Access-Control-Allow-Origin

**Files:**
- Modify: `functions/api/reserva.js`

Actualmente `Access-Control-Allow-Origin: *` permite que cualquier sitio haga reservas. Debe permitir solo los dominios propios.

- [ ] **Step 1: Reemplazar el objeto CORS en reserva.js**

Abrir `functions/api/reserva.js`. Reemplazar las líneas 3-8 (el objeto `CORS`) con:

```javascript
// Dominios permitidos: producción + previews de Cloudflare Pages
const ALLOWED_ORIGINS = [
  'https://gebyanos.com.ar',
  'https://barberia-d8q.pages.dev',
];

function getCors(request) {
  const origin = request?.headers?.get('Origin') || '';
  // Permitir también previews de Pages (ej: https://abc123.barberia.pages.dev)
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pages.dev');
  const allowedOrigin = allowed ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };
}
```

- [ ] **Step 2: Actualizar los usos de CORS en reserva.js**

La función `res` en la línea 122 usa el objeto `CORS`. Reemplazar con:

```javascript
function res(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), { status, headers: getCors(request) });
}
```

Y actualizar `onRequestOptions` (línea 118):

```javascript
export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: getCors(request) });
}
```

Y en `onRequestPost`, pasar `request` al `res(...)`:

```javascript
// Cambiar todas las llamadas a res(...) dentro de onRequestPost por:
return res({ success: false, error: '...' }, 400, request);
// etc.
```

- [ ] **Step 3: Verificar que el formulario sigue funcionando**

```bash
npx wrangler pages dev ./public
```

Abrir el formulario de reserva, hacer una reserva completa. Verificar en Network tab que la respuesta tiene `Access-Control-Allow-Origin: http://localhost:8788` (o el origen local).

- [ ] **Step 4: Commit**

```bash
git add functions/api/reserva.js
git commit -m "security: restringir CORS a dominios propios en /api/reserva"
```

---

## Task 3: Crear escapeHtml y aplicar a todos los innerHTML con datos del servidor

**Files:**
- Create: `public/js/ui-utils.js`
- Modify: `public/js/main.js` (líneas 50-83, 785-801, 896-906)

El XSS ocurre cuando datos que vienen de la API se insertan con `innerHTML` sin escapar. La función `escapeHtml` convierte `<`, `>`, `&`, `"` y `'` a entidades HTML.

- [ ] **Step 1: Crear public/js/ui-utils.js**

```javascript
/**
 * Escapa caracteres HTML especiales para prevenir XSS.
 * Usar siempre que se inserte texto externo en innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 2: Cargar ui-utils.js en index.html ANTES de main.js**

En `public/index.html`, línea 323, reemplazar:

```html
<script src="js/main.js?v=1.1"></script>
```

por:

```html
<script src="js/ui-utils.js"></script>
<script src="js/main.js?v=1.2"></script>
```

**Nota:** En la Fase C esto cambiará a `type="module"`. Por ahora, `escapeHtml` debe ser una global. Ajustar `ui-utils.js` para que sea compatible con script clásico (sin `export`):

```javascript
// public/js/ui-utils.js — versión Fase A (script clásico, sin export)
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 3: Aplicar escapeHtml en renderCatalogo (main.js línea 50-59)**

Reemplazar:

```javascript
return `<div class="servicio-card">
    <div class="servicio-nombre">${s.nombre}</div>
    <div class="servicio-incluye">${s.incluye || ''}</div>
    ${precio}
</div>`;
```

por:

```javascript
return `<div class="servicio-card">
    <div class="servicio-nombre">${escapeHtml(s.nombre)}</div>
    <div class="servicio-incluye">${escapeHtml(s.incluye || '')}</div>
    ${precio}
</div>`;
```

Y el bloque de `precio`:

```javascript
const precio = s.precio_ars && s.precio_ars > 0
    ? `<div class="servicio-precio">$${Number(s.precio_ars).toLocaleString('es-AR')}</div>`
    : '';
```

El precio es numérico, no necesita escape.

- [ ] **Step 4: Aplicar escapeHtml en renderPromos (main.js línea 68-81)**

Reemplazar:

```javascript
const badge = p.badge ? `<div class="promo-badge">${p.badge}</div>` : '';
// ...
return `<div class="promo-card${especial}">
    ${badge}
    <div class="promo-nombre">${p.nombre}</div>
    ${precio ? `<div class="promo-precio">${precio}</div>` : ''}
    ${nota}
</div>`;
```

por:

```javascript
const badge = p.badge ? `<div class="promo-badge">${escapeHtml(p.badge)}</div>` : '';
const nota  = p.nota  ? `<div class="promo-nota">${escapeHtml(p.nota)}</div>`  : '';
const especial = p.badge ? ' promo-especial' : '';
const precio = p.precio_ars && p.precio_ars > 0
    ? `$${Number(p.precio_ars).toLocaleString('es-AR')}${p.unidad ? ` <span>${escapeHtml(p.unidad)}</span>` : ''}`
    : '';
return `<div class="promo-card${especial}">
    ${badge}
    <div class="promo-nombre">${escapeHtml(p.nombre)}</div>
    ${precio ? `<div class="promo-precio">${precio}</div>` : ''}
    ${nota}
</div>`;
```

- [ ] **Step 5: Aplicar escapeHtml en showConfirmacion (main.js línea 785-801)**

Reemplazar el template literal de `confirm-details`:

```javascript
document.getElementById('confirm-details').innerHTML = `
  <div class="confirm-row">
    <span class="confirm-row-label">Barbero</span>
    <span class="confirm-row-value">${escapeHtml(turno.barbero)}</span>
  </div>
  <div class="confirm-row">
    <span class="confirm-row-label">Servicio</span>
    <span class="confirm-row-value">${escapeHtml(turno.servicio)}</span>
  </div>
  <div class="confirm-row">
    <span class="confirm-row-label">Día</span>
    <span class="confirm-row-value">${escapeHtml(fechaLabel)}</span>
  </div>
  <div class="confirm-row">
    <span class="confirm-row-label">Hora</span>
    <span class="confirm-row-value">${escapeHtml(turno.hora)}</span>
  </div>`;
```

- [ ] **Step 6: Aplicar escapeHtml en renderCard (main.js línea 896-906)**

Reemplazar:

```javascript
result.innerHTML = `
  <div class="mi-turno-card">
    <div class="mi-turno-card-fecha">${fechaLabel} · ${t.hora}</div>
    <div class="mi-turno-card-rows">
      <div class="mi-turno-card-row"><span>Barbero</span><span>${t.barbero}</span></div>
      <div class="mi-turno-card-row"><span>Servicio</span><span>${t.servicio}</span></div>
    </div>
    ...
```

por:

```javascript
result.innerHTML = `
  <div class="mi-turno-card">
    <div class="mi-turno-card-fecha">${escapeHtml(fechaLabel)} · ${escapeHtml(t.hora)}</div>
    <div class="mi-turno-card-rows">
      <div class="mi-turno-card-row"><span>Barbero</span><span>${escapeHtml(t.barbero)}</span></div>
      <div class="mi-turno-card-row"><span>Servicio</span><span>${escapeHtml(t.servicio)}</span></div>
    </div>
    ...
```

- [ ] **Step 7: Verificar en browser**

```bash
npx wrangler pages dev ./public
```

Abrir `/`, verificar que catálogo, promos y confirmación de turno se siguen viendo normalmente.

- [ ] **Step 8: Commit**

```bash
git add public/js/ui-utils.js public/js/main.js public/index.html
git commit -m "security: agregar escapeHtml y aplicar en todos los innerHTML con datos del servidor"
```

---

## Task 4: Cancel token — migración D1

**Files:**
- Create: `migrations/021_add_cancel_token.sql`

El cancel_token es un UUID aleatorio generado al crear la reserva. Permite que solo quien hizo la reserva pueda cancelarla o modificarla.

- [ ] **Step 1: Crear migrations/021_add_cancel_token.sql**

```sql
-- Agrega cancel_token a reservas existentes.
-- Reservas previas quedrán con cancel_token NULL → fallback a verificación por teléfono.
ALTER TABLE reservas ADD COLUMN cancel_token TEXT;

CREATE INDEX IF NOT EXISTS idx_reservas_cancel_token ON reservas (cancel_token);
```

- [ ] **Step 2: Aplicar en local**

```bash
wrangler d1 execute barberia-db --local --file=./migrations/021_add_cancel_token.sql
```

Salida esperada: `Successfully executed SQL`

- [ ] **Step 3: Verificar schema local**

```bash
wrangler d1 execute barberia-db --local --command="PRAGMA table_info(reservas)"
```

Verificar que aparece la columna `cancel_token TEXT`.

- [ ] **Step 4: Commit**

```bash
git add migrations/021_add_cancel_token.sql
git commit -m "feat: migración 021 — agregar cancel_token a reservas"
```

---

## Task 5: Cancel token — generación en POST /api/reserva

**Files:**
- Modify: `functions/api/reserva.js`

El endpoint de reserva debe generar un UUID, guardarlo en D1, y devolverlo en la respuesta para que el frontend pueda guardarlo.

- [ ] **Step 1: Generar cancel_token antes del INSERT**

En `functions/api/reserva.js`, dentro de `onRequestPost`, antes de la línea que hace el INSERT (línea 52 aprox), agregar:

```javascript
const cancelToken = crypto.randomUUID();
```

- [ ] **Step 2: Incluir cancel_token en el INSERT**

Reemplazar el INSERT existente:

```javascript
await env.barberia_db.prepare(
  `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
).bind(
  nombre.trim(),
  normalizeTel(telefono),
  servicio,
  nombreBarbero,
  fecha,
  mensaje,
  new Date().toISOString()
).run();
```

por:

```javascript
await env.barberia_db.prepare(
  `INSERT INTO reservas (nombre, telefono, servicio, barbero, fecha, mensaje, calendar_event_id, cancel_token, created_at)
   VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
).bind(
  nombre.trim(),
  normalizeTel(telefono),
  servicio,
  nombreBarbero,
  fecha,
  mensaje,
  cancelToken,
  new Date().toISOString()
).run();
```

- [ ] **Step 3: Incluir cancel_token en la respuesta**

Reemplazar la línea del `return res(...)` al final:

```javascript
return res({ success: true, turno: { nombre: nombre.trim(), servicio, barbero: nombreBarbero, fecha, hora } }, 200, request);
```

por:

```javascript
return res({ success: true, turno: { nombre: nombre.trim(), servicio, barbero: nombreBarbero, fecha, hora }, cancel_token: cancelToken }, 200, request);
```

- [ ] **Step 4: Verificar con curl**

```bash
# Con wrangler pages dev corriendo:
curl -s -X POST http://localhost:8788/api/reserva \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test Cancel","telefono":"3416000000","servicio":"Corte","barberoId":"lobo","fecha":"1/5/2026","hora":"10:00"}' \
  | jq .
```

Salida esperada: respuesta JSON con campo `cancel_token` (UUID).

- [ ] **Step 5: Commit**

```bash
git add functions/api/reserva.js
git commit -m "feat: generar y devolver cancel_token al crear reserva"
```

---

## Task 6: Cancel token — requerir en DELETE y PUT de /api/mi-turno

**Files:**
- Modify: `functions/api/mi-turno.js`

Sin este fix, cualquiera puede cancelar el turno de otro. Con el token, solo quien lo recibió al reservar puede cancelar.

- [ ] **Step 1: Actualizar onRequestDelete para requerir cancel_token**

Reemplazar el handler `onRequestDelete` completo (líneas 54-90):

```javascript
export async function onRequestDelete({ request, env, waitUntil }) {
  const url        = new URL(request.url);
  const nombre     = url.searchParams.get('nombre')?.trim();
  const mensaje    = url.searchParams.get('mensaje')?.trim();
  const cancelToken = url.searchParams.get('cancel_token')?.trim();
  const telefono   = url.searchParams.get('telefono')?.trim();

  if (!nombre || !mensaje) return json({ error: 'Datos incompletos' }, 400);

  // Obtener turno para verificar token o teléfono
  const turno = await env.barberia_db.prepare(
    'SELECT servicio, barbero, calendar_event_id, cancel_token, telefono FROM reservas WHERE LOWER(nombre) = LOWER(?) AND mensaje = ?'
  ).bind(nombre, mensaje).first();

  if (!turno) return json({ error: 'Turno no encontrado' }, 404);

  // Autenticar: cancel_token válido O teléfono coincide (backward compat con reservas sin token)
  const tokenValido   = cancelToken && turno.cancel_token && cancelToken === turno.cancel_token;
  const telNorm       = telefono ? telefono.replace(/\D/g, '') : '';
  const dbTelNorm     = turno.telefono ? turno.telefono.replace(/\D/g, '') : '';
  const telValido     = telNorm.length >= 8 && dbTelNorm && dbTelNorm.endsWith(telNorm.slice(-8));
  const sinToken      = !turno.cancel_token; // reserva antigua, sin token

  if (!tokenValido && !(sinToken && telValido)) {
    return json({ error: 'No autorizado para cancelar este turno' }, 403);
  }

  await env.barberia_db.prepare(
    'DELETE FROM reservas WHERE LOWER(nombre) = LOWER(?) AND mensaje = ?'
  ).bind(nombre, mensaje).run();

  const [fecha, hora] = mensaje.split(' ');
  const bId   = barberoIdByNombre(turno.barbero);
  const calId = bId ? BARBEROS_CONFIG[bId]?.calendarId : null;

  waitUntil(Promise.all([
    (async () => {
      if (!calId || !turno.calendar_event_id || !env.GOOGLE_SERVICE_ACCOUNT) return;
      try {
        const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
        const tk = await getGoogleAccessToken(sa);
        await deleteCalendarEvent(calId, turno.calendar_event_id, tk);
      } catch {}
    })(),
    bId ? sendWhatsAppNotification(bId, { nombre, servicio: turno.servicio, fecha, hora }, env, 'cancelado').catch(() => {}) : Promise.resolve(),
  ]));

  return json({ ok: true });
}
```

- [ ] **Step 2: Actualizar onRequestPut para requerir cancel_token**

En `onRequestPut`, agregar la verificación de token antes de actualizar. Después de obtener `existing` (línea ~103), agregar:

```javascript
// Autenticar: cancel_token válido O teléfono coincide (backward compat)
const { cancel_token: bodyToken, telefono: bodyTel } = body;
const tokenValido  = bodyToken && existing.cancel_token && bodyToken === existing.cancel_token;
const telNorm      = bodyTel ? bodyTel.replace(/\D/g, '') : '';
const dbTelNorm    = existing.telefono ? existing.telefono.replace(/\D/g, '') : '';
const telValido    = telNorm.length >= 8 && dbTelNorm && dbTelNorm.endsWith(telNorm.slice(-8));
const sinToken     = !existing.cancel_token;

if (!tokenValido && !(sinToken && telValido)) {
  return json({ error: 'No autorizado para modificar este turno' }, 403);
}
```

Agregar `cancel_token` y `telefono` al SELECT existente (línea ~103):

```javascript
const existing = await env.barberia_db.prepare(
  'SELECT barbero, servicio, calendar_event_id, cancel_token, telefono FROM reservas WHERE LOWER(nombre) = LOWER(?) AND mensaje = ?'
).bind(nombre, old_mensaje).first();
```

- [ ] **Step 3: Verificar que cancelar con token correcto funciona**

```bash
# 1. Hacer una reserva y obtener el cancel_token:
TOKEN=$(curl -s -X POST http://localhost:8788/api/reserva \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test Auth","telefono":"3416000001","servicio":"Corte","barberoId":"lobo","fecha":"2/5/2026","hora":"11:00"}' \
  | jq -r '.cancel_token')

# 2. Intentar cancelar SIN token (debe dar 403):
curl -s -X DELETE "http://localhost:8788/api/mi-turno?nombre=Test+Auth&mensaje=2/5/2026+11:00"
# Esperado: {"error":"No autorizado para cancelar este turno"}

# 3. Cancelar CON token (debe funcionar):
curl -s -X DELETE "http://localhost:8788/api/mi-turno?nombre=Test+Auth&mensaje=2/5/2026+11:00&cancel_token=$TOKEN"
# Esperado: {"ok":true}
```

- [ ] **Step 4: Commit**

```bash
git add functions/api/mi-turno.js
git commit -m "security: requerir cancel_token o teléfono para cancelar/modificar turno"
```

---

## Task 7: Frontend — guardar y enviar cancel_token

**Files:**
- Modify: `public/js/main.js` (función de submit de reserva y cancelarTurno/showEditMode)

El frontend recibe el `cancel_token` en la respuesta del POST y debe guardarlo en cookie para usarlo en cancelaciones.

- [ ] **Step 1: Guardar cancel_token en cookie tras reserva exitosa**

En `main.js`, buscar donde se procesa la respuesta exitosa de la reserva (cerca de línea 770, donde se setean las cookies `gb_nombre` y `gb_tel`). Agregar:

```javascript
// Después de las líneas que setean gb_nombre y gb_tel:
if (data.cancel_token) {
  document.cookie = `gb_ct=${encodeURIComponent(data.cancel_token)}; max-age=${60*60*24*90}; SameSite=Lax; Secure; Path=/`;
}
```

- [ ] **Step 2: Leer cancel_token en cancelarTurno**

En la función `cancelarTurno(t)` (cerca de línea 928), actualizar el fetch para incluir el token:

```javascript
async function cancelarTurno(t) {
  const extra = document.getElementById('mi-turno-extra');
  extra.innerHTML = '<div class="mi-turno-loading">Cancelando...</div>';

  const ctCookie = document.cookie.match(/gb_ct=([^;]+)/);
  const cancelToken = ctCookie ? decodeURIComponent(ctCookie[1]) : '';
  const telCookie = document.cookie.match(/gb_tel=([^;]+)/);
  const tel = telCookie ? decodeURIComponent(telCookie[1]) : '';

  let url = `/api/mi-turno?nombre=${encodeURIComponent(t.nombre)}&mensaje=${encodeURIComponent(t.mensaje)}`;
  if (cancelToken) url += `&cancel_token=${encodeURIComponent(cancelToken)}`;
  else if (tel)    url += `&telefono=${encodeURIComponent(tel)}`;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.status === 403) {
      extra.innerHTML = '<div class="mi-turno-none">No autorizado. Confirmá tu teléfono para cancelar.</div>';
      return;
    }
    if (!res.ok) throw new Error();
    result.innerHTML = '<div class="mi-turno-none">Tu turno fue cancelado.</div>';
    document.cookie = 'gb_ct=; max-age=0; Path=/'; // limpiar token usado
  } catch {
    extra.innerHTML = '<div class="mi-turno-none">Error al cancelar. Intentá de nuevo.</div>';
  }
}
```

- [ ] **Step 3: Incluir cancel_token en el PUT de modificarTurno**

En la función `onRequestPut` del frontend (dentro de `showEditMode`, donde se hace el PUT), agregar `cancel_token` y `telefono` al body:

```javascript
// Buscar el fetch PUT en showEditMode (cerca de línea 1014)
const ctCookie  = document.cookie.match(/gb_ct=([^;]+)/);
const telCookie = document.cookie.match(/gb_tel=([^;]+)/);
const res = await fetch('/api/mi-turno', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre:       t.nombre,
    old_mensaje:  t.mensaje,
    new_fecha:    `${selectedDay.getDate()}/${selectedDay.getMonth()+1}/${selectedDay.getFullYear()}`,
    new_hora:     selectedSlot,
    cancel_token: ctCookie  ? decodeURIComponent(ctCookie[1])  : undefined,
    telefono:     telCookie ? decodeURIComponent(telCookie[1]) : undefined,
  }),
});
```

- [ ] **Step 4: Verificar flujo completo**

```bash
npx wrangler pages dev ./public
```

1. Hacer una reserva → verificar que `gb_ct` aparece en Application → Cookies del DevTools
2. Ir a "Mi turno", ver el turno, presionar "Cancelar turno"
3. Confirmar cancelación → debe funcionar sin errores

- [ ] **Step 5: Aplicar migración en producción**

```bash
wrangler d1 execute barberia-db --remote --file=./migrations/021_add_cancel_token.sql
```

- [ ] **Step 6: Deploy**

```bash
wrangler pages deploy ./public --project-name=barberia
```

- [ ] **Step 7: Commit**

```bash
git add public/js/main.js
git commit -m "feat: frontend guarda y envía cancel_token para cancelar/modificar turnos"
```

---

# FASE B — Backend Architecture

## Task 8: Unificar getSession() en handlers de admin

**Files:**
- Modify: `functions/admin/api/reservas.js`
- Modify: `functions/admin/api/stats.js`
- Modify: `functions/admin/api/agenda.js`

Los tres archivos tienen la query de sesión duplicada inline. `turno.js` ya usa `getSession()` correctamente.

- [ ] **Step 1: Actualizar reservas.js**

Reemplazar las líneas 1-11 de `functions/admin/api/reservas.js`:

```javascript
import { getToken } from './auth.js';           // ← ELIMINAR esta línea
// ...
const token = getToken(request);                // ← ELIMINAR
if (!token) return json({ error: 'No autorizado' }, 401);
const session = await env.barberia_db.prepare(  // ← ELIMINAR las 3 líneas del prepare
  "SELECT barbero_id, role FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')"
).bind(token).first();
if (!session) return json({ error: 'Sesión inválida' }, 401);
```

por:

```javascript
import { getSession } from './_session.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);
  // resto igual...
```

- [ ] **Step 2: Actualizar stats.js**

Reemplazar las líneas 1-14 de `functions/admin/api/stats.js` (mismo patrón):

```javascript
import { getToken } from './auth.js';           // ← reemplazar
// ...
```

por:

```javascript
import { getSession } from './_session.js';
import { DEFAULT_SCHEDULE, FERIADOS, SLOT_DURATION } from './_gcal.js';

const ARG_OFFSET_MS = -3 * 60 * 60 * 1000;

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: 'No autorizado' }, 401);
  // resto igual...
```

- [ ] **Step 3: Actualizar agenda.js**

Mismo patrón — reemplazar el bloque de verificación de sesión inline por `getSession()`.

- [ ] **Step 4: Verificar que el panel admin sigue funcionando**

```bash
npx wrangler pages dev ./public
```

Login en `/admin`, navegar a agenda y reservas, verificar que carga datos.

- [ ] **Step 5: Commit**

```bash
git add functions/admin/api/reservas.js functions/admin/api/stats.js functions/admin/api/agenda.js
git commit -m "refactor: unificar getSession() en todos los handlers admin"
```

---

## Task 9: Extraer checkOverlap a función compartida en _gcal.js

**Files:**
- Modify: `functions/admin/api/_gcal.js`
- Modify: `functions/api/reserva.js`
- Modify: `functions/api/mi-turno.js`
- Modify: `functions/admin/api/turno.js`

La lógica de overlap está copiada en 3 archivos con pequeñas diferencias. Si cambia la lógica (ej: servicios de duración variable), hay que actualizar en 3 lugares.

- [ ] **Step 1: Agregar checkOverlap a _gcal.js**

Al final de `functions/admin/api/_gcal.js`, agregar:

```javascript
/**
 * Verifica si un slot nuevo se superpone con reservas existentes.
 * @param {Object} env - Cloudflare env con binding barberia_db
 * @param {string} barberoNombre - Nombre del barbero (ej: "Lobo")
 * @param {string} fecha - Formato "D/M/YYYY" (ej: "1/5/2026")
 * @param {string} hora - Formato "HH:MM" (ej: "10:00")
 * @param {number} durMin - Duración del servicio en minutos
 * @param {Object} serviciosMap - Mapa servicio→duracionMin para calcular duración de existentes
 * @param {string|null} excludeMensaje - mensaje a excluir (para PUT — no comparar consigo mismo)
 * @returns {Promise<{overlap: boolean, conflicto: string|null}>}
 */
export async function checkOverlap(env, barberoNombre, fecha, hora, durMin, serviciosMap, excludeMensaje = null) {
  const [hNew, mNew] = hora.split(':').map(Number);
  const newStart = hNew * 60 + mNew;
  const newEnd   = newStart + durMin;

  let query = 'SELECT mensaje, servicio FROM reservas WHERE mensaje LIKE ? AND barbero = ?';
  const params = [`${fecha} %`, barberoNombre];
  if (excludeMensaje) {
    query += ' AND mensaje != ?';
    params.push(excludeMensaje);
  }

  const { results } = await env.barberia_db.prepare(query).bind(...params).all();

  for (const r of results) {
    const rHora = r.mensaje?.split(' ')[1];
    if (!rHora) continue;
    const [rh, rm] = rHora.split(':').map(Number);
    const rStart = rh * 60 + rm;
    const rEnd   = rStart + (serviciosMap[r.servicio] ?? SLOT_DURATION);
    if (newStart < rEnd && newEnd > rStart) {
      return { overlap: true, conflicto: `${rHora} · ${r.servicio}` };
    }
  }
  return { overlap: false, conflicto: null };
}
```

- [ ] **Step 2: Importar y usar checkOverlap en reserva.js**

En `functions/api/reserva.js`, línea 1, agregar `checkOverlap` al import:

```javascript
import { BARBEROS_CONFIG, SERVICIOS, sendWhatsAppNotification, getServicios, getGoogleAccessToken, createCalendarEvent, normalizeTel, checkOverlap } from '../admin/api/_gcal.js';
```

Reemplazar el bloque del for loop de overlap (líneas 34-47) por:

```javascript
const { overlap } = await checkOverlap(env, nombreBarbero, fecha, hora, durMin, serviciosMap);
if (overlap) {
  return res({ success: false, error: 'Ese horario ya fue tomado. Elegí otro.' }, 409, request);
}
```

- [ ] **Step 3: Importar y usar checkOverlap en mi-turno.js**

En `functions/api/mi-turno.js`, importar `checkOverlap` y reemplazar el for loop de overlap en `onRequestPut` (líneas 115-128):

```javascript
import { BARBEROS_CONFIG, sendWhatsAppNotification, deleteCalendarEvent, createCalendarEvent, getGoogleAccessToken, SLOT_DURATION, checkOverlap } from '../admin/api/_gcal.js';

// En onRequestPut, reemplazar:
const durMin = SERVICIOS_DUR[existing.servicio] || 30; // esta línea se mantiene como fallback
const sMap   = { ...SERVICIOS_DUR }; // usar el mapa local de duración
const { overlap, conflicto } = await checkOverlap(env, existing.barbero, new_fecha, new_hora, durMin, sMap, old_mensaje);
if (overlap) {
  return json({ error: 'Ese horario ya fue tomado. Elegí otro.' }, 409);
}
```

- [ ] **Step 4: Importar y usar checkOverlap en turno.js**

En `functions/admin/api/turno.js`, importar y reemplazar los dos for loops de overlap (en POST y PUT):

```javascript
import { BARBEROS_CONFIG, SLOT_DURATION, getServicios, getGoogleAccessToken, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, normalizeTel, checkOverlap } from './_gcal.js';

// En onRequestPost (reemplazar el for loop):
const { overlap, conflicto } = await checkOverlap(env, cfg.nombre, fecha, hora, duracion, serviciosMap);
if (overlap) {
  return json({ error: `Ese horario se superpone con un turno existente (${conflicto})` }, 409);
}

// En onRequestPut (reemplazar el for loop):
const { overlap: ov2, conflicto: c2 } = await checkOverlap(env, cfg.nombre, nuevaFecha, nuevaHora, duracion, serviciosMap, `${fecha} ${hora}`);
if (ov2) {
  return json({ error: `Ese horario se superpone con un turno existente (${c2})` }, 409);
}
```

- [ ] **Step 5: Verificar overlap sigue funcionando**

```bash
npx wrangler pages dev ./public
```

1. Hacer una reserva para lobo el 3/5/2026 a las 10:00
2. Intentar hacer otra reserva para lobo el 3/5/2026 a las 10:15 (Corte = 30 min, debe fallar)
3. Verificar mensaje "Ese horario ya fue tomado"

- [ ] **Step 6: Commit**

```bash
git add functions/admin/api/_gcal.js functions/api/reserva.js functions/api/mi-turno.js functions/admin/api/turno.js
git commit -m "refactor: extraer checkOverlap a función compartida en _gcal.js"
```

---

## Task 10: Remove hardcoded phones de _gcal.js

**Files:**
- Modify: `functions/admin/api/_gcal.js`

Los teléfonos de Felipe y Lisandro están en el código fuente. La tabla `barberos_config` en D1 ya tiene estos datos. `sendWhatsAppNotification` ya lee de D1 primero (fallback al hardcodeado). El fix es solo remover los teléfonos del fallback hardcodeado.

- [ ] **Step 1: Actualizar BARBEROS_CONFIG en _gcal.js**

Reemplazar las líneas 23-28 (el objeto `BARBEROS_CONFIG`):

```javascript
export const BARBEROS_CONFIG = {
  gebyano: { nombre: 'Gebyano', tel: null, calendarId: null,                     schedule: DEFAULT_SCHEDULE },
  lobo:    { nombre: 'Lobo',    tel: null, calendarId: null,                     schedule: DEFAULT_SCHEDULE },
  felipe:   { nombre: 'Felipe',   tel: null, calendarId: 'felipevalor7@gmail.com',  schedule: DEFAULT_SCHEDULE },
  lisandro: { nombre: 'Lisandro', tel: null, calendarId: 'blascolisandro@gmail.com', schedule: DEFAULT_SCHEDULE },
};
```

**Nota:** `sendWhatsAppNotification` lee el tel de D1 primero. Si D1 no tiene el tel, la notificación simplemente no se envía. Verificar en D1 que los tels de Gebyano y Lobo estén en la tabla `barberos_config`.

- [ ] **Step 2: Verificar que barberos_config tiene los tels en D1**

```bash
wrangler d1 execute barberia-db --local --command="SELECT id, nombre, tel FROM barberos_config"
```

Si los tels faltan, insertarlos:

```bash
wrangler d1 execute barberia-db --local --command="UPDATE barberos_config SET tel = '+5493416021009' WHERE id = 'gebyano'"
wrangler d1 execute barberia-db --local --command="UPDATE barberos_config SET tel = '+5493412754502' WHERE id = 'lobo'"
wrangler d1 execute barberia-db --local --command="UPDATE barberos_config SET tel = '+5493416513207' WHERE id = 'felipe'"
wrangler d1 execute barberia-db --local --command="UPDATE barberos_config SET tel = '+5493412751752' WHERE id = 'lisandro'"
```

Y en producción:

```bash
wrangler d1 execute barberia-db --remote --command="SELECT id, nombre, tel FROM barberos_config"
# Si faltan, ejecutar los UPDATE con --remote
```

- [ ] **Step 3: Verificar que WA notifications siguen llegando**

```bash
npx wrangler pages dev ./public
```

Hacer una reserva de prueba → verificar en los logs del wrangler que `sendWhatsAppNotification` no falla (puede fallar por el apikey de CallMeBot no configurado en local, eso es esperado).

- [ ] **Step 4: Commit**

```bash
git add functions/admin/api/_gcal.js
git commit -m "security: remover teléfonos hardcodeados del código fuente, usar D1 como fuente"
```

---

## Task 11: Rate limiting en endpoints públicos de escritura

**Files:**
- Create: `migrations/022_api_rate_limits.sql`
- Create: `functions/api/_ratelimit.js`
- Modify: `functions/api/reserva.js`
- Modify: `functions/api/mi-turno.js`
- Modify: `functions/api/turnos.js`

Sin rate limiting, cualquiera puede saturar la agenda con reservas programáticas o enumerar clientes.

- [ ] **Step 1: Crear migrations/022_api_rate_limits.sql**

```sql
CREATE TABLE IF NOT EXISTS api_rate_limits (
  ip      TEXT    NOT NULL,
  endpoint TEXT   NOT NULL,
  count   INTEGER NOT NULL DEFAULT 1,
  reset_at TEXT   NOT NULL,
  PRIMARY KEY (ip, endpoint)
);
```

- [ ] **Step 2: Aplicar migración en local**

```bash
wrangler d1 execute barberia-db --local --file=./migrations/022_api_rate_limits.sql
```

- [ ] **Step 3: Crear functions/api/_ratelimit.js**

```javascript
/**
 * Rate limiting simple basado en D1.
 * Límites por defecto: 10 requests por minuto por IP y endpoint.
 * 
 * @param {Request} request
 * @param {Object} env - Cloudflare env con binding barberia_db
 * @param {string} endpoint - Identificador del endpoint (ej: 'reserva', 'mi-turno-get')
 * @param {number} maxRequests - Máximo de requests permitidos en la ventana
 * @param {number} windowSeconds - Duración de la ventana en segundos
 * @returns {Promise<boolean>} true si debe bloquearse, false si pasa
 */
export async function isRateLimited(request, env, endpoint, maxRequests = 10, windowSeconds = 60) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const row = await env.barberia_db.prepare(
      'SELECT count, reset_at FROM api_rate_limits WHERE ip = ? AND endpoint = ?'
    ).bind(ip, endpoint).first();

    const now = new Date();

    if (row) {
      // Si el window expiró, resetear
      if (new Date(row.reset_at) <= now) {
        await env.barberia_db.prepare(
          'DELETE FROM api_rate_limits WHERE ip = ? AND endpoint = ?'
        ).bind(ip, endpoint).run();
      } else if (row.count >= maxRequests) {
        return true; // bloqueado
      }
    }

    const resetAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();
    await env.barberia_db.prepare(`
      INSERT INTO api_rate_limits (ip, endpoint, count, reset_at) VALUES (?, ?, 1, ?)
      ON CONFLICT(ip, endpoint) DO UPDATE SET count = count + 1
    `).bind(ip, endpoint, resetAt).run();

    return false;
  } catch {
    return false; // si falla la tabla, no bloquear (fail open)
  }
}
```

- [ ] **Step 4: Aplicar rate limiting en reserva.js**

En `functions/api/reserva.js`, agregar el import:

```javascript
import { isRateLimited } from './_ratelimit.js';
```

Al inicio de `onRequestPost`, antes del `try`:

```javascript
export async function onRequestPost({ request, env, waitUntil }) {
  if (await isRateLimited(request, env, 'reserva-post', 5, 60)) {
    return res({ success: false, error: 'Demasiadas solicitudes. Esperá un momento.' }, 429, request);
  }
  try {
    // ... código existente
```

- [ ] **Step 5: Aplicar rate limiting en mi-turno.js**

En `functions/api/mi-turno.js`, importar y agregar al inicio de cada handler:

```javascript
import { BARBEROS_CONFIG, sendWhatsAppNotification, deleteCalendarEvent, createCalendarEvent, getGoogleAccessToken, SLOT_DURATION, checkOverlap } from '../admin/api/_gcal.js';
import { isRateLimited } from './_ratelimit.js';

export async function onRequestGet({ request, env }) {
  if (await isRateLimited(request, env, 'mi-turno-get', 15, 60)) {
    return json({ error: 'Demasiadas solicitudes. Esperá un momento.' }, 429);
  }
  // ... código existente

export async function onRequestDelete({ request, env, waitUntil }) {
  if (await isRateLimited(request, env, 'mi-turno-delete', 5, 300)) { // 5 por 5 min
    return json({ error: 'Demasiadas solicitudes. Esperá un momento.' }, 429);
  }
  // ... código existente

export async function onRequestPut({ request, env, waitUntil }) {
  if (await isRateLimited(request, env, 'mi-turno-put', 5, 300)) {
    return json({ error: 'Demasiadas solicitudes. Esperá un momento.' }, 429);
  }
  // ... código existente
```

- [ ] **Step 6: Aplicar rate limiting en turnos.js**

En `functions/api/turnos.js`:

```javascript
import { isRateLimited } from './_ratelimit.js';

export async function onRequestGet({ request, env }) {
  if (await isRateLimited(request, env, 'turnos-get', 30, 60)) {
    return json({ error: 'Demasiadas solicitudes.' }, 429);
  }
  // ... código existente
```

- [ ] **Step 7: Verificar que el formulario sigue funcionando (no se bloquea en uso normal)**

```bash
npx wrangler pages dev ./public
```

Hacer 5+ reservas seguidas (simular spam): la 6ta debe devolver 429. Verificar que un solo usuario legítimo nunca llega al límite (5 reservas por minuto es más que suficiente para cualquier cliente real).

- [ ] **Step 8: Aplicar migración en producción y deploy**

```bash
wrangler d1 execute barberia-db --remote --file=./migrations/022_api_rate_limits.sql
wrangler pages deploy ./public --project-name=barberia
```

- [ ] **Step 9: Commit**

```bash
git add migrations/022_api_rate_limits.sql functions/api/_ratelimit.js functions/api/reserva.js functions/api/mi-turno.js functions/api/turnos.js
git commit -m "feat: rate limiting en endpoints públicos /api/reserva, /api/mi-turno, /api/turnos"
```

---

# FASE C — Frontend Modularization

## Task 12: Crear config.js y cambiar a ES modules

**Files:**
- Create: `public/js/config.js`
- Modify: `public/index.html`
- Modify: `public/js/ui-utils.js` (agregar export)

Sin este task, los módulos siguientes no se pueden extraer. ES modules (`type="module"`) son soportados por todos los browsers modernos y no requieren bundler.

- [ ] **Step 1: Crear public/js/config.js con todas las constantes del frontend**

```javascript
// public/js/config.js
// Fuente de verdad del frontend para constantes de configuración.
// El fallback de BARBEROS se sobreescribe desde /api/barberos en DOMContentLoaded.

export const SLOT_DURATION = 30;
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

export const DEFAULT_SCHEDULE = {
  1: { start: 9, end: 20 },
  2: { start: 9, end: 20 },
  3: { start: 9, end: 20 },
  4: { start: 9, end: 20 },
  5: { start: 9, end: 20 },
  6: { start: 9, end: 17 },
};

// Duraciones por servicio para cálculo de slots en el UI
export const SERVICIOS = {
  'Corte':             { duracion: 30 },
  'Corte + Barba':     { duracion: 45 },
  'Barba':             { duracion: 15 },
  'Afeitado':          { duracion: 15 },
  'Niños 10-13 años':  { duracion: 30 },
  'Niños 0-9 años':    { duracion: 30 },
};

// Fallback usado si /api/barberos falla. Se sobreescribe en runtime.
export const BARBEROS_FALLBACK = [
  { id: 'gebyano', nombre: 'Gebyano', tel: '5493416021009', disponible: false, calendarId: null,                      schedule: DEFAULT_SCHEDULE },
  { id: 'lobo',    nombre: 'Lobo',    tel: '5493412754502', disponible: true,  calendarId: null,                      schedule: DEFAULT_SCHEDULE },
  { id: 'felipe',  nombre: 'Felipe',  tel: '5493416513207', disponible: true,  calendarId: 'felipevalor7@gmail.com',  schedule: DEFAULT_SCHEDULE },
  { id: 'lisandro',nombre: 'Lisandro',tel: '5493412751752', disponible: true,  calendarId: 'blascolisandro@gmail.com',schedule: DEFAULT_SCHEDULE },
  { id: 'ns',      nombre: 'NS',      tel: null,            disponible: false, calendarId: null,                      schedule: null },
  { id: 'bql',     nombre: 'BQL',     tel: null,            disponible: false, calendarId: null,                      schedule: null },
];

export const ESPECIALIDADES = {
  gebyano: 'Degradés y estilos',
  lobo:    'Clásicos y barba',
  felipe:  'Degradés y barba',
  ns:      'Próximamente',
  bql:     'Próximamente',
};

export const GEBYANO_TEL = '5493416021009';
```

- [ ] **Step 2: Actualizar ui-utils.js para usar export (ES module)**

Reemplazar el contenido de `public/js/ui-utils.js`:

```javascript
// public/js/ui-utils.js
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatFechaLabel(fechaStr) {
  const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const [d, m, y] = fechaStr.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]}`;
}
```

- [ ] **Step 3: Actualizar index.html para ES modules**

En `public/index.html`, reemplazar línea 323:

```html
<script src="js/ui-utils.js"></script>
<script src="js/main.js?v=1.2"></script>
```

por:

```html
<script type="module" src="js/main.js?v=2.0"></script>
```

**Nota:** Con `type="module"`, el script ya no necesita el tag separado de `ui-utils.js` porque `main.js` lo importará directamente.

- [ ] **Step 4: Verificar que el sitio sigue cargando**

```bash
npx wrangler pages dev ./public
```

Abrir el sitio. Si hay errores de "module not found" en la consola, son esperados porque `main.js` aún no importa los módulos. El sitio puede quedar roto hasta completar Tasks 13-16. Por eso este task debe hacerse junto con Task 13-16 en el mismo branch sin deploy intermedio.

- [ ] **Step 5: Commit (sin deploy todavía)**

```bash
git add public/js/config.js public/js/ui-utils.js public/index.html
git commit -m "refactor: agregar config.js y preparar para ES modules"
```

---

## Task 13: Extraer cursor.js y catalogo.js

**Files:**
- Create: `public/js/cursor.js`
- Create: `public/js/catalogo.js`
- Modify: `public/js/main.js` (eliminar estas funciones, agregar imports)

- [ ] **Step 1: Crear public/js/cursor.js**

Cortar las funciones `initCustomCursor`, `initHamburgerMenu`, `initNavScroll`, `initScrollReveal`, `initTextScramble`, `initMagneticButtons` de `main.js` (líneas 95-328) y pegarlas en el nuevo archivo:

```javascript
// public/js/cursor.js
// Animaciones, cursor personalizado y efectos de scroll.
// Sin dependencias externas.

export function initCustomCursor() {
  if (window.matchMedia('(hover: none)').matches) return;
  // ... [pegar el contenido existente de la función]
}

export function initHamburgerMenu() {
  // ... [pegar el contenido existente]
}

export function initNavScroll() {
  // ... [pegar el contenido existente]
}

export function initScrollReveal() {
  // ... [pegar el contenido existente]
}

export function initTextScramble() {
  // ... [pegar el contenido existente]
}

export function initMagneticButtons() {
  // ... [pegar el contenido existente]
}
```

- [ ] **Step 2: Crear public/js/catalogo.js**

Cortar las funciones `renderCatalogo`, `renderPromos`, `updateServicioDropdown` (si existe) de `main.js` y pegarlas:

```javascript
// public/js/catalogo.js
import { escapeHtml } from './ui-utils.js';

export function renderCatalogo(items) {
  // ... [pegar el contenido existente, usando escapeHtml en los campos]
}

export function renderPromos(promos) {
  // ... [pegar el contenido existente, usando escapeHtml en los campos]
}

export function updateServicioDropdown(items) {
  // ... [pegar el contenido existente si la función existe en main.js]
}
```

- [ ] **Step 3: Actualizar main.js — agregar imports, quitar funciones extraídas**

Al inicio de `main.js`, agregar:

```javascript
import { initCustomCursor, initHamburgerMenu, initNavScroll, initScrollReveal, initTextScramble, initMagneticButtons } from './cursor.js';
import { renderCatalogo, renderPromos, updateServicioDropdown } from './catalogo.js';
```

Eliminar del archivo las funciones que se movieron.

- [ ] **Step 4: Verificar en browser**

```bash
npx wrangler pages dev ./public
```

Verificar que el cursor personalizado funciona, el menú hamburguesa abre/cierra, el catálogo de servicios carga, las promos se muestran.

- [ ] **Step 5: Commit**

```bash
git add public/js/cursor.js public/js/catalogo.js public/js/main.js
git commit -m "refactor: extraer cursor.js y catalogo.js desde main.js"
```

---

## Task 14: Extraer calendar-picker.js

**Files:**
- Create: `public/js/calendar-picker.js`
- Modify: `public/js/main.js`

`initCalendarPicker` es la función más compleja (~230 líneas). Se extrae completa.

- [ ] **Step 1: Crear public/js/calendar-picker.js**

Cortar la función `initCalendarPicker` completa de `main.js` (desde la línea 478 hasta donde termina la función, aprox. línea 828) y las funciones helper `fetchD1BusySlots`, `buildGcalUrl`, `renderEditSlots`:

```javascript
// public/js/calendar-picker.js
// Day picker + slot picker para el formulario de reserva.
// Emite evento 'barberoSeleccionado' para comunicarse con reserva.js.
import { escapeHtml, formatFechaLabel } from './ui-utils.js';
import { SERVICIOS, DEFAULT_SCHEDULE } from './config.js';

async function fetchD1BusySlots(barberoNombre, day, barberoId) {
  // ... [pegar el contenido existente]
}

function buildGcalUrl({ servicio, barbero, fecha, hora, duracion }) {
  // ... [pegar el contenido existente]
}

export async function initCalendarPicker() {
  // ... [pegar el contenido completo existente]
}
```

- [ ] **Step 2: Actualizar main.js**

Agregar import:

```javascript
import { initCalendarPicker } from './calendar-picker.js';
```

Eliminar las funciones extraídas de `main.js`.

- [ ] **Step 3: Verificar que el picker de días y slots funciona**

```bash
npx wrangler pages dev ./public
```

1. Seleccionar un barbero → deben aparecer los días disponibles
2. Seleccionar un día → deben aparecer los slots
3. Seleccionar un slot → el botón de confirmar debe habilitarse

- [ ] **Step 4: Commit**

```bash
git add public/js/calendar-picker.js public/js/main.js
git commit -m "refactor: extraer initCalendarPicker a calendar-picker.js"
```

---

## Task 15: Extraer reserva.js

**Files:**
- Create: `public/js/reserva.js`
- Modify: `public/js/main.js`

`initReservaForm` maneja el formulario de reserva, la lógica de barberos, y la confirmación post-reserva.

- [ ] **Step 1: Crear public/js/reserva.js**

```javascript
// public/js/reserva.js
// Lógica del formulario de reserva: selección de barbero,
// submit del form, confirmación y WA redirect.
import { escapeHtml, formatFechaLabel } from './ui-utils.js';
import { BARBEROS_FALLBACK, ESPECIALIDADES, GEBYANO_TEL, SERVICIOS } from './config.js';

// Referencia compartida que se actualiza desde main.js cuando llega /api/barberos
export let BARBEROS = [...BARBEROS_FALLBACK];
export function setBarberos(nuevos) { BARBEROS = nuevos; }

export function initReservaForm() {
  // ... [pegar el contenido completo de initReservaForm]
}

export function updateFormSteps(activeStep) {
  // ... [pegar el contenido existente]
}

function getWaFallbackUrl(barbero) {
  // ... [pegar el contenido existente]
}
```

- [ ] **Step 2: Actualizar main.js**

```javascript
import { initReservaForm, updateFormSteps, setBarberos, BARBEROS } from './reserva.js';

// En DOMContentLoaded, reemplazar la actualización de BARBEROS:
try {
  const r = await barberosFetch;
  if (r?.ok) {
    const data = await r.json();
    setBarberos(data); // en vez de BARBEROS = data
  }
} catch {}
```

- [ ] **Step 3: Verificar formulario de reserva completo**

```bash
npx wrangler pages dev ./public
```

1. Seleccionar barbero → cards deben renderizarse correctamente
2. Seleccionar servicio → dropdown debe actualizar precios
3. Completar nombre y teléfono
4. Seleccionar día y hora
5. Submit → debe abrir WhatsApp con el mensaje correcto

- [ ] **Step 4: Commit**

```bash
git add public/js/reserva.js public/js/main.js
git commit -m "refactor: extraer initReservaForm a reserva.js"
```

---

## Task 16: Extraer mi-turno-section.js y finalizar main.js como entry point

**Files:**
- Create: `public/js/mi-turno-section.js`
- Modify: `public/js/main.js` (solo DOMContentLoaded + imports)

- [ ] **Step 1: Crear public/js/mi-turno-section.js**

```javascript
// public/js/mi-turno-section.js
// Sección "Mi turno": buscar, ver, cancelar y modificar turno existente.
import { escapeHtml, formatFechaLabel } from './ui-utils.js';
import { BARBEROS_FALLBACK, DEFAULT_SCHEDULE } from './config.js';

export function initMiTurno() {
  // ... [pegar el contenido completo de initMiTurno desde main.js]
}
```

**Nota sobre el naming:** Se usa `mi-turno-section.js` (no `mi-turno.js`) para evitar confusión con `functions/api/mi-turno.js` del backend.

- [ ] **Step 2: main.js queda como entry point puro**

`main.js` debe quedar así al final:

```javascript
// public/js/main.js
// Entry point de la aplicación.
// Solo imports y DOMContentLoaded. Toda la lógica está en los módulos.
import { initCustomCursor, initHamburgerMenu, initNavScroll, initScrollReveal, initTextScramble, initMagneticButtons } from './cursor.js';
import { renderCatalogo, renderPromos, updateServicioDropdown } from './catalogo.js';
import { initReservaForm, setBarberos } from './reserva.js';
import { initCalendarPicker } from './calendar-picker.js';
import { initMiTurno } from './mi-turno-section.js';

document.addEventListener('DOMContentLoaded', async () => {
  const barberosFetch  = fetch('/api/barberos').catch(() => null);
  const catalogoFetch  = fetch('/api/catalogo').catch(() => null);
  const promosFetch    = fetch('/api/promos').catch(() => null);

  initCustomCursor();
  initNavScroll();
  initScrollReveal();
  initTextScramble();
  initMagneticButtons();
  initCustomSelect();
  initHamburgerMenu();

  try {
    const r = await barberosFetch;
    if (r?.ok) setBarberos(await r.json());
  } catch {}

  try {
    const r = await catalogoFetch;
    if (r?.ok) {
      const items = await r.json();
      renderCatalogo(items);
      updateServicioDropdown(items);
    }
  } catch {}

  try {
    const r = await promosFetch;
    if (r?.ok) renderPromos(await r.json());
  } catch {}

  initReservaForm();
  initCalendarPicker();
  initMiTurno();
});
```

**Nota:** `initCustomSelect` queda en `main.js` si es pequeña. Si supera las 50 líneas, extraer también.

- [ ] **Step 3: Verificar el sitio completo funciona**

```bash
npx wrangler pages dev ./public
```

Flujo completo:
1. Sitio carga, cursor personalizado funciona
2. Catálogo se renderiza
3. Hacer reserva completa (barbero → servicio → día → hora → confirmar)
4. Verificar WhatsApp se abre con el mensaje correcto
5. Ir a "Mi turno", buscar por nombre, ver turno
6. Cancelar el turno (debe requerir cookie de cancel_token)

- [ ] **Step 4: Commit**

```bash
git add public/js/mi-turno-section.js public/js/main.js
git commit -m "refactor: extraer initMiTurno a mi-turno-section.js, main.js queda como entry point"
```

---

## Task 17: Split style.css — extraer reserva.css

**Files:**
- Create: `public/css/reserva.css`
- Modify: `public/css/style.css` (eliminar secciones extraídas)
- Modify: `public/index.html` (agregar link a reserva.css)

`style.css` tiene 1631 líneas. Las secciones de reserva comienzan en la línea 597 (`/* ── Mi turno ── */`). Las secciones 1319 en adelante (Social Proof, Barbero Cards, Form Steps, Slots Fallback, Submit button) son todas parte del sistema de reserva.

- [ ] **Step 1: Identificar el bloque a extraer**

Las líneas a mover a `reserva.css` son desde la línea 597 hasta el final del archivo (línea 1631). Verificar con:

```bash
sed -n '597,1631p' public/css/style.css | head -5
# Debe mostrar: /* ── Mi turno ── */
```

- [ ] **Step 2: Crear public/css/reserva.css**

Copiar las líneas 597-1631 de `style.css` al nuevo archivo `reserva.css`. Estas son las secciones:
- `/* ── Mi turno ── */` (línea 597)
- `/* ── Social Proof ── */` (línea 1319)
- `/* ── Barbero Cards ── */` (línea 1405)
- `/* ── Form Steps Progress ── */` (línea 1484)
- `/* ── Slots Fallback ── */` (línea 1578)
- `/* ── Submit button incomplete state ── */` (línea 1610)

El archivo `reserva.css` empieza directamente con `/* ── Mi turno ── */`, sin `:root` (ese queda en `style.css`).

- [ ] **Step 3: Eliminar esas líneas de style.css**

Dejar `style.css` solo hasta la línea 596. Verificar que termina con una sección cohesiva de la landing page.

- [ ] **Step 4: Agregar link en index.html**

En `public/index.html`, después del link de `style.css`:

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/reserva.css">
```

- [ ] **Step 5: Verificar que el sitio se ve igual**

```bash
npx wrangler pages dev ./public
```

Revisar visualmente:
- Landing page: hero, gallery, catálogo, footer
- Formulario de reserva: barbero cards, service dropdown, day picker, slot picker, botón confirmar
- Sección "Mi turno": card de turno, botones editar/cancelar
- Panel admin (si aplica)

- [ ] **Step 6: Deploy final de Fase C**

```bash
wrangler pages deploy ./public --project-name=barberia
```

- [ ] **Step 7: Commit**

```bash
git add public/css/reserva.css public/css/style.css public/index.html
git commit -m "refactor: separar reserva.css de style.css (1631L → ~600L + ~1000L)"
```

---

## Self-Review

### Spec coverage

| Issue | Task |
|-------|------|
| C-1: cancelación sin auth | Tasks 4, 5, 6, 7 |
| C-2: passwords plaintext | Task 1 |
| C-3: XSS innerHTML | Task 3 |
| C-4: CORS wildcard | Task 2 |
| H-1: main.js God file | Tasks 12-16 |
| H-2: constantes triplicadas | Tasks 9, 12 |
| H-3: sin rate limiting | Task 11 |
| H-4: style.css > 800L | Task 17 |
| H-5: stats.js 314L | Incluido en Task 8 (getSession) — el extract de helpers es una mejora futura, la deuda no bloquea Fase 2 |
| H-6: getSession duplicado | Task 8 |
| H-7: teléfonos hardcodeados | Task 10 |

### Gaps

- **H-5 stats.js helpers**: No tiene una task dedicada. El getSession ya se unifica en Task 8. El extract de los query builders es mejora futura, no bloquea nada.
- **Migración remota Task 4**: La task incluye solo la migración local. Recordar aplicar en remote antes del deploy de Fase A.
- **Cookie Secure flag en gb_ct (Task 7)**: Ya se agrega el flag `Secure` en el código propuesto. ✓

### Placeholder scan
Ninguna task tiene "TBD" ni "implement later". Las secciones marcadas con `// ... [pegar el contenido existente]` en Tasks 13-16 están explícitamente documentadas como copy-paste del código ya existente en main.js — no son placeholders, son instrucciones de movimiento de código.

### Type consistency
No hay inconsistencias de naming cross-tasks. `checkOverlap` se exporta en Task 9 y se importa en Tasks 9 (misma task). `getSession` se importa de `_session.js` en todos los handlers de Task 8. `escapeHtml` se define en Task 3, se exporta en Task 12, y se importa en Tasks 13-16.
