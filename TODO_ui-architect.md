# TODO — UI Component Architecture
> Rol: UI Component Architect aplicado al stack vanilla HTML/CSS/JS de Barbería Gebyanos.
> Generado por análisis exhaustivo del codebase. Cada ítem es trackeable como checkbox.

---

## Context

- **Framework**: Vanilla HTML + CSS + JS (sin build step, sin dependencias de framework)
- **Paradigma de componentes**: CSS custom properties + clases BEM-lite + ES Modules
- **Design token source**: Variables CSS en `public/css/style.css` (incompleto) + duplicado en cada `<style>` inline de admin
- **Theming**: Tema oscuro único; no hay light mode ni multi-theme actualmente
- **Problema central**: 7 páginas admin con `<style>` inline duplicando ~300 líneas de CSS idéntico cada una. No hay hoja de estilos compartida para admin. Los patrones de componentes (nav, toolbar, card, modal, chips) existen pero no están sistematizados ni documentados.

---

## Component Plan

- [ ] **UI-PLAN-1.1 Button**
  - **Atomic Level**: Atom
  - **Variants**: `primary` (fondo gold), `ghost` (borde gold), `danger` (hover red), `cancel` (borde surface), `icon-only`
  - **Props**: `variant`, `size` (sm/md), `disabled`, `loading` (spinner inline), `type`
  - **Dependencies**: Design token `--gold`, `--red`, spinner token
  - **Estado actual**: Existe fragmentado como `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-cancel` en varios archivos. Sin estado `loading`.

- [ ] **UI-PLAN-1.2 Input**
  - **Atomic Level**: Atom
  - **Variants**: `default`, `error`, `success`, `disabled`
  - **Props**: `type`, `placeholder`, `disabled`, `state` (error/success), `helper-text`
  - **Dependencies**: `--border`, `--gold`, `--red`, `--green`
  - **Estado actual**: Estilos inline en form. Sin feedback visual de error/success.

- [ ] **UI-PLAN-1.3 Badge**
  - **Atomic Level**: Atom
  - **Variants**: `gold` (activo), `muted` (inactivo/próximamente), `green` (disponible), `red` (error)
  - **Props**: `variant`, `size`
  - **Dependencies**: Design tokens semánticos
  - **Estado actual**: `.badge` en configuracion.html, `.barbero-badge` en landing, sin sistematización.

- [ ] **UI-PLAN-1.4 Spinner**
  - **Atomic Level**: Atom
  - **Variants**: `inline` (para botones), `overlay` (pantalla)
  - **Props**: `size`, `color`
  - **Estado actual**: No existe. Estado loading se hace con texto "Cargando..." sin animación.

- [ ] **UI-PLAN-1.5 Avatar**
  - **Atomic Level**: Atom
  - **Variants**: `circular` (foto barbero), `initials` (fallback sin foto)
  - **Props**: `src`, `alt`, `size` (sm/md/lg)
  - **Estado actual**: `nav-logo` 42px circular. Sin fallback a iniciales.

- [ ] **UI-PLAN-2.1 Navigation**
  - **Atomic Level**: Molecule
  - **Variants**: `landing` (con hamburger mobile), `admin` (con tabs, bottom-nav mobile)
  - **Props**: `active-tab`, `user-name`, `role`, `show-owner-tabs`
  - **Dependencies**: Button (logout), Avatar (logo)
  - **Estado actual**: Duplicado en verbatim en 7 archivos admin. ~80 líneas de CSS + HTML por página.

- [ ] **UI-PLAN-2.2 Toolbar**
  - **Atomic Level**: Molecule
  - **Variants**: `date-picker` (agenda), `search` (clientes), `title-only` (recurrentes)
  - **Props**: `title`, `date`, `show-barbero-select`, `show-search`
  - **Dependencies**: Button (cal nav), CustomSelect (barbero selector)
  - **Estado actual**: Existe en agenda.html y recurrentes.html con patrones similares pero sin reutilización.

- [ ] **UI-PLAN-2.3 Card**
  - **Atomic Level**: Molecule
  - **Variants**: `default` (hover border gold), `stat` (valor grande + label), `editable` (border gold cuando editing), `interactive` (cursor pointer)
  - **Props**: `variant`, `editing`, `onClick`
  - **Dependencies**: Design tokens
  - **Estado actual**: `.stat-card`, `.barbero-card`, `.card` (recurrentes), `.promo-card`, `.servicio-card` — 5 implementaciones separadas.

- [ ] **UI-PLAN-2.4 CustomSelect**
  - **Atomic Level**: Molecule
  - **Variants**: `default`, `with-price` (opción con `.precio-tag`)
  - **Props**: `options`, `value`, `placeholder`, `disabled`, `onchange`
  - **Accessibility**: Falta `aria-expanded`, `aria-haspopup`, `role="listbox"`, `role="option"`, `aria-selected`
  - **Dependencies**: Design tokens, keyboard navigation (↑↓ Enter Esc)
  - **Estado actual**: Implementado en landing para servicios. No reutilizable. Sin a11y.

- [ ] **UI-PLAN-2.5 DayPicker**
  - **Atomic Level**: Molecule
  - **Variants**: `compact` (landing), `inline` (modal admin)
  - **Props**: `available-dates`, `selected`, `onSelect`, `loading`
  - **Accessibility**: Falta `role="radiogroup"`, `role="radio"`, `aria-checked`, keyboard nav
  - **Estado actual**: Existe en landing y en `buildDayChips` (agenda.html). Dos implementaciones.

- [ ] **UI-PLAN-2.6 SlotPicker**
  - **Atomic Level**: Molecule
  - **Variants**: `default`, `with-busy-state`
  - **Props**: `slots`, `selected`, `onSelect`, `loading`, `occupied`
  - **Accessibility**: `role="radiogroup"`, `aria-checked`, `aria-disabled`
  - **Estado actual**: Existe en landing y `buildSlotChips` (agenda.html). Dos implementaciones.

- [ ] **UI-PLAN-2.7 Modal**
  - **Atomic Level**: Molecule
  - **Variants**: `confirm` (landing), `form` (admin agregar/editar), `alert` (eliminar)
  - **Props**: `open`, `title`, `onClose`, `footer-actions`
  - **Accessibility**: Falta focus trap, `role="dialog"`, `aria-modal`, `aria-labelledby`, `Escape` key close
  - **Estado actual**: `<dialog>` nativo en admin (correcto). Modal confirm en landing como div flotante.

- [ ] **UI-PLAN-2.8 Toast / Alert inline**
  - **Atomic Level**: Molecule
  - **Variants**: `success`, `error`, `info`, `warning`
  - **Props**: `message`, `variant`, `duration` (auto-dismiss)
  - **Accessibility**: `role="status"` o `role="alert"`, `aria-live="polite"` o `"assertive"`
  - **Estado actual**: No existe. Errores se muestran con `alert()` nativo o texto inline sin sistema.

- [ ] **UI-PLAN-3.1 AdminLayout**
  - **Atomic Level**: Organism
  - **Variants**: `barbero` (sin owner tabs), `owner` (con barbero selector y tabs extra)
  - **Props**: `active-page`, `barbero-id`, `role`
  - **Dependencies**: Navigation, BottomNav (mobile)
  - **Estado actual**: No existe como componente. Cada admin page define su propia nav + layout.

- [ ] **UI-PLAN-3.2 ReservationForm**
  - **Atomic Level**: Organism
  - **Variants**: —
  - **Props**: `barberos`, `servicios`, `onSubmit`
  - **Dependencies**: BarberSelector, CustomSelect, DayPicker, SlotPicker, Button, Input
  - **Estado actual**: Implementado en `main.js` como lógica monolítica. No desacoplado.

- [ ] **UI-PLAN-3.3 BarberSelector**
  - **Atomic Level**: Organism
  - **Variants**: `cards` (landing), `pills` (dashboard admin)
  - **Props**: `barberos`, `selected`, `onSelect`
  - **Accessibility**: `role="radiogroup"`, `aria-checked` por card/pill
  - **Estado actual**: `.barberos-grid` en landing + `.bselector` en dashboard. Sin a11y.

---

## Component Items

### TASK 1 — Design Token System (Fundación)

- [ ] **UI-ITEM-1.1 Completar token de espaciado**
  - **Problema**: No existe escala de espaciado. Padding/margin hardcodeados como `0.5rem`, `1rem`, `1.5rem`, `2rem` en cada regla.
  - **Fix**: Definir escala 4px base en `style.css`:
    ```css
    :root {
      --space-1: 0.25rem;   /*  4px */
      --space-2: 0.5rem;    /*  8px */
      --space-3: 0.75rem;   /* 12px */
      --space-4: 1rem;      /* 16px */
      --space-5: 1.25rem;   /* 20px */
      --space-6: 1.5rem;    /* 24px */
      --space-8: 2rem;      /* 32px */
      --space-10: 2.5rem;   /* 40px */
      --space-12: 3rem;     /* 48px */
    }
    ```

- [ ] **UI-ITEM-1.2 Tokens de border-radius**
  - **Problema**: `border-radius` hardcodeado como `4px`, `8px`, `10px`, `12px`, `20px`, `50%` sin escala.
  - **Fix**:
    ```css
    :root {
      --radius-sm:   4px;
      --radius-md:   8px;
      --radius-lg:   12px;
      --radius-xl:   20px;
      --radius-full: 9999px;
    }
    ```

- [ ] **UI-ITEM-1.3 Tokens de sombra**
  - **Problema**: `box-shadow` inline en `.slot-btn.selected`, `.confirm-wrap`, `.modal`. Sin escala.
  - **Fix**:
    ```css
    :root {
      --shadow-sm:   0 1px 4px rgba(0,0,0,0.4);
      --shadow-md:   0 4px 16px rgba(0,0,0,0.5);
      --shadow-gold: 0 0 0 3px rgba(201,168,76,0.25);
    }
    ```

- [ ] **UI-ITEM-1.4 Tokens semánticos de color**
  - **Problema**: `--gold`, `--red`, `--green` son valores de paleta, no semánticos. Un botón de acción usa `--gold` directamente en vez de `--color-action`.
  - **Fix**: Capa semántica encima de la paleta:
    ```css
    :root {
      /* Acción */
      --color-action:         var(--gold);
      --color-action-hover:   #d4b560;
      --color-action-dim:     rgba(201,168,76,0.08);
      --color-action-focus:   rgba(201,168,76,0.25);
      /* Feedback */
      --color-success:        var(--green);
      --color-error:          var(--red);
      --color-warning:        #e6a817;
      --color-info:           #60a5fa;
      /* Texto */
      --color-text-primary:   var(--text);
      --color-text-secondary: var(--muted);
      --color-text-disabled:  #3d3830;
      /* Superficie */
      --color-bg:             var(--bg);
      --color-surface:        var(--surface);
      --color-border:         var(--border);
      --color-border-focus:   var(--gold);
    }
    ```

- [ ] **UI-ITEM-1.5 Tokens de tipografía**
  - **Problema**: Tamaños de fuente hardcodeados (`0.65rem`, `0.7rem`, `0.75rem`, `0.8rem`, `0.9rem`, `1rem`, `1.25rem`, `2.4rem`).
  - **Fix**:
    ```css
    :root {
      --text-xs:   0.65rem;   /* captions muy pequeñas */
      --text-sm:   0.75rem;   /* labels, badges */
      --text-base: 0.875rem;  /* body */
      --text-md:   1rem;      /* default */
      --text-lg:   1.25rem;   /* section titles */
      --text-xl:   1.5rem;    /* headings */
      --text-2xl:  2rem;      /* stat-big */
      --text-3xl:  2.4rem;    /* hero numbers */
    }
    ```

- [ ] **UI-ITEM-1.6 Tokens de transición**
  - **Problema**: `transition` hardcodeado en cada regla. A veces `200ms`, a veces `300ms`, a veces el cubic-bezier premium.
  - **Fix**:
    ```css
    :root {
      --transition-fast:    all 150ms ease;
      --transition-base:    all 200ms ease;
      --transition-slow:    all 300ms ease;
      --transition-premium: all 400ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    ```

- [ ] **UI-ITEM-1.7 Tokens de breakpoint**
  - **Problema**: Media queries hardcodeadas (`480px`, `630px`, `768px`) sin tokens. En CSS puro no se pueden usar vars en media queries; documentar como constantes de referencia en comentario.
  - **Fix**: Documentar como constantes en `style.css` y como variables JS exportables:
    ```css
    /*
     * Breakpoints — usar estos valores en @media queries:
     * --bp-sm:  480px  (móvil pequeño)
     * --bp-md:  630px  (móvil grande)
     * --bp-lg:  768px  (tablet)
     * --bp-xl: 1024px  (desktop)
     */
    ```

---

### TASK 2 — Extracción de CSS Admin Compartido

- [ ] **UI-ITEM-2.1 Crear `public/css/admin.css`**
  - **Problema**: Cada una de las 7 páginas admin (`agenda.html`, `horarios.html`, `recurrentes.html`, `dashboard.html`, `clientes.html`, `configuracion.html`, `login.html`) tiene un bloque `<style>` con ~300 líneas de CSS. Al menos ~200 líneas son idénticas en todas (variables, nav, botones, formularios, responsive).
  - **Solución**: Crear `public/css/admin.css` con el CSS compartido. Cada página solo mantiene sus estilos propios en el `<style>` inline.
  - **Contenido a extraer** (estimado 200+ líneas por página → ~200 líneas shared):
    - Reset + base (box-sizing, body)
    - Todas las variables CSS (`:root {}`)
    - Componente Nav (`.nav`, `.nav-brand`, `.nav-tabs`, `.nav-tab`, `.nav-right`, `.nav-user`, `.nav-logout`)
    - Bottom nav mobile (`.bottom-nav`, `.bottom-tab`)
    - Botones (`.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-cancel`)
    - Inputs (`.field`, `.field label`, `input`, `select`, `textarea`)
    - Modal (`.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`)
    - Helpers (`.slots-msg`, `.loading`, `.empty`, `.edit-loading`)
    - Responsive base

- [ ] **UI-ITEM-2.2 Reemplazar `<style>` inline en todas las páginas admin**
  - Para cada página: agregar `<link rel="stylesheet" href="/css/admin.css">` y eliminar todo lo que esté en el shared set.
  - Mantener solo el CSS específico de la página en el `<style>` remanente.
  - **Archivos a modificar**: 7 archivos en `public/admin/`

- [ ] **UI-ITEM-2.3 Alinear nombres de clases entre páginas**
  - **Problema**: Mismos conceptos usan nombres distintos:
    - Botón primario: `.btn-add` (recurrentes) vs `.btn-primary` (clientes) vs `.btn-confirm-cal` (landing)
    - Selector: `.barbero-select` vs `.bsel-btn` — diferentes patrones para elegir barbero
    - Card: `.card` vs `.stat-card` vs `.barbero-card` — sin jerarquía clara
  - **Fix**: Estandarizar en un sistema BEM-lite:
    ```
    .btn                    → base
    .btn--primary           → variante dorada
    .btn--ghost             → variante outline
    .btn--danger            → variante roja
    .btn--sm                → tamaño pequeño

    .card                   → base
    .card--stat             → con número grande
    .card--editable         → con border gold en editing
    .card--interactive      → cursor pointer + hover

    .badge                  → base
    .badge--gold            → acento activo
    .badge--muted           → inactivo
    .badge--success         → verde
    .badge--error           → rojo
    ```

---

### TASK 3 — Accesibilidad

- [ ] **UI-ITEM-3.1 Arreglar CustomSelect (WCAG 2.1 AA)**
  - **Archivo**: `public/js/main.js` — función que inicializa `#custom-select-servicio`
  - **Problemas**:
    - El trigger no tiene `aria-expanded`
    - El dropdown no tiene `role="listbox"`
    - Las opciones no tienen `role="option"` ni `aria-selected`
    - No hay navegación por teclado (↑↓ Enter Esc)
    - No hay `aria-activedescendant` en el trigger
  - **Fix**:
    ```html
    <!-- Trigger -->
    <div class="custom-select-trigger"
         role="combobox"
         aria-haspopup="listbox"
         aria-expanded="false"
         aria-controls="select-servicio-list"
         tabindex="0">
      <span id="select-servicio-display">Seleccioná un servicio</span>
      <svg aria-hidden="true">...</svg>
    </div>

    <!-- Dropdown -->
    <ul id="select-servicio-list"
        class="custom-select-dropdown"
        role="listbox"
        aria-label="Servicios disponibles">
      <li role="option" aria-selected="false" data-value="Corte">Corte</li>
      ...
    </ul>
    ```
  - **JS adicional**: keyboard handler (↑↓ mueve foco, Enter/Space selecciona, Esc cierra, Home/End primero/último)

- [ ] **UI-ITEM-3.2 BarberSelector — añadir roles y keyboard nav**
  - **Archivo**: `public/js/main.js` — función que renderiza `#barberos-grid`
  - **Problemas**: Las cards se seleccionan con click pero no son accesibles con teclado ni screen reader.
  - **Fix**:
    ```html
    <div id="barberos-grid" role="radiogroup" aria-labelledby="barberos-label">
      <div class="barbero-card"
           role="radio"
           aria-checked="false"
           tabindex="0"
           data-id="gebyano">
        <span class="barbero-nombre">Gebyano</span>
      </div>
    </div>
    ```
  - **JS adicional**: `keydown` → Space/Enter toggle selected, ←→ roving tabindex entre cards

- [ ] **UI-ITEM-3.3 DayPicker — añadir roles**
  - **Archivo**: `public/js/main.js` — `renderDays()`
  - **Fix**:
    ```html
    <div id="day-picker" role="radiogroup" aria-label="Elegí un día">
      <button class="day-btn"
              role="radio"
              aria-checked="false"
              aria-label="Lunes 15 de marzo">
        <span class="day-name" aria-hidden="true">Lun</span>
        <span class="day-num" aria-hidden="true">15</span>
        <span class="day-month" aria-hidden="true">Mar</span>
      </button>
    </div>
    ```

- [ ] **UI-ITEM-3.4 SlotPicker — añadir roles y estado**
  - **Archivo**: `public/js/main.js` — `renderSlots()` + `buildSlotChips` (agenda.html)
  - **Fix**:
    ```html
    <div id="slot-picker" role="radiogroup" aria-label="Elegí un horario">
      <button class="slot-btn"
              role="radio"
              aria-checked="false"
              aria-disabled="false">10:00</button>
      <button class="slot-btn slot-busy"
              role="radio"
              aria-checked="false"
              aria-disabled="true"
              disabled>10:30</button>
    </div>
    ```

- [ ] **UI-ITEM-3.5 Confirmación — aria-live region**
  - **Archivo**: `public/index.html` + `public/js/main.js`
  - **Problema**: Cuando se confirma una reserva, el contenido del formulario se reemplaza con la confirmación. Los screen readers no anuncian el cambio.
  - **Fix**:
    ```html
    <!-- Agregar al wrapper del formulario -->
    <div aria-live="polite" aria-atomic="true" id="reserva-status-announcer" class="sr-only"></div>
    ```
    ```js
    // En el paso de confirmación exitosa:
    document.getElementById('reserva-status-announcer').textContent =
      '¡Turno reservado! ' + detalles;
    ```
  - **CSS utility para sr-only**:
    ```css
    .sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
    ```

- [ ] **UI-ITEM-3.6 Modal admin — focus trap**
  - **Archivo**: `public/admin/agenda.html`
  - **Problema**: El `<dialog>` nativo ya maneja focus trap en browsers modernos, pero el cierre con `Escape` y el return focus al elemento trigger deben ser explícitos.
  - **Fix**: En el JS de apertura/cierre del modal:
    ```js
    // Guardar referencia al trigger antes de abrir
    let lastFocused = null;
    function openModal() {
      lastFocused = document.activeElement;
      modal.showModal();
    }
    function closeModal() {
      modal.close();
      lastFocused?.focus(); // Devolver foco al trigger
    }
    ```

- [ ] **UI-ITEM-3.7 Nav tabs admin — aria-current**
  - **Archivo**: Todas las páginas admin
  - **Problema**: El tab activo no tiene `aria-current="page"`.
  - **Fix**: Agregar `aria-current="page"` al `.nav-tab.active` en cada página.
    ```html
    <a href="/admin/agenda/" class="nav-tab active" aria-current="page">Agenda</a>
    ```

- [ ] **UI-ITEM-3.8 Botones icon-only — aria-label**
  - **Archivos**: `agenda.html` (`.btn-cal`, flechas de nav de calendario)
  - **Problema**: Botones de flecha `←` `→` no tienen `aria-label`.
  - **Fix**: `aria-label="Día anterior"`, `aria-label="Día siguiente"`, `aria-label="Mes anterior"`, etc.

- [ ] **UI-ITEM-3.9 Inputs sin label visible en admin**
  - **Archivos**: Forms en modales de `agenda.html`
  - **Problema**: Algunos inputs tienen `placeholder` pero no `<label>` asociado. Placeholder no es sustituto de label.
  - **Fix**: Agregar `<label for="m-nombre">Nombre del cliente</label>` a cada input en modales, o usar `aria-label` si el label visible no cabe.

---

### TASK 4 — Componente Toast / Notificaciones

- [ ] **UI-ITEM-4.1 Implementar sistema de Toast**
  - **Problema**: Los errores y confirmaciones admin usan `alert()` nativo o texto inline sin sistema consistente.
  - **API**:
    ```js
    // public/js/toast.js (ES Module)
    export function showToast(message, { variant = 'success', duration = 3500 } = {}) {
      // Crea div .toast.toast--{variant}, lo inserta en #toast-container
      // Animación slide-in desde abajo, auto-dismiss después de duration
      // aria-live="polite" para success/info, aria-live="assertive" para error
    }
    ```
  - **HTML requerido** (agregar a cada admin page o en admin.css):
    ```html
    <div id="toast-container" aria-live="polite" aria-atomic="true"></div>
    ```
  - **CSS**:
    ```css
    #toast-container {
      position: fixed; bottom: var(--space-6); right: var(--space-6);
      z-index: 999; display: flex; flex-direction: column; gap: var(--space-2);
    }
    .toast {
      padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
      font-family: var(--font-mono); font-size: var(--text-sm);
      background: var(--color-surface); border: 1px solid var(--color-border);
      color: var(--color-text-primary); max-width: 320px;
      animation: toast-in 250ms var(--transition-premium);
    }
    .toast--success { border-color: var(--color-success); }
    .toast--error   { border-color: var(--color-error); }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    ```
  - **Reemplazar**: Todos los `alert(error || 'Error al guardar')` en `agenda.html`, `recurrentes.html`, `clientes.html`

---

### TASK 5 — Componente AdminLayout compartido

- [ ] **UI-ITEM-5.1 Extraer HTML de nav como include template**
  - **Problema**: El HTML del nav admin es idéntico en 7 páginas. Un cambio (nuevo tab, nuevo link) requiere editar 7 archivos.
  - **Solución A (sin build)**: Cargar el nav via fetch en un `<div id="nav-placeholder">` al load de cada página. Un JS pequeño hace `fetch('/admin/_nav.html')` e inserta el HTML.
  - **Solución B (mejor)**: Crear un Web Component `<admin-nav active="agenda">` que renderiza el nav completo.

  **Implementar Solución A (mínima fricción, sin nueva infraestructura)**:
  ```html
  <!-- En cada admin page, reemplazar el bloque <nav>...</nav> por: -->
  <div id="nav-placeholder"></div>

  <!-- Al final del <script> de cada página, agregar: -->
  <script>
    fetch('/admin/_nav.html')
      .then(r => r.text())
      .then(html => {
        document.getElementById('nav-placeholder').innerHTML = html;
        // Marcar tab activo
        const activeTab = document.querySelector(`.nav-tab[href="${location.pathname}"]`);
        if (activeTab) { activeTab.classList.add('active'); activeTab.setAttribute('aria-current','page'); }
      });
  </script>
  ```

  **Crear** `public/admin/_nav.html`:
  ```html
  <nav class="nav">
    <div class="nav-brand">
      <img src="/img/logo.jpg" alt="Barbería Gebyanos" class="nav-logo">
      <span class="nav-title nav-tab-barbero">Gebyanos</span>
    </div>
    <div class="nav-tabs">
      <a href="/admin/agenda/" class="nav-tab">Agenda</a>
      <a href="/admin/recurrentes/" class="nav-tab">Recurrentes</a>
      <a href="/admin/clientes/" class="nav-tab">Clientes</a>
      <a href="/admin/horarios/" class="nav-tab nav-tab-owner" style="display:none">Horarios</a>
      <a href="/admin/config/" class="nav-tab nav-tab-owner" style="display:none">Config</a>
      <a href="/admin/dashboard/" class="nav-tab nav-tab-owner" style="display:none">Stats</a>
    </div>
    <div class="nav-right">
      <span id="nav-user" class="nav-user"></span>
      <button class="nav-logout" id="nav-logout">Salir</button>
    </div>
  </nav>
  ```

---

### TASK 6 — Optimizaciones de Componentes Existentes

- [ ] **UI-ITEM-6.1 Consolidar implementaciones de DayPicker**
  - **Problema**: Hay 3 implementaciones:
    1. Landing: `renderDays()` en `main.js`
    2. Admin modal agregar: `buildDayChips()` en `agenda.html`
    3. Admin recurrentes: `getProximosDias()` + chips en `recurrentes.html`
  - **Solución**: Crear `public/js/day-picker.js` como ES Module reutilizable:
    ```js
    /**
     * Renderiza chips de días en un contenedor dado.
     * @param {HTMLElement} container
     * @param {{ fecha: string, disabled: boolean }[]} days
     * @param {string|null} selectedFecha — fecha activa inicial
     * @param {(fecha: string) => void} onChange
     */
    export function renderDayChips(container, days, selectedFecha, onChange) { ... }
    ```

- [ ] **UI-ITEM-6.2 Consolidar implementaciones de SlotPicker**
  - **Problema**: Existe en `main.js` (landing) y `buildSlotChips()` (agenda.html). Lógica de "ocupado" distinta en cada una.
  - **Solución**: Crear `public/js/slot-picker.js`:
    ```js
    /**
     * @param {HTMLElement} container
     * @param {{ hora: string, duracion: number, disabled: boolean }[]} slots
     * @param {string|null} selectedHora
     * @param {(hora: string) => void} onChange
     */
    export function renderSlotChips(container, slots, selectedHora, onChange) { ... }
    ```

- [ ] **UI-ITEM-6.3 Extraer lógica de sesión admin a `admin-auth.js`**
  - **Problema**: Cada página admin tiene su propio bloque de validación de sesión (fetch `/admin/api/me`, redirect si 401, setear `sessionBarbero`, inicializar `barbero-select` para owner). Es idéntico en 7 páginas.
  - **Solución**: Crear `public/js/admin-auth.js`:
    ```js
    /**
     * Verifica sesión y devuelve { barbero_id, role }.
     * Redirige a /admin/ si no hay sesión.
     * Configura barbero-select para owners.
     */
    export async function initAdminSession() { ... }
    ```

- [ ] **UI-ITEM-6.4 Botón de loading state**
  - **Problema**: No existe patrón consistente de estado loading en botones. Algunos deshabilitan, otros no dan feedback.
  - **Solución**: Agregar clase `.btn--loading` con spinner CSS:
    ```css
    .btn--loading {
      position: relative;
      color: transparent !important;
      pointer-events: none;
    }
    .btn--loading::after {
      content: '';
      position: absolute;
      inset: 0; margin: auto;
      width: 16px; height: 16px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 600ms linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    ```
  - **JS helper**:
    ```js
    export function setButtonLoading(btn, loading) {
      btn.classList.toggle('btn--loading', loading);
      btn.disabled = loading;
    }
    ```

---

### TASK 7 — Documentación de Componentes

- [ ] **UI-ITEM-7.1 Crear `public/admin/ui-catalog.html`** (dev-only, sin link en nav)
  - Un catálogo visual de todos los componentes con todos sus estados y variantes.
  - Incluye: botones, inputs, badges, cards, chips, modales, toasts.
  - Sirve como referencia para nuevos desarrollos y revisiones de QA.
  - No es Storybook (sin dependencias), es HTML estático interactivo.

- [ ] **UI-ITEM-7.2 Comentar patrones en `style.css`**
  - Agregar headings y comentarios sección por sección:
    ```css
    /* ═══════════════════════════════════════════════════════
       DESIGN TOKENS
       Fuente de verdad para colores, tipografía, espaciado.
       NO hardcodear estos valores en ningún otro lugar.
    ═══════════════════════════════════════════════════════ */
    ```

- [ ] **UI-ITEM-7.3 Documentar contratos de clases en `COMPONENTS.md`**
  - Un archivo markdown con la API de cada componente CSS:
    - Nombre de clase base
    - Modificadores disponibles
    - HTML mínimo requerido
    - Estados (hover, focus, active, disabled, loading)
    - Ejemplo de uso

---

## Proposed Code Changes

### File: `public/css/admin.css` (nuevo)
```css
/* admin.css — Estilos compartidos de todas las páginas admin */
/* Importar antes de cualquier <style> inline específico de página */

:root {
  /* Paleta */
  --bg:      #0c0b09;
  --surface: #141210;
  --border:  #2a2620;
  --gold:    #c9a84c;
  --text:    #e8dcc8;
  --muted:   #6b6055;
  --green:   #6dbf7e;
  --red:     #e57373;
  --font-serif: 'Playfair Display', serif;
  --font-mono:  'DM Mono', monospace;

  /* Semánticos (UI-ITEM-1.4) */
  --color-action:      var(--gold);
  --color-action-dim:  rgba(201,168,76,0.08);
  --color-action-focus:rgba(201,168,76,0.25);
  --color-success:     var(--green);
  --color-error:       var(--red);
  --color-text-primary:   var(--text);
  --color-text-secondary: var(--muted);
  --color-bg:          var(--bg);
  --color-surface:     var(--surface);
  --color-border:      var(--border);

  /* Espaciado (UI-ITEM-1.1) */
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
  --space-4: 1rem;    --space-5: 1.25rem; --space-6: 1.5rem;
  --space-8: 2rem;    --space-10: 2.5rem; --space-12: 3rem;

  /* Radios (UI-ITEM-1.2) */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --radius-xl: 20px; --radius-full: 9999px;

  /* Sombras (UI-ITEM-1.3) */
  --shadow-sm:   0 1px 4px rgba(0,0,0,0.4);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.5);
  --shadow-gold: 0 0 0 3px rgba(201,168,76,0.25);

  /* Transiciones (UI-ITEM-1.6) */
  --transition-fast:    all 150ms ease;
  --transition-base:    all 200ms ease;
  --transition-premium: all 400ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg); color: var(--text);
  font-family: var(--font-mono); min-height: 100vh;
}

/* Accesibilidad (UI-ITEM-3.5) */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

/* Nav */
.nav { /* ... extraído de admin pages ... */ }
.nav-tab[aria-current="page"] { color: var(--gold); background: var(--color-action-dim); }

/* Botones */
.btn { /* base */ }
.btn--primary { background: var(--color-action); color: var(--bg); }
.btn--ghost { border: 1px solid var(--color-border); color: var(--text); }
.btn--danger { border-color: var(--color-error); color: var(--color-error); }
.btn--loading { /* UI-ITEM-6.4 */ }

/* Cards */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.card--interactive:hover { border-color: var(--color-action); transition: var(--transition-base); }

/* Toast (UI-ITEM-4.1) */
#toast-container { position: fixed; bottom: var(--space-6); right: var(--space-6); z-index: 999; }
/* ... */
```

### File: `public/js/toast.js` (nuevo — ES Module)
```js
// Toast system — importar en cada admin page
const container = (() => {
  const el = document.createElement('div');
  el.id = 'toast-container';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  document.body.appendChild(el);
  return el;
})();

export function showToast(message, { variant = 'success', duration = 3500 } = {}) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}
```

---

## Commands

```bash
# Verificar que admin.css no rompe ninguna página
npx wrangler pages dev ./public

# Validar accesibilidad con axe-core CLI (instalar una vez)
npx axe https://localhost:8788/admin/agenda/ --tags wcag2a,wcag2aa

# Validar accesibilidad landing
npx axe https://localhost:8788/ --tags wcag2a,wcag2aa

# Comparar tamaño de CSS antes/después de extraer admin.css
wc -c public/css/style.css public/css/admin.css

# Verificar que no queden colores hardcodeados en CSS (fuera de tokens)
grep -rn "#[0-9a-fA-F]\{3,6\}" public/css/ --include="*.css"
grep -rn "rgb\|rgba\|hsl" public/css/ --include="*.css"
```

---

## Quality Assurance Task Checklist

- [ ] Todos los componentes pasan axe-core sin violaciones WCAG 2.1 AA
- [ ] No hay colores, tamaños ni espaciados hardcodeados fuera de los design tokens
- [ ] El CSS admin.css carga correctamente en las 7 páginas admin sin romper estilos
- [ ] CustomSelect, BarberSelector, DayPicker, SlotPicker son navegables por teclado
- [ ] Los modales admin hacen focus trap y devuelven foco al cerrar
- [ ] Cambios dinámicos (confirmación, errores) son anunciados por aria-live
- [ ] Botones con acción tienen aria-label cuando no tienen texto visible
- [ ] El nav activo tiene aria-current="page" en todas las páginas
- [ ] El sistema de Toast reemplaza todos los `alert()` nativos del panel admin
- [ ] No hay estilos duplicados entre `admin.css` y los `<style>` inline de cada página

---

## Prioridad de Ejecución Sugerida

| Prioridad | Ítems | Impacto | Esfuerzo |
|-----------|-------|---------|---------|
| **1 — Alta** | UI-ITEM-2.1, 2.2 (admin.css) | Elimina ~1400 líneas de CSS duplicado | Medio |
| **2 — Alta** | UI-ITEM-3.1 a 3.4 (a11y selectores) | WCAG 2.1 AA en flujo de reserva | Medio |
| **3 — Media** | UI-ITEM-4.1 (Toast) | Reemplaza alert() en admin | Bajo |
| **4 — Media** | UI-ITEM-6.3 (admin-auth.js) | Elimina lógica sesión duplicada × 7 | Bajo |
| **5 — Media** | UI-ITEM-1.1–1.7 (tokens) | Sistematiza tokens faltantes | Bajo |
| **6 — Baja** | UI-ITEM-6.1, 6.2 (day/slot modules) | Unifica implementaciones | Alto |
| **7 — Baja** | UI-ITEM-7.1–7.3 (docs) | Documentación dev | Bajo |
