# Barbería Gebyanos — Landing Page

Premium landing page para **Barbería Gebyanos** (1 de Mayo 1687, Rosario).
Desarrollado por [Valor Solutions](https://valorsolutions.com.ar).
Sitio live: **https://barberia-d8q.pages.dev/**

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS vanilla (sin frameworks) |
| Backend | Cloudflare Pages Functions |
| Base de datos | Cloudflare D1 (SQLite edge) |
| Hosting | Cloudflare Pages |
| Tipografías | Playfair Display + DM Mono (Google Fonts) |
| Integraciones | Google Calendar API, WhatsApp deep links |

---

## Features

**UX / UI**
- Dark mode con acentos dorados y tipografía premium
- Word-by-word reveal en el Hero title
- Scroll reveal animations
- Custom interactive cursor
- Magnetic CTA buttons
- Responsive + bottom nav en mobile

**Reservas**
- Selector de barbero con disponibilidad real desde Google Calendar
- Picker de días y slots de 30 min (lunes–viernes 9–20, sábado 9–17)
- Fire-and-forget POST a `/api/reserva` → guarda en D1
- Apertura automática de WhatsApp con mensaje pre-armado
- Consulta de turno por nombre (`/api/mi-turno`)

**Panel Admin** (`/admin`)
- Login con autenticación por rol desde D1
- Dashboard con reservas del día / semana
- Agenda visual por barbero
- Configuración de horarios y bloqueos
- Gestión de feriados y bloques recurrentes
- Configuración de barberos y servicios

---

## Estructura de archivos

```
barberiagebyanos/
├── public/
│   ├── index.html              ← única página pública
│   ├── css/style.css           ← todos los estilos (CSS custom properties)
│   ├── js/main.js              ← toda la lógica frontend
│   ├── img/                    ← logo.jpg, foto-1..4.jpg, Valor Solutions-blanca.png
│   └── admin/                  ← panel de administración
│       ├── index.html          ← login
│       ├── dashboard.html
│       ├── agenda.html
│       ├── horarios.html
│       ├── recurrentes.html
│       └── configuracion.html
├── functions/
│   └── api/
│       ├── reserva.js          ← POST /api/reserva → guarda en D1
│       ├── turnos.js           ← GET  /api/turnos
│       ├── mi-turno.js         ← GET  /api/mi-turno?nombre=...
│       ├── barberos.js         ← GET  /api/barberos
│       ├── horarios.js         ← GET  /api/horarios
│       └── feriados.js         ← GET  /api/feriados
│   └── admin/api/
│       ├── auth.js             ← POST /admin/api/auth (login/logout)
│       ├── me.js               ← GET  /admin/api/me
│       ├── reservas.js         ← CRUD reservas
│       ├── agenda.js           ← GET  /admin/api/agenda
│       ├── turno.js            ← PATCH/DELETE turno individual
│       ├── bloquear.js         ← POST /admin/api/bloquear
│       ├── horarios.js         ← GET/PUT horarios por barbero
│       ├── feriados.js         ← CRUD feriados
│       ├── recurrentes.js      ← CRUD bloques recurrentes
│       ├── servicios.js        ← CRUD servicios
│       ├── config/barberos.js  ← CRUD barberos
│       └── _gcal.js            ← helper Google Calendar
├── worker/
│   └── index.js                ← Worker standalone (no usado para Pages)
├── migrations/
│   ├── 001_init.sql            ← tabla reservas base
│   ├── 002_add_barbero.sql     ← columna barbero
│   └── 003_add_fecha.sql       ← columna fecha
├── wrangler.toml               ← config Cloudflare (D1 binding, worker name)
└── CLAUDE.md                   ← instrucciones del proyecto para Claude Code
```

---

## Base de datos D1

**Tabla: `reservas`**

```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
nombre     TEXT NOT NULL       -- nombre del cliente
telefono   TEXT NOT NULL       -- campo reservado
servicio   TEXT NOT NULL       -- "Corte", "Corte + Barba", etc.
barbero    TEXT                -- "Gebyano", "Lobo"
fecha      TEXT                -- "14/3/2026"
mensaje    TEXT                -- fecha + hora: "14/3/2026 10:30"
created_at TEXT NOT NULL       -- ISO timestamp
```

Binding D1: `barberia_db` (configurado en Cloudflare Pages dashboard → Settings → Bindings).

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

---

## Setup & Deployment

### 1. Base de datos

```bash
# Crear base (primera vez)
wrangler d1 create barberia-db

# Migraciones local
wrangler d1 execute barberia-db --local --file=./migrations/001_init.sql
wrangler d1 execute barberia-db --local --file=./migrations/002_add_barbero.sql
wrangler d1 execute barberia-db --local --file=./migrations/003_add_fecha.sql

# Migraciones producción
wrangler d1 execute barberia-db --remote --file=./migrations/001_init.sql
wrangler d1 execute barberia-db --remote --file=./migrations/002_add_barbero.sql
wrangler d1 execute barberia-db --remote --file=./migrations/003_add_fecha.sql
```

### 2. Desarrollo local

```bash
npx wrangler pages dev ./public
```

### 3. Deploy

```bash
# Deploy (frontend + Pages Functions)
wrangler pages deploy ./public --project-name=barberia
```

> **Importante:** nunca usar `wrangler deploy` a secas — ese deploya el Worker standalone en `worker/index.js`, no las Pages Functions.

### 4. Consultar reservas

```bash
# Local
wrangler d1 execute barberia-db --local --command="SELECT * FROM reservas ORDER BY created_at DESC LIMIT 20"

# Producción
wrangler d1 execute barberia-db --remote --command="SELECT * FROM reservas ORDER BY created_at DESC LIMIT 20"
```

---

## Variables CSS

```css
--bg: #0c0b09          /* negro cálido — fondo principal */
--surface: #141210     /* superficie de cards */
--border: #2a2620      /* bordes sutiles */
--gold: #c9a84c        /* dorado — color de acento principal */
--text: #e8dcc8        /* texto principal */
--muted: #6b6055       /* texto secundario / placeholders */
```

---

## Pendiente

- [ ] Dominio propio: `gebyanos.com.ar`
- [ ] Restringir API Key de Google Calendar por dominio en Google Cloud Console
- [ ] Activar barberos NS y BQL cuando estén disponibles
- [ ] Fase 2: turnero avanzado con panel por barbero (presupuestado $1.3M–$1.6M ARS)

---

Desarrollado por **Valor Solutions**.
