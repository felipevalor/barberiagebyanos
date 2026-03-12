# Barbería "El Filo" — Landing Page

Premium landing page for a barber shop built with Cloudflare Pages, Workers, and D1.

## Features
- **Modern UI:** Dark mode with gold accents and premium typography (`Playfair Display` & `DM Mono`).
- **Motion Design:** 
  - Text Scramble effect on Hero.
  - Scroll Reveal animations.
  - Custom interactive cursor.
  - Magnetic CTA buttons.
- **Edge Backend:** Cloudflare Worker handling bookings via D1 database.

## Repository Structure
```
barberia/
├── public/                  # Frontend assets
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── worker/                  # Cloudflare Worker (API)
│   └── index.js
├── migrations/              # D1 SQL Migrations
│   └── 001_init.sql
├── wrangler.toml            # Cloudflare configuration
└── README.md
```

## Setup & Deployment

### 1. Database Setup
```bash
# Create D1 database
wrangler d1 create barberia-db

# Run migrations (local & remote)
wrangler d1 execute barberia-db --local --file=./migrations/001_init.sql
wrangler d1 execute barberia-db --remote --file=./migrations/001_init.sql
```

### 2. Local Development
```bash
# Run Pages dev server (frontend + worker integration)
npx wrangler pages dev ./public
```

### 3. Deployment
```bash
# Deploy Frontend
wrangler pages deploy ./public --project-name=barberia

# Deploy Worker
wrangler deploy
```

---
Developed by **Valor Solutions**.
