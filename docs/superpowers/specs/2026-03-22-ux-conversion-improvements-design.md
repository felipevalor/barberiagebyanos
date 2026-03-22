# UX/Conversion Improvements — Barbería Gebyanos
**Date:** 2026-03-22
**Status:** Approved
**Scope:** `public/index.html`, `public/css/style.css`, `public/js/main.js`

---

## Context

Full conversion audit identified 6 friction points. User approved 5 improvements. Headline stays unchanged.

---

## Approved Changes

### 1. Social Proof Section (new)
**Position:** Between `#hero` and `#servicios`
**Structure:**
- Three horizontal stats: "15+ años en el barrio", "2 barberos disponibles", "Lunes a Sábado"
- Two testimonial cards (placeholder content, realistic tone)
- Section ID: `#prueba-social`

**Stats data:**
```
15+          2              Lunes a Sábado
años en      barberos       9:00 – 20:00
el barrio    disponibles
```

**Testimonials (placeholder, to be replaced with real ones):**
> "El único lugar donde salgo contento. Llevo 4 años viniendo." — Rodrigo M.
> "Ambiente de barrio de verdad. Te atienden con tiempo." — Matías F.

**CSS:** New classes `.stats-row`, `.stat-item`, `.testimonios-grid`, `.testimonio-card`. Uses existing `--gold`, `--surface`, `--border` variables. No new fonts or dependencies.

---

### 2. Gallery Repositioning
**Before:** Hero → Servicios → Reservar → Mi turno → Galería → Footer
**After:** Hero → Social Proof → Servicios → **Galería** → Reservar → Mi turno → Footer

Change is purely structural in `index.html` — move the `<section id="galeria">` block. No CSS changes required.

---

### 3. Barbero Cards (avatar + specialty)
**Replaces:** Text-only barbero selector inside `#reserva-form`
**New structure per card:**
```html
<div class="barbero-card" data-id="gebyano">
  <div class="barbero-avatar">G</div>
  <div class="barbero-nombre">Gebyano</div>
  <div class="barbero-especialidad">Degradés y estilos</div>
</div>
```

**States:**
- Default: dark surface, gold border on hover
- Selected: `--gold` border + subtle gold background tint
- Unavailable (NS, BQL): muted opacity, "Próximamente" badge, `pointer-events: none`

**Specialties (placeholder):**
- Gebyano: "Degradés y estilos"
- Lobo: "Clásicos y barba"
- NS: "Próximamente"
- BQL: "Próximamente"

**JS:** The `BARBEROS` array already drives this section. Card rendering replaces the existing `.barberos-grid` logic in `initReservaForm()`. Selected state managed via `data-selected` attribute + CSS.

---

### 4. Form Progress Indicator
**Position:** Above the `<form id="reserva-form">` element
**Structure:** 5 labeled steps

```
① Datos  ② Servicio  ③ Barbero  ④ Día  ⑤ Horario
```

**Activation logic (JS):**
- Step 1 active: always (on load)
- Step 2 active: nombre + telefono filled
- Step 3 active: servicio selected
- Step 4 active: barbero selected
- Step 5 active: día selected

**CSS:** `.form-steps`, `.form-step`, `.form-step.active`, `.form-step.completed`. Active step uses `--gold`. Completed steps show a checkmark.

**Submit button tooltip:** If clicked while disabled, show inline message "Completá los pasos anteriores para confirmar."

---

### 5. WhatsApp Fallback in Slot Picker
**Trigger:** Google Calendar API fails OR slots take > 5000ms to load
**Location:** Inside `#slot-picker-wrapper`, replaces the slot grid

**Fallback HTML:**
```html
<div class="slots-fallback">
  <p>No pudimos cargar los horarios disponibles.</p>
  <a id="slots-fallback-wa" href="#" target="_blank" class="btn-slots-fallback">
    Escribinos por WhatsApp →
  </a>
</div>
```

**WA link logic:**
- If barbero selected: use that barbero's `tel`
- If no barbero selected: default to Gebyano's `tel` (5493416021009)
- Pre-composed message: `"Hola, quiero reservar un turno"`

**Timeout:** `setTimeout` of 5000ms set when slot fetch begins, cleared on success.

---

## What Does NOT Change
- Headline (`"El corte que buscabas."`) — kept as-is per user decision
- Overall color palette, fonts, CSS variables
- Worker API, D1 database, WhatsApp deep-link flow
- Any admin panel files

---

## File Impact

| File | Changes |
|---|---|
| `public/index.html` | Add `#prueba-social` section, move `#galeria`, add progress steps markup, add slots fallback markup |
| `public/css/style.css` | Add styles for: stats row, testimonials, barbero cards, form steps, slots fallback |
| `public/js/main.js` | Update barbero card rendering, add progress step logic, add Calendar timeout+fallback |

---

## Constraints
- Zero new dependencies (vanilla JS + CSS only, per CLAUDE.md)
- No `localStorage` or `sessionStorage`
- All colors via CSS variables only
- Mobile-first: all new components must be responsive
