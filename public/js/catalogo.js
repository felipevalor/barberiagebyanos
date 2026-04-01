// public/js/catalogo.js
// Renderizado del catálogo de servicios y promos.
import { escapeHtml } from './ui-utils.js';

export function renderCatalogo(items) {
    const grid = document.getElementById('servicios-grid');
    if (!grid || !items.length) return;
    grid.innerHTML = items.map(s => {
        const precio = s.precio_ars && s.precio_ars > 0
            ? `<div class="servicio-precio">$${Number(s.precio_ars).toLocaleString('es-AR')}</div>`
            : '';
        return `<div class="servicio-card">
            <div class="servicio-nombre">${escapeHtml(s.nombre)}</div>
            <div class="servicio-incluye">${escapeHtml(s.incluye || '')}</div>
            ${precio}
        </div>`;
    }).join('');
}

export function renderPromos(promos) {
    const wrapper = document.getElementById('promos-wrapper');
    const grid = document.getElementById('promos-grid');
    if (!wrapper || !grid) return;
    const activas = promos.filter(p => p.activo !== 0);
    if (!activas.length) return;
    grid.innerHTML = activas.map(p => {
        const badge = p.badge ? `<div class="promo-badge">${escapeHtml(p.badge)}</div>` : '';
        const especial = p.badge ? ' promo-especial' : '';
        const precio = p.precio_ars && p.precio_ars > 0
            ? `$${Number(p.precio_ars).toLocaleString('es-AR')}${p.unidad ? ` <span>${escapeHtml(p.unidad)}</span>` : ''}`
            : '';
        const nota = p.nota ? `<div class="promo-nota">${escapeHtml(p.nota)}</div>` : '';
        return `<div class="promo-card${especial}">
            ${badge}
            <div class="promo-nombre">${escapeHtml(p.nombre)}</div>
            ${precio ? `<div class="promo-precio">${precio}</div>` : ''}
            ${nota}
        </div>`;
    }).join('');
    wrapper.style.display = '';
}

export function updateServicioDropdown(servicios) {
  const dropdown = document.querySelector('#custom-select-servicio .custom-select-dropdown');
  const hiddenInput = document.getElementById('servicio-value');
  if (!dropdown) return;

  const currentValue = hiddenInput?.value;

  dropdown.querySelectorAll('.select-option').forEach(opt => {
    const nombre = opt.getAttribute('data-value');
    const s = servicios.find(x => x.nombre === nombre);
    const precio = s?.precio_ars;
    // Limpiar spans de precio previos
    opt.querySelectorAll('.precio-tag').forEach(el => el.remove());
    // Reconstruir texto base (el primer text node)
    // Si existe el primer text node lo actualizamos; si no, lo dejamos
    if (precio && precio > 0) {
      const tag = document.createElement('span');
      tag.className = 'precio-tag';
      tag.textContent = '$' + precio.toLocaleString('es-AR');
      opt.appendChild(tag);
    }
  });
}
