/**
 * Gebyanos - Main JS
 * Entry point de la aplicación.
 */
import { initCustomCursor, initHamburgerMenu, initNavScroll, initScrollReveal, initTextScramble, initMagneticButtons } from './cursor.js';
import { renderCatalogo, renderPromos, updateServicioDropdown } from './catalogo.js';
import { initCalendarPicker } from './calendar-picker.js';
import { initReservaForm, setBarberos } from './reserva.js';
import { initMiTurno } from './mi-turno-section.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Iniciar fetches sin bloquear — las animaciones arrancan de inmediato
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

    // Esperar barberos solo antes de las funciones que los necesitan
    try {
        const r = await barberosFetch;
        if (r?.ok) setBarberos(await r.json());
    } catch { /* usa fallback hardcodeado */ }

    // Render catálogo + precios iniciales en el dropdown de reserva
    try {
        const r = await catalogoFetch;
        if (r?.ok) {
            const items = await r.json();
            renderCatalogo(items);
            updateServicioDropdown(items); // mostrar precios antes de elegir barbero
        }
    } catch { /* grid queda vacío — fallback en CSS no requerido */ }

    // Render promos
    try {
        const r = await promosFetch;
        if (r?.ok) renderPromos(await r.json());
    } catch { /* sección promos queda oculta */ }

    initReservaForm();
    initCalendarPicker();
    initMiTurno();
});

/**
 * Custom Select Logic
 */
function initCustomSelect() {
  const select = document.getElementById('custom-select-servicio');
  const trigger = select?.querySelector('.custom-select-trigger');
  const dropdown = select?.querySelector('.custom-select-dropdown');
  const display = document.getElementById('select-servicio-display');
  const hiddenInput = document.getElementById('servicio-value');
  if (!select) return;

  const open  = () => { select.classList.add('open');    trigger.setAttribute('aria-expanded', 'true'); };
  const close = () => { select.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };

  trigger.addEventListener('click', () => select.classList.contains('open') ? close() : open());

  // Teclado: Enter/Space abren; Escape cierra
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select.classList.contains('open') ? close() : open(); }
    if (e.key === 'Escape') close();
  });

  // Delegación: funciona con opciones re-renderizadas dinámicamente
  dropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.select-option');
    if (!option) return;
    const value = option.getAttribute('data-value');
    const nameText  = option.childNodes[0].textContent.trim();
    const priceText = option.querySelector('.precio-tag')?.textContent;
    display.textContent = priceText ? `${nameText} — ${priceText}` : nameText;
    display.style.color = 'var(--text)';
    hiddenInput.value = value;

    document.dispatchEvent(new Event('servicioSeleccionado'));

    dropdown.querySelectorAll('.select-option').forEach(o => {
      o.classList.remove('selected');
      o.setAttribute('aria-selected', 'false');
    });
    option.classList.add('selected');
    option.setAttribute('aria-selected', 'true');
    close();
  });

  // Cerrar al clickear afuera
  document.addEventListener('click', (e) => {
    if (!select.contains(e.target)) close();
  });
}
