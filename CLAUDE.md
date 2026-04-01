# CLAUDE.md — Barbería Gebyanos

Contexto del proyecto para Claude Code. Leé esto antes de tocar cualquier archivo.

---

## Qué es este proyecto

Landing page premium para **Barbería Gebyanos** (1 de Mayo 1687, Rosario).
Desarrollado por **Valor Solutions**. Sitio live: https://barberia-d8q.pages.dev/

El objetivo es simple: que un cliente entre al sitio, elija barbero y horario, y llegue directo al WhatsApp con el turno listo. Sin apps, sin registro, sin fricción.

---

## Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | HTML + CSS + JS vanilla | Sin frameworks, sin librerías UI |
| Backend | Cloudflare Worker | `worker/index.js` |
| Base de datos | Cloudflare D1 (SQLite edge) | Binding: `barberia_db` |
| Hosting | Cloudflare Pages | Deploy: `wrangler pages deploy ./public` |
| Tipografías | Playfair Display + DM Mono | Google Fonts |
| Integraciones | Google Calendar API, WhatsApp deep links | API Key en `main.js` |

**Regla de oro: cero dependencias externas en el frontend.** No instalar npm packages en `/public`. Si algo se puede hacer en vanilla JS, se hace en vanilla JS.

---

## Estructura de archivos

```
barberiagebyanos/
├── public/
│   ├── index.html          ← única página
│   ├── css/style.css       ← todos los estilos (CSS custom properties)
│   ├── js/main.js          ← toda la lógica frontend
│   └── img/                ← logo.jpg, foto-1..4.jpg, Valor Solutions-blanca.png
├── worker/
│   └── index.js            ← API POST /api/reserva → guarda en D1
├── migrations/
│   ├── 001_init.sql        ← tabla reservas base
│   ├── 002_add_barbero.sql ← columna barbero
│   └── 003_add_fecha.sql   ← columna fecha
└── wrangler.toml           ← config Cloudflare (D1 binding, worker name)
```

---

## Variables de diseño (CSS)

```css
--bg: #0c0b09          /* negro cálido — fondo principal */
--surface: #141210     /* superficie de cards */
--border: #2a2620      /* bordes sutiles */
--gold: #c9a84c        /* dorado — color de acento principal */
--text: #e8dcc8        /* texto principal */
--muted: #6b6055       /* texto secundario / placeholders */
--font-serif: 'Playfair Display', serif
--font-mono: 'DM Mono', monospace
```

Nunca hardcodear colores en el HTML ni en el JS. Siempre usar las variables CSS.

---

## Base de datos D1

**Tabla: `reservas`**

```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
nombre     TEXT NOT NULL       -- nombre del cliente
telefono   TEXT NOT NULL       -- vacío por ahora, campo reservado
servicio   TEXT NOT NULL       -- ej: "Corte", "Corte + Barba"
barbero    TEXT                -- ej: "Gebyano", "Lobo"
fecha      TEXT                -- ej: "14/3/2026"
mensaje    TEXT                -- fecha + hora combinadas: "14/3/2026 10:30"
created_at TEXT NOT NULL       -- ISO timestamp
```

Índices: `telefono`, `created_at`, `barbero`.

Para consultar reservas locales:
```bash
wrangler d1 execute barberia-db --local --command="SELECT * FROM reservas ORDER BY created_at DESC LIMIT 20"
```

Para producción: reemplazar `--local` por `--remote`.

---

## Barberos

```javascript
const BARBEROS = [
  { id: 'gebyano', nombre: 'Gebyano', tel: '5493416021009', disponible: true },
  { id: 'lobo',    nombre: 'Lobo',    tel: '5493412754502', disponible: true },
  { id: 'ns',      nombre: 'NS',      tel: null,            disponible: false },
  { id: 'bql',     nombre: 'BQL',     tel: null,            disponible: false }
];
```

Cuando se active un barbero nuevo: agregar `tel` real, cambiar `disponible: true`, y verificar que tenga Google Calendar configurado si se quiere mostrar su disponibilidad real.

---

## Sistema de reservas — flujo completo

```
Cliente completa form
  → nombre + servicio + barbero + día + hora
  → POST /api/reserva  (fire and forget, no bloquea UX)
  → window.open(wa.me/[tel]?text=[mensaje pre-armado])
```

El Worker valida campos obligatorios (`nombre`, `servicio`, `barbero`) y guarda en D1. Si falla, no rompe la experiencia del usuario (el WA se abre igual).

---

## Google Calendar

```javascript
const GOOGLE_CALENDAR_CONFIG = {
  apiKey: 'AIzaSyCt8-oaJu57_A73I7bVtCAupY9xA9rZ6aQ',
  calendarId: 'felipevalor7@gmail.com',
  timezone: 'America/Argentina/Buenos_Aires',
  schedule: {
    1: { start: 9, end: 20 },  // lunes
    2: { start: 9, end: 20 },
    3: { start: 9, end: 20 },
    4: { start: 9, end: 20 },
    5: { start: 9, end: 20 },
    6: { start: 9, end: 17 },  // sábado
  },
  slotDuration: 30,            // minutos
};
```

**Pendiente:** restringir la API Key por dominio en Google Cloud Console para evitar uso no autorizado.

---

## Comandos frecuentes

```bash
# Desarrollo local
npx wrangler pages dev ./public

# Migración local
wrangler d1 execute barberia-db --local --file=./migrations/001_init.sql

# Migración remota (producción)
wrangler d1 execute barberia-db --remote --file=./migrations/001_init.sql

# Deploy frontend
wrangler pages deploy ./public --project-name=barberia

# Deploy worker
wrangler deploy
```

---

## Arquitectura del backend — importante

El Worker standalone (`worker/index.js`) **no está conectado a Pages**. La API vive en:

```
functions/api/reserva.js   ← Pages Function, esta es la que funciona
worker/index.js            ← Worker standalone, ignorar para /api/reserva
```

El binding `barberia_db` está configurado en el dashboard de Cloudflare Pages (Settings → Bindings). El `wrangler.toml` solo **no** es suficiente para que Pages lo reconozca — necesita estar en el dashboard sí o sí.

Para deploy siempre usar:
```bash
wrangler pages deploy ./public --project-name=barberia
```
**Nunca** `wrangler deploy` a secas — ese deploya el Worker standalone.

---

## Qué NO hacer

- No instalar librerías JS en `/public` (ni jQuery, ni lodash, nada)
- No usar `localStorage` ni `sessionStorage`
- No hardcodear colores, usar siempre las CSS variables
- No tocar el `.wrangler/` — son archivos generados automáticamente
- No commitear la API Key de Google Calendar si se cambia a variable de entorno
- No modificar las migraciones ya ejecutadas — crear una nueva si hace falta
