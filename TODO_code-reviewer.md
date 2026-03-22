# TODO — Code Review Findings
> Generado por revisión exhaustiva del codebase. Cada ítem tiene severidad, ubicación exacta y descripción del problema.

---

## 🔴 CRÍTICO

- [x] **[CRÍTICO] `agenda.html` — barbero-select fallback hardcodeado a `'gebyano'`**
  - **Archivo**: `public/admin/agenda.html` línea ~438
  - **Problema**: `sel.value = sessionBarbero || 'gebyano'` — si `sessionBarbero` no está seteado, el owner guarda turnos para gebyano sin querer. Misma clase de bug que el ya corregido en `horarios.html`.
  - **Fix**: Eliminar el fallback. `sel.value = sessionBarbero;` sin `|| 'gebyano'`.

---

## 🟠 ALTO

- [x] **[ALTO] Sin rate limiting en `/admin/api/auth`**
  - **Archivo**: `functions/admin/api/auth.js`
  - **Problema**: El endpoint de login no limita intentos fallidos. Permite fuerza bruta ilimitada contra contraseñas de barberos.
  - **Fix**: Implementar counter en KV (`login_fails:{ip}`) con TTL de 15 min; bloquear tras 5 intentos.

- [x] **[ALTO] Contraseñas en plaintext en variable de entorno**
  - **Archivo**: `functions/admin/api/auth.js` — lee `env.ADMIN_PASSWORDS`
  - **Problema**: Las contraseñas se guardan en texto plano en el secret de Cloudflare. Si se filtra el env, todas las cuentas quedan expuestas.
  - **Fix**: Guardar hashes bcrypt/SHA-256 en el secret y comparar con hash en el Worker.

- [x] **[ALTO] Sin protección CSRF en endpoints admin que modifican estado**
  - **Archivos**: `functions/admin/api/reservas.js`, `recurrentes.js`, `horarios.js`, `config.js`
  - **Problema**: POST/PUT/DELETE admin no validan `Origin` ni usan tokens CSRF. Un sitio malicioso puede hacer requests autenticados si el admin tiene sesión activa.
  - **Fix**: Verificar `request.headers.get('Origin')` contra dominio propio, o exigir header `X-Admin-Request: 1` en todos los endpoints mutantes.

---

## 🟡 MEDIO

- [ ] **[MEDIO] Constantes duplicadas en múltiples archivos**
  - **Archivos**: `public/js/main.js`, `public/js/mi-turno.js`, `functions/admin/api/_gcal.js`, `functions/api/turnos.js`
  - **Problema**: `SERVICIOS`, `DEFAULT_SCHEDULE`, `SLOT_DURATION` están definidos en 3-4 lugares distintos. Si cambia la duración de un servicio, hay que actualizar en todos lados y es fácil que queden desincronizados.
  - **Fix**: `_gcal.js` ya es la fuente de verdad para el Worker. Para el frontend, los servicios deberían venir de un endpoint (ya existe `/admin/api/config`) en lugar de estar hardcodeados en `main.js` y `mi-turno.js`.

- [ ] **[MEDIO] `BARBEROS_CONFIG` duplicado: hardcodeado en `_gcal.js` + tabla D1**
  - **Archivo**: `functions/admin/api/_gcal.js` líneas 23-27
  - **Problema**: `BARBEROS_CONFIG` hardcodea nombres, teléfonos y calendarIds. La tabla `barberos_config` en D1 guarda lo mismo. El código hace fallback al hardcodeado, lo que significa que si se cambia en D1 pero no en el código, puede usarse el valor stale.
  - **Fix**: Eliminar gradualmente `BARBEROS_CONFIG` hardcodeado; hacer que todas las funciones lean siempre de D1 primero (como ya hace `sendWhatsAppNotification`).

- [x] **[MEDIO] Dead code en `checkFeriado` — variables `d`, `m`, `y` nunca usadas**
  - **Archivo**: `functions/admin/api/_gcal.js` línea 81
  - **Código**: `const [d, m, y] = fecha.split('/').map(Number);` — las variables se desestructuran pero nunca se usan en la función.
  - **Fix**: Eliminar la línea. La comparación usa directamente `f.fecha === fecha` (string).

- [x] **[MEDIO] `agenda.html` — dos funciones `renderSlots` casi idénticas**
  - **Archivo**: `public/admin/agenda.html`
  - **Problema**: Hay dos copias casi idénticas de la lógica de render de slots: una para el modal "agregar turno" y otra para "editar turno". Cualquier cambio hay que hacerlo dos veces.
  - **Fix**: Extraer una única función `renderSlots(slots, targetElementId, onSelect)` reutilizable.

- [x] **[MEDIO] `recurrentes.html` — `selectDia()` llamado antes de que el DOM del modal esté renderizado** *(falso positivo — innerHTML es síncrono, no hay race condition)*
  - **Archivo**: `public/admin/recurrentes.html`
  - **Problema**: En `agendar()`, se llama `selectDia(fechaInicial)` inmediatamente después de hacer `innerHTML = ...` con los chips. Si `selectDia` hace un `querySelector` sobre el chip, puede no encontrarlo si el render no fue síncrono.
  - **Fix**: Envolver el `selectDia()` inicial en `requestAnimationFrame(() => selectDia(fechaInicial))` o hacer que `agendar()` use `await` con una promesa que resuelva después del render.

- [x] **[MEDIO] Sesiones sin refresh — expiran a las 24hs sin renovación**
  - **Archivo**: `functions/admin/api/auth.js`
  - **Problema**: Las sesiones se crean con `expires_at = datetime('now', '+1 day')` sin ningún mecanismo de renovación. Un admin activo será desconectado a las 24hs exactas de haber logueado.
  - **Fix**: Actualizar `expires_at` en cada request autenticado exitoso (`UPDATE admin_sessions SET expires_at = datetime('now', '+1 day') WHERE token = ?`).

---

## 🔵 BAJO

- [x] **[BAJO] `horarios.html` — inicialización de barbero-select inconsistente con otros admin pages**
  - **Archivo**: `public/admin/horarios.html` (recién corregido)
  - **Nota**: Ya corregido en esta sesión. Este ítem es para recordar verificar el patrón en cualquier página admin nueva que se cree.
  - **Patrón correcto**: `sel.value = sessionBarbero; sel.addEventListener('change', load);`

- [x] **[BAJO] `turnos.js` — fallback de servicios no incluye nombres canónicos de servicios nuevos**
  - **Archivo**: `functions/api/turnos.js` líneas 8-11
  - **Problema**: `SERVICIOS_DUR_FALLBACK` tiene `'Niños 10-13 años': 30` y `'Niños 0-9 años': 30`, pero `_gcal.js` tiene solo `'Niños': 30`. Si se agrega un servicio en D1 con nombre diferente, el fallback devuelve `undefined` y se usa `SLOT_DURATION` (30 min) por defecto.
  - **Fix**: Sincronizar nombres de servicios en fallback con los nombres canónicos de `_gcal.js::SERVICIOS`, o eliminar el fallback estático y siempre ir a D1.

- [x] **[BAJO] `_gcal.js::generateSlots` no valida que `schedule[dow]` exista antes de acceder**
  - **Archivo**: `functions/admin/api/_gcal.js` línea 161
  - **Código actual**: `const s = schedule[dow]; if (!s) return [];` — esto sí está manejado.
  - **Nota**: Ya protegido. Ítem cancelado — sin acción requerida. ✅

- [x] **[BAJO] Fechas en `FERIADOS` usan formato `d/m/yyyy` sin padding — inconsistente con comparaciones**
  - **Archivo**: `functions/admin/api/_gcal.js` líneas 41-77
  - **Problema**: Las fechas usan `'1/1/2026'` (sin cero inicial). La comparación `f.fecha === fecha` funciona siempre que el caller también use ese formato, pero si algún caller usa `'01/01/2026'` la comparación falla silenciosamente.
  - **Fix**: Normalizar todo a formato sin padding (ya es el caso), o agregar un helper `normalizeFecha` que garantice el formato antes de comparar.

- [x] **[BAJO] `recurrentes.js` — búsqueda de historial por `nombre` en lugar de ID**
  - **Archivo**: `functions/admin/api/recurrentes.js` línea 25
  - **Código**: `SELECT nombre, MAX(fecha) ... GROUP BY nombre` — si dos clientes tienen el mismo nombre, el historial se mezcla.
  - **Fix**: Agregar campo `cliente_id` a `reservas` (o al menos un lookup por nombre+barbero), y vincular `clientes_recurrentes` con reservas por ID.

- [x] **[BAJO] Google Calendar — `getCalendarEvents` usa fecha local como string pero convierte a `Date` para calcular duración**
  - **Archivo**: `functions/api/turnos.js` línea 57
  - **Código**: `const duracion = Math.round((new Date(ev.end) - new Date(ev.start)) / 60000);` — esto convierte ISO strings a UTC. Funciona correctamente para calcular duración (diff es invariante a timezone), pero puede confundir a futuros mantenedores.
  - **Fix**: Agregar comentario explicando que el diff de timestamps es correcto independientemente del timezone.

---

## ✅ YA CORREGIDO EN ESTA SESIÓN

- [x] `horarios.html` — barbero-select no inicializaba `sel.value = sessionBarbero` para owner
- [x] `recurrentes.html` — `getProximosDias` usaba hardcoded "skip domingo" en vez de `schedule[dow]`
- [x] `recurrentes.js` — `proximo_turno` no salteaba días no laborables del barbero
- [x] `turnos.js` — duraciones de servicios hardcodeadas; ahora lee de D1 via `getServicios()`
- [x] `_gcal.js` — faltaba el 23/3/2026 (puente turístico) en `FERIADOS`
- [x] DB remote — override stale `travaja=1` para felipe/24-3-2026 eliminado
