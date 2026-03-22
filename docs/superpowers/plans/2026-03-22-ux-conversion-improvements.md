# UX Conversion Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 5 UX/conversion improvements to the Barbería Gebyanos landing page to increase trust and reduce form abandonment.

**Architecture:** Pure HTML/CSS/JS changes to 3 files. No new files created. Each task is self-contained and can be tested visually in the browser via `npx wrangler pages dev ./public`.

**Tech Stack:** Vanilla JS, CSS custom properties, HTML5 — zero external dependencies.

---

## File Map

| File | What changes |
|---|---|
| `public/index.html` | Add `#prueba-social`, move `#galeria`, add `.form-steps`, add `.slots-fallback`, change btn from `disabled` to `.btn-incomplete` |
| `public/css/style.css` | Add styles: stats row, testimonials, barbero avatar cards, form steps, slots fallback, `.btn-incomplete` |
| `public/js/main.js` | Update barbero card rendering (avatar + specialty), add `updateFormSteps()`, update `validar()`, add Calendar timeout + WA fallback |

---

## Task 1: HTML Structure — Social Proof + Gallery Repositioning

**Files:**
- Modify: `public/index.html`

**Context:** The current section order is: Hero → Servicios → Reservar → Mi turno → Galería. We move Galería before Reservar and add a new `#prueba-social` section after Hero.

- [ ] **Step 1.1: Add `#prueba-social` section between `#hero` and `#servicios`**

In `public/index.html`, insert the following block between the closing `</section>` of `#hero` and the opening `<section id="servicios">`:

```html
<section id="prueba-social">
    <div class="container">
        <div class="stats-row reveal">
            <div class="stat-item">
                <div class="stat-number">15+</div>
                <div class="stat-label">años en<br>el barrio</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
                <div class="stat-number">2</div>
                <div class="stat-label">barberos<br>disponibles</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
                <div class="stat-number">Lun–Vie</div>
                <div class="stat-label">9:00–20:00<br>Sáb 9:00–17:00</div>
            </div>
        </div>
        <div class="testimonios-grid reveal" style="transition-delay: 100ms;">
            <div class="testimonio-card">
                <p class="testimonio-texto">"El único lugar donde salgo contento. Llevo 4 años viniendo."</p>
                <div class="testimonio-autor">— Rodrigo M., cliente frecuente</div>
            </div>
            <div class="testimonio-card">
                <p class="testimonio-texto">"Ambiente de barrio de verdad. Te atienden con tiempo."</p>
                <div class="testimonio-autor">— Matías F., cliente frecuente</div>
            </div>
        </div>
    </div>
</section>
```

- [ ] **Step 1.2: Move `#galeria` section before `#reservar`**

Cut the entire `<section id="galeria">...</section>` block (currently between `#mi-turno` and `</main>`) and paste it immediately before `<section id="reservar">`. The new order inside `<main>` should be:
1. `#hero`
2. `#prueba-social` ← new
3. `#servicios`
4. `#galeria` ← moved here
5. `#reservar`
6. `#mi-turno`

- [ ] **Step 1.3: Add `.form-steps` progress indicator above `#reserva-form`**

Inside `<section id="reservar">`, immediately before `<form id="reserva-form"`, insert:

```html
<div class="form-steps reveal" id="form-steps">
    <div class="form-step active" data-step="1">
        <span class="step-num">1</span>
        <span class="step-label">Datos</span>
    </div>
    <div class="form-step" data-step="2">
        <span class="step-num">2</span>
        <span class="step-label">Servicio</span>
    </div>
    <div class="form-step" data-step="3">
        <span class="step-num">3</span>
        <span class="step-label">Barbero</span>
    </div>
    <div class="form-step" data-step="4">
        <span class="step-num">4</span>
        <span class="step-label">Día</span>
    </div>
    <div class="form-step" data-step="5">
        <span class="step-num">5</span>
        <span class="step-label">Horario</span>
    </div>
</div>
```

- [ ] **Step 1.4: Add `.slots-fallback` inside `#slot-picker-wrapper`**

Find `<div class="form-group" id="slot-picker-wrapper">` and add the fallback div after `<div id="slot-picker" style="display:none;"></div>`:

```html
<div id="slots-fallback" class="slots-fallback" style="display:none;">
    <p>No pudimos cargar los horarios disponibles.</p>
    <a id="slots-fallback-wa" href="#" target="_blank" rel="noopener" class="btn-slots-fallback">
        Escribinos por WhatsApp →
    </a>
</div>
```

- [ ] **Step 1.5: Remove `disabled` attribute from submit button**

Find:
```html
<button type="submit" class="btn magnetic" id="reserva-btn" disabled>
```
Change to:
```html
<button type="submit" class="btn magnetic btn-incomplete" id="reserva-btn">
```

Also add the tooltip element immediately after the button (before `</form>`):
```html
<div id="reserva-btn-tooltip" class="reserva-btn-tooltip" style="display:none;">
    Completá los pasos anteriores para confirmar.
</div>
```

- [ ] **Step 1.6: Verify HTML structure in browser**

Run: `npx wrangler pages dev ./public`
Open: `http://localhost:8788`
Verify: Section order is Hero → Stats/Testimonials → Servicios → Galería → Reservar → Mi turno → Footer. No JS errors in console.

- [ ] **Step 1.7: Commit**

```bash
git add public/index.html
git commit -m "feat(html): add social proof section, move gallery, add form steps and WA fallback markup"
```

---

## Task 2: CSS — All New Styles

**Files:**
- Modify: `public/css/style.css` (append to end of file)

**Context:** All existing CSS variables (`--bg`, `--surface`, `--border`, `--gold`, `--text`, `--muted`) are already defined in `:root`. Use them exclusively. No hardcoded colors.

- [ ] **Step 2.1: Add Social Proof section styles**

Append to `public/css/style.css`:

```css
/* ── Social Proof ──────────────────────────────────────────── */
#prueba-social {
  padding: 4rem 0 5rem;
  border-bottom: 1px solid var(--border);
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 4rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  padding: 0 3rem;
}

.stat-number {
  font-family: var(--font-serif);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: var(--gold);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.5;
}

.stat-divider {
  width: 1px;
  height: 3rem;
  background: var(--border);
  flex-shrink: 0;
}

.testimonios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
}

.testimonio-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.75rem 2rem;
}

.testimonio-texto {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1rem;
  color: var(--text);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.testimonio-autor {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

@media (max-width: 600px) {
  .stat-item {
    padding: 0 1.5rem;
  }
  .stat-divider {
    height: 2rem;
  }
}
```

- [ ] **Step 2.2: Add Barbero card avatar styles**

Append to `public/css/style.css`:

```css
/* ── Barbero Cards — Avatar + Specialty ────────────────────── */
.barberos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.barbero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.barbero-card:hover:not(.barbero-no-disponible) {
  border-color: var(--gold);
}

.barbero-card.selected {
  border-color: var(--gold);
  background: rgba(201, 168, 76, 0.07);
}

.barbero-card.barbero-no-disponible {
  opacity: 0.4;
  pointer-events: none;
  cursor: default;
}

.barbero-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(201, 168, 76, 0.12);
  border: 1px solid rgba(201, 168, 76, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gold);
  line-height: 1;
}

.barbero-nombre {
  font-family: var(--font-serif);
  font-size: 0.95rem;
  color: var(--text);
  font-weight: 600;
}

.barbero-especialidad {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.4;
}

.barbero-badge {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
}
```

- [ ] **Step 2.3: Add Form Steps indicator styles**

Append to `public/css/style.css`:

```css
/* ── Form Steps Progress ───────────────────────────────────── */
.form-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 2.5rem;
  position: relative;
}

.form-steps::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: var(--border);
  z-index: 0;
}

.form-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted);
  transition: var(--transition);
}

.step-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: color 0.3s ease;
}

.form-step.active .step-num {
  background: rgba(201, 168, 76, 0.12);
  border-color: var(--gold);
  color: var(--gold);
}

.form-step.active .step-label {
  color: var(--gold);
}

.form-step.completed .step-num {
  background: rgba(201, 168, 76, 0.08);
  border-color: rgba(201, 168, 76, 0.4);
  color: rgba(201, 168, 76, 0.6);
}

.form-step.completed .step-num::before {
  content: '✓';
  font-size: 0.8rem;
}

.form-step.completed .step-num {
  font-size: 0;
}

.form-step.completed .step-label {
  color: rgba(201, 168, 76, 0.5);
}

@media (max-width: 500px) {
  .step-label {
    display: none;
  }
  .form-steps::before {
    left: 5%;
    right: 5%;
  }
}
```

- [ ] **Step 2.4: Add Slots fallback + btn-incomplete styles**

Append to `public/css/style.css`:

```css
/* ── Slots Fallback ────────────────────────────────────────── */
.slots-fallback {
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
}

.slots-fallback p {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 1rem;
}

.btn-slots-fallback {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: 6px;
  padding: 0.6rem 1.25rem;
  text-decoration: none;
  transition: var(--transition);
}

.btn-slots-fallback:hover {
  background: rgba(201, 168, 76, 0.1);
}

/* ── Submit button incomplete state ───────────────────────── */
#reserva-btn.btn-incomplete {
  opacity: 0.45;
  cursor: not-allowed;
}

.reserva-btn-tooltip {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  margin-top: 0.75rem;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2.5: Visual check in browser**

Run: `npx wrangler pages dev ./public`
Verify:
- Stats row shows 3 columns with gold numbers, dividers between them
- Two testimonial cards appear below stats
- Gallery shows between Servicios and Reservar
- Form steps shows 5 circles, step 1 highlighted in gold
- Submit button is visually dimmed

- [ ] **Step 2.6: Commit**

```bash
git add public/css/style.css
git commit -m "feat(css): add styles for social proof, barbero avatars, form steps, WA fallback, btn-incomplete"
```

---

## Task 3: JS — Barbero Cards with Avatar + Specialty

**Files:**
- Modify: `public/js/main.js` — function `initReservaForm()` starting at line ~356

**Context:** The current `initReservaForm()` renders barbero cards with only `barbero-nombre` and `barbero-badge`. We replace the card `innerHTML` to include avatar initial and specialty. The `barberoSeleccionado` event dispatch is unchanged. The BARBEROS array structure is: `{ id, nombre, tel, disponible, calendarId, schedule }` — add `especialidad` field inline in the render (no schema change needed).

- [ ] **Step 3.1: Add specialty map at top of `initReservaForm()`**

Find the `initReservaForm()` function. At the top of the function body (after the cookie check), add:

```javascript
const ESPECIALIDADES = {
  gebyano: 'Degradés y estilos',
  lobo:    'Clásicos y barba',
  felipe:  'Degradés y barba',
  ns:      'Próximamente',
  bql:     'Próximamente',
};
```

- [ ] **Step 3.2: Update the card `innerHTML` inside `BARBEROS.forEach`**

Find the existing card render block:
```javascript
card.innerHTML = `
      <span class="barbero-nombre">${b.nombre}</span>
      ${!b.disponible ? '<span class="barbero-badge">Próximamente</span>' : ''}
    `;
```

Replace it with:
```javascript
const inicial    = b.nombre.charAt(0).toUpperCase();
const especialidad = ESPECIALIDADES[b.id] || '';
card.innerHTML = `
  <div class="barbero-avatar">${inicial}</div>
  <span class="barbero-nombre">${b.nombre}</span>
  ${b.disponible
    ? `<span class="barbero-especialidad">${especialidad}</span>`
    : '<span class="barbero-badge">Próximamente</span>'
  }
`;
```

- [ ] **Step 3.3: Verify barbero card selection still works**

Run: `npx wrangler pages dev ./public`
1. Click each available barbero card — border should turn gold
2. Only one card can be selected at a time
3. After selecting barbero, day picker appears (existing behavior intact)
4. NS and BQL cards are dimmed and unclickable

- [ ] **Step 3.4: Commit**

```bash
git add public/js/main.js
git commit -m "feat(js): barbero cards — add avatar initial and specialty label"
```

---

## Task 4: JS — Form Progress Steps Logic

**Files:**
- Modify: `public/js/main.js`

**Context:** Add a `updateFormSteps(step)` function that accepts the highest completed step number (1–5) and updates CSS classes on `.form-step` elements. Wire it to: input events on nombre/tel fields, `servicioSeleccionado` event, `barberoSeleccionado` event, and day button click.

Step completion thresholds:
- Step 1 → completed when step 2 activates (nombre + tel both non-empty)
- Step 2 → completed when step 3 activates (servicio selected)
- Step 3 → completed when step 4 activates (barbero selected)
- Step 4 → completed when step 5 activates (día selected)

- [ ] **Step 4.1: Add `updateFormSteps()` function**

Add this function anywhere in `main.js` (suggested: after `initReservaForm()`):

```javascript
function updateFormSteps(activeStep) {
  const steps = document.querySelectorAll('.form-step');
  steps.forEach(step => {
    const n = parseInt(step.getAttribute('data-step'), 10);
    step.classList.remove('active', 'completed');
    if (n < activeStep)  step.classList.add('completed');
    if (n === activeStep) step.classList.add('active');
  });
}
```

- [ ] **Step 4.2: Wire step updates into `initCalendarPicker()`**

Inside `initCalendarPicker()`, find where nombre/tel input listeners are registered (around line 627–632). The exact block including the comment is:

```javascript
document.getElementById('reserva-nombre')
    ?.addEventListener('input', validar);

  // Click en botón — confirmar turno directamente in-app
  document.getElementById('reserva-telefono')
    ?.addEventListener('input', validar);
```

Add step update calls — replace with:

```javascript
const updateDatosStep = () => {
  validar();
  const nombre   = document.getElementById('reserva-nombre')?.value.trim();
  const telefono = document.getElementById('reserva-telefono')?.value.trim();
  if (nombre && telefono) updateFormSteps(2);
  else updateFormSteps(1);
};
document.getElementById('reserva-nombre')
  ?.addEventListener('input', updateDatosStep);
document.getElementById('reserva-telefono')
  ?.addEventListener('input', updateDatosStep);
```

- [ ] **Step 4.3: Wire step 3 on servicio selection**

Find the `servicioSeleccionado` event listener inside `initCalendarPicker()`:

```javascript
document.addEventListener('servicioSeleccionado', async () => {
  selectedServicio = document.getElementById('servicio-value')?.value;
  selectedSlot = null;
  validar();
```

Add `updateFormSteps(3);` after `validar();`:

```javascript
document.addEventListener('servicioSeleccionado', async () => {
  selectedServicio = document.getElementById('servicio-value')?.value;
  selectedSlot = null;
  validar();
  updateFormSteps(3);
```

- [ ] **Step 4.4: Wire step 4 on barbero selection**

Find the `barberoSeleccionado` event listener inside `initCalendarPicker()`:

```javascript
document.addEventListener('barberoSeleccionado', async (e) => {
  selectedBarbero = { ...e.detail };
  selectedDay  = null;
  selectedSlot = null;
  slotPicker.innerHTML = '';
  slotPicker.style.display = 'none';
  validar();
```

Add `updateFormSteps(4);` after `validar();`:

```javascript
document.addEventListener('barberoSeleccionado', async (e) => {
  selectedBarbero = { ...e.detail };
  selectedDay  = null;
  selectedSlot = null;
  slotPicker.innerHTML = '';
  slotPicker.style.display = 'none';
  validar();
  updateFormSteps(4);
```

- [ ] **Step 4.5: Wire step 5 on day selection**

Inside `renderDays()`, find the day button click handler:

```javascript
dayBtn.addEventListener('click', () => {
  document.querySelectorAll('.day-btn').forEach(b => { ... });
  dayBtn.classList.add('selected');
  dayBtn.setAttribute('aria-pressed', 'true');
  selectedDay = day;
  selectedSlot = null;
  validar();
  renderSlots(day);
});
```

Add `updateFormSteps(5);` after `validar();`:

```javascript
dayBtn.addEventListener('click', () => {
  document.querySelectorAll('.day-btn').forEach(b => { ... });
  dayBtn.classList.add('selected');
  dayBtn.setAttribute('aria-pressed', 'true');
  selectedDay = day;
  selectedSlot = null;
  validar();
  updateFormSteps(5);
  renderSlots(day);
});
```

- [ ] **Step 4.6: Verify steps progress in browser**

Run: `npx wrangler pages dev ./public`, navigate to `#reservar`.
1. Step 1 is gold on load
2. Type name + phone → step 1 gets checkmark, step 2 turns gold
3. Select a service → step 2 gets checkmark, step 3 turns gold
4. Select a barbero → step 3 gets checkmark, step 4 turns gold
5. Select a day → step 4 gets checkmark, step 5 turns gold

- [ ] **Step 4.7: Commit**

```bash
git add public/js/main.js
git commit -m "feat(js): form progress steps — wire updateFormSteps to all form events"
```

---

## Task 5: JS — Submit Button + WhatsApp Fallback

**Files:**
- Modify: `public/js/main.js`

**Context:** Two changes:
1. The submit button no longer uses `disabled`. Replace `validar()` logic with `.btn-incomplete` class toggle + tooltip display.
2. `renderSlots()` gets a 5-second timeout. If it doesn't complete in time (or throws), show `.slots-fallback` with a WA link using the selected barbero's `tel` (fallback to Gebyano's if null).

- [ ] **Step 5.1: Initialize `btn-incomplete` on page load**

Inside `initCalendarPicker()`, immediately after `const btn = document.getElementById('reserva-btn');`, add:

```javascript
// Initialize button as incomplete on load (HTML disabled attr was removed in Task 1)
btn.classList.add('btn-incomplete');
```

This ensures the button is visually dimmed from the first render, before the user touches any field.

- [ ] **Step 5.3: Update `validar()` to use `.btn-incomplete` instead of `disabled`**

Find the `validar()` function (around line 620):

```javascript
function validar() {
  const nombre    = document.getElementById('reserva-nombre')?.value.trim();
  const telefono  = document.getElementById('reserva-telefono')?.value.trim();
  const servicio  = document.getElementById('servicio-value')?.value;
  btn.disabled = !(nombre && telefono && servicio && selectedBarbero && selectedDay && selectedSlot);
}
```

Replace with:

```javascript
function validar() {
  const nombre   = document.getElementById('reserva-nombre')?.value.trim();
  const telefono = document.getElementById('reserva-telefono')?.value.trim();
  const servicio = document.getElementById('servicio-value')?.value;
  const completo = !!(nombre && telefono && servicio && selectedBarbero && selectedDay && selectedSlot);
  btn.classList.toggle('btn-incomplete', !completo);
}
```

- [ ] **Step 5.2: Update btn click handler to guard on `.btn-incomplete`**

Find the `btn.addEventListener('click', async () => {` handler. At the very top of the handler, before the existing guard check on line 638, add the new `.btn-incomplete` guard. The existing guard (`if (!nombre || !telefono || ...`) can stay as a safety net — it will never be reached when `.btn-incomplete` is present, but is harmless to keep.

```javascript
btn.addEventListener('click', async () => {
  // If form incomplete, show tooltip instead of submitting
  if (btn.classList.contains('btn-incomplete')) {
    const tooltip = document.getElementById('reserva-btn-tooltip');
    if (tooltip) {
      tooltip.style.display = 'block';
      setTimeout(() => { tooltip.style.display = 'none'; }, 3000);
    }
    return;
  }

  const nombre   = document.getElementById('reserva-nombre').value.trim();
  const telefono = document.getElementById('reserva-telefono').value.trim();
  const servicio = document.getElementById('servicio-value').value;
  if (!nombre || !telefono || !servicio || !selectedBarbero || !selectedDay || !selectedSlot) return; // safety net

  // ... rest of existing handler unchanged
```

- [ ] **Step 5.4: Fix remaining `btn.disabled` assignments in the click handler and reset**

After removing the HTML `disabled` attribute (Task 1.5), three remaining places still write `btn.disabled` directly — they must be updated so they don't re-engage the native disabled state and break the click handler.

**A) During submission** (line 640) — keep `btn.disabled = true` here. This is intentional: it prevents double-click while the API call is in flight. Also remove `.btn-incomplete` so the button looks active/loading:

Find:
```javascript
    btn.disabled    = true;
    btn.textContent = 'Confirmando...';
```
Replace with:
```javascript
    btn.disabled = true;
    btn.classList.remove('btn-incomplete');
    btn.textContent = 'Confirmando...';
```

**B) On API error** (line 667) — restore the button via `validar()` instead of manually setting `disabled = false`:

Find:
```javascript
        btn.disabled    = false;
        btn.textContent = 'Confirmar turno';
        return;
```
Replace with:
```javascript
        btn.disabled = false;
        btn.textContent = 'Confirmar turno';
        validar();
        return;
```

**C) On network error** (line 678) — same pattern:

Find:
```javascript
      btn.disabled    = false;
      btn.textContent = 'Confirmar turno';
    }
  });
```
Replace with:
```javascript
      btn.disabled = false;
      btn.textContent = 'Confirmar turno';
      validar();
    }
  });
```

**D) On "nueva reserva" reset** (line 731) — replace `btn.disabled = true` with the `.btn-incomplete` class and call `updateFormSteps(1)` to reset the progress indicator:

Find:
```javascript
    btn.disabled    = true;
    btn.textContent = 'Confirmar turno';
    selectedBarbero = null; selectedDay = null; selectedSlot = null;
```
Replace with:
```javascript
    btn.classList.add('btn-incomplete');
    btn.textContent = 'Confirmar turno';
    selectedBarbero = null; selectedDay = null; selectedSlot = null;
    updateFormSteps(1);
```

- [ ] **Step 5.5: Add WA fallback helper function**

Add this utility function anywhere in `main.js` (suggested: near the top, after `renderPromos`):

```javascript
function getWaFallbackUrl(barbero) {
  const GEBYANO_TEL = '5493416021009';
  const tel = barbero?.tel || GEBYANO_TEL;
  const msg = encodeURIComponent('Hola, quiero reservar un turno');
  return `https://wa.me/${tel}?text=${msg}`;
}
```

- [ ] **Step 5.6: Add timeout + fallback to `renderSlots()`**

Find `async function renderSlots(day) {` inside `initCalendarPicker()`. This is a **partial replacement** — only the first 5 lines of the function change. The rest of the function body (the slot loop, grid rendering, `slotPicker.appendChild(grid)`) stays completely unchanged.

Current opening (lines 546–550, the ONLY part being replaced):
```javascript
async function renderSlots(day) {
  slotPicker.innerHTML = '<div class="calendar-loading">Cargando horarios...</div>';
  slotPicker.style.display = 'block';

  const busySlots = await fetchBusySlots(day, selectedBarbero);
```

Replace those 5 lines with:
```javascript
async function renderSlots(day) {
  slotPicker.innerHTML = '<div class="calendar-loading">Cargando horarios...</div>';
  slotPicker.style.display = 'block';

  const fallbackEl = document.getElementById('slots-fallback');
  const fallbackWa = document.getElementById('slots-fallback-wa');

  const showFallback = () => {
    slotPicker.innerHTML = '';
    slotPicker.style.display = 'none';
    if (fallbackEl) {
      if (fallbackWa) fallbackWa.href = getWaFallbackUrl(selectedBarbero);
      fallbackEl.style.display = 'block';
    }
  };

  const timeoutId = setTimeout(showFallback, 5000);

  let busySlots;
  try {
    busySlots = await fetchBusySlots(day, selectedBarbero);
    clearTimeout(timeoutId);
    if (fallbackEl) fallbackEl.style.display = 'none';
  } catch {
    clearTimeout(timeoutId);
    showFallback();
    return;
  }

  // ... rest of renderSlots unchanged (slot loop, grid rendering, slotPicker.appendChild(grid))
```

- [ ] **Step 5.7: Verify tooltip and fallback in browser**

Run: `npx wrangler pages dev ./public`

**Test tooltip:**
1. Navigate to `#reservar` with empty form
2. Click "Confirmar turno" button (now dimmed but clickable)
3. Tooltip "Completá los pasos anteriores para confirmar." should appear below button, disappear after 3 seconds

**Test WA fallback** (simulate timeout by temporarily changing `5000` to `1` in the setTimeout, or by blocking the API in DevTools → Network → block `/api/turnos`):
1. Select a barbero, select a day
2. Slot grid should be replaced by fallback message with WA link
3. WA link should use the selected barbero's phone number
4. Restore timeout value to `5000` after testing

- [ ] **Step 5.8: Commit**

```bash
git add public/js/main.js
git commit -m "feat(js): replace disabled btn with btn-incomplete + tooltip, add Calendar timeout WA fallback"
```

---

## Task 6: Final Review + Deploy

**Files:** None (review only)

- [ ] **Step 6.1: Full end-to-end flow test**

Run: `npx wrangler pages dev ./public`

Walk through the complete user flow:
1. Land on page → verify hero, then stats/testimonials, then servicios, then gallery, then reserva form
2. Form: fill name + phone → step 1 completes
3. Select service → step 2 completes
4. Select barbero → avatar and specialty visible, step 3 completes
5. Select day → step 4 completes, slot grid loads
6. Select slot → step 5 active, submit button no longer dimmed
7. Click submit → confirmation screen appears

- [ ] **Step 6.2: Mobile check**

Open DevTools → toggle device toolbar → test at 375px wide:
- Stats row wraps gracefully
- Testimonials stack to single column
- Barbero cards fit in grid (min 2 per row)
- Form steps labels hidden at small breakpoint, circles still visible

- [ ] **Step 6.3: Deploy**

```bash
wrangler pages deploy ./public --project-name=barberia
```

- [ ] **Step 6.4: Final commit tag**

```bash
git add -A
git commit -m "feat(ux): complete UX conversion improvements — social proof, gallery reorder, barbero cards, form steps, WA fallback"
```
