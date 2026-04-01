// public/js/reserva.js
// Lógica del formulario de reserva: selección de barbero,
// submit del form, confirmación y WA redirect.
import { escapeHtml } from './ui-utils.js';
import { BARBEROS_FALLBACK, ESPECIALIDADES } from './config.js';

// Poblado en DOMContentLoaded desde /api/barberos; fallback a hardcodeado si la API falla
export let BARBEROS = [...BARBEROS_FALLBACK];

export function setBarberos(nuevos) {
  BARBEROS = nuevos;
}

export function initReservaForm() {
  // Pre-completar nombre desde cookie si existe
  const cookieMatch = document.cookie.match(/gb_nombre=([^;]+)/);
  if (cookieMatch) {
    const input = document.getElementById('reserva-nombre');
    if (input && !input.value) input.value = decodeURIComponent(cookieMatch[1]);
  }

  const form = document.getElementById('reserva-form');
  const grid = document.getElementById('barberos-grid');
  const btn  = document.getElementById('reserva-btn');
  if (!form || !grid || !btn) return;

  // Renderizar cards de barberos
  grid.innerHTML = '';
  grid.setAttribute('role', 'radiogroup');
  grid.setAttribute('aria-label', 'Barbero');
  BARBEROS.forEach(b => {
    const card = document.createElement('div');
    card.className = 'barbero-card' + (!b.disponible ? ' barbero-no-disponible' : '');
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('aria-disabled', b.disponible ? 'false' : 'true');
    card.setAttribute('tabindex', b.disponible ? '0' : '-1');
    const inicial = b.nombre.charAt(0).toUpperCase();
    const especialidad = ESPECIALIDADES[b.id] || '';
    card.innerHTML = `
      <div class="barbero-avatar">${inicial}</div>
      <span class="barbero-nombre">${escapeHtml(b.nombre)}</span>
      ${b.disponible
        ? `<span class="barbero-especialidad">${especialidad}</span>`
        : '<span class="barbero-badge">Próximamente</span>'
      }
    `;

    if (b.disponible) {
      const select = () => {
        grid.querySelectorAll('.barbero-card').forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        document.dispatchEvent(new CustomEvent('barberoSeleccionado', { detail: b }));
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    }

    grid.appendChild(card);
  });

  // El botón submit es manejado por initCalendarPicker()
  // Prevenir submit nativo del form
  form.addEventListener('submit', (e) => e.preventDefault());
}
