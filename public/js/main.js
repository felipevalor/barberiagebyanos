/**
 * Gebyanos - Main JS
 * Premium Motion Design & Interactive Logic
 */
import { initCustomCursor, initHamburgerMenu, initNavScroll, initScrollReveal, initTextScramble, initMagneticButtons } from './cursor.js';
import { renderCatalogo, renderPromos, updateServicioDropdown } from './catalogo.js';
import { initCalendarPicker, buildGcalUrl, fetchD1BusySlots } from './calendar-picker.js';
import { escapeHtml } from './ui-utils.js';
import { initReservaForm, setBarberos, BARBEROS } from './reserva.js';
import { DEFAULT_SCHEDULE, SLOT_DURATION } from './config.js';

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

// ── Mi turno ──────────────────────────────────────────────────────────────────
function initMiTurno() {
  const inputNombre = document.getElementById('mi-turno-nombre');
  const inputTel    = document.getElementById('mi-turno-tel');
  const btn         = document.getElementById('mi-turno-btn');
  const result      = document.getElementById('mi-turno-result');
  if (!inputNombre || !btn || !result) return;

  const editCache = {};

  // Auto-buscar: priorizar cookie de teléfono, fallback a nombre
  const cookieTel    = document.cookie.match(/gb_tel=([^;]+)/);
  const cookieNombre = document.cookie.match(/gb_nombre=([^;]+)/);
  if (cookieTel) {
    const tel = decodeURIComponent(cookieTel[1]);
    if (inputTel) inputTel.value = tel;
    buscarTurno(tel);
  } else if (cookieNombre) {
    const nombre = decodeURIComponent(cookieNombre[1]);
    if (nombre.length >= 3) { inputNombre.value = nombre; buscarTurno(nombre); }
  }

  btn.addEventListener('click', () => {
    const tel    = inputTel?.value.trim() || '';
    const nombre = inputNombre.value.trim();
    const query  = tel.length >= 7 ? tel : nombre;
    if (query.length < 3) { (tel ? inputTel : inputNombre).focus(); return; }
    buscarTurno(query);
  });
  [inputNombre, inputTel].forEach(el => el?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  }));

  function esTelefono(query) {
    return /^\d{8,}$/.test(query.replace(/[\s\-().+]/g, ''));
  }

  async function buscarTurno(query) {
    result.innerHTML = '<div class="mi-turno-loading">Buscando...</div>';
    btn.disabled = true;
    const esTel = esTelefono(query);
    const param = esTel
      ? `telefono=${encodeURIComponent(query.replace(/[\s\-().+]/g, ''))}`
      : `nombre=${encodeURIComponent(query)}`;
    try {
      const res  = await fetch(`/api/mi-turno?${param}`);
      const data = await res.json();
      if (!data.turno) {
        result.innerHTML = '<div class="mi-turno-none">Sin turnos próximos para ese nombre.</div>';
        return;
      }
      renderCard(data.turno);
    } catch {
      result.innerHTML = '<div class="mi-turno-none">No se pudo consultar. Intentá de nuevo.</div>';
    } finally {
      btn.disabled = false;
    }
  }

  function renderCard(t) {
    const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const [d, m, y] = t.fecha.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    const fechaLabel = `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]}`;

    result.innerHTML = `
      <div class="mi-turno-card">
        <div class="mi-turno-card-fecha">${escapeHtml(fechaLabel)} · ${escapeHtml(t.hora)}</div>
        <div class="mi-turno-card-rows">
          <div class="mi-turno-card-row"><span>Barbero</span><span>${escapeHtml(t.barbero)}</span></div>
          <div class="mi-turno-card-row"><span>Servicio</span><span>${escapeHtml(t.servicio)}</span></div>
        </div>
        <div class="mi-turno-actions">
          <button class="mi-turno-edit-btn" id="btn-editar-turno">Modificar</button>
          <button class="mi-turno-cancel-btn" id="btn-cancelar-turno">Cancelar turno</button>
        </div>
      </div>
      <div id="mi-turno-extra"></div>`;

    document.getElementById('btn-editar-turno').addEventListener('click', () => showEditMode(t));
    document.getElementById('btn-cancelar-turno').addEventListener('click', () => showCancelConfirm(t));
  }

  function showCancelConfirm(t) {
    const extra = document.getElementById('mi-turno-extra');
    extra.innerHTML = `
      <div class="mi-turno-confirm-cancel">
        <p>¿Cancelar el turno del <strong>${t.fecha} a las ${t.hora}</strong>?</p>
        <div class="mi-turno-confirm-btns">
          <button id="btn-cancel-si">Sí, cancelar</button>
          <button id="btn-cancel-no">No</button>
        </div>
      </div>`;
    document.getElementById('btn-cancel-si').addEventListener('click', () => cancelarTurno(t));
    document.getElementById('btn-cancel-no').addEventListener('click', () => { extra.innerHTML = ''; });
  }

  async function cancelarTurno(t) {
    const extra = document.getElementById('mi-turno-extra');
    extra.innerHTML = '<div class="mi-turno-loading">Cancelando...</div>';

    const ctCookie  = document.cookie.match(/gb_ct=([^;]+)/);
    const cancelToken = ctCookie ? decodeURIComponent(ctCookie[1]) : '';
    const telCookie = document.cookie.match(/gb_tel=([^;]+)/);
    const tel       = telCookie ? decodeURIComponent(telCookie[1]) : '';

    let url = `/api/mi-turno?nombre=${encodeURIComponent(t.nombre)}&mensaje=${encodeURIComponent(t.mensaje)}`;
    if (cancelToken) url += `&cancel_token=${encodeURIComponent(cancelToken)}`;
    else if (tel)    url += `&telefono=${encodeURIComponent(tel)}`;

    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.status === 403) {
        extra.innerHTML = '<div class="mi-turno-none">No autorizado. Intentá desde el dispositivo donde hiciste la reserva.</div>';
        return;
      }
      if (!res.ok) throw new Error();
      result.innerHTML = '<div class="mi-turno-none">Tu turno fue cancelado.</div>';
      document.cookie = 'gb_ct=; max-age=0; Path=/';
    } catch {
      extra.innerHTML = '<div class="mi-turno-none">Error al cancelar. Intentá de nuevo.</div>';
    }
  }

  async function showEditMode(t) {
    const extra = document.getElementById('mi-turno-extra');
    extra.innerHTML = '<div class="mi-turno-loading">Cargando disponibilidad...</div>';

    const barberoConfig = BARBEROS.find(b => b.nombre === t.barbero)
      || { id: t.barbero.toLowerCase().replace(/\s+/g, ''), schedule: DEFAULT_SCHEDULE };
    let schedule = barberoConfig.schedule || DEFAULT_SCHEDULE;
    let feriados = new Set();

    try {
      const r = await fetch(`/api/horarios?barbero=${barberoConfig.id}`);
      if (r.ok) schedule = await r.json();
    } catch {}
    try {
      const rf = await fetch(`/api/feriados?barbero=${barberoConfig.id}`);
      if (rf.ok) { const { feriados: f } = await rf.json(); feriados = new Set(f); }
    } catch {}

    const today = new Date();
    const days = [];
    for (let i = 0; i < 14; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      const dow = day.getDay();
      if (!schedule[dow]) continue;
      const fechaStr = `${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}`;
      if (feriados.has(fechaStr)) continue;
      days.push(day);
    }

    extra.innerHTML = `
      <div class="mi-turno-edit-panel-inner">
        <div class="mi-turno-edit-section-label">Elegí un nuevo día</div>
        <div id="mt-edit-days"></div>
        <div id="mt-edit-slots"></div>
        <div class="mi-turno-edit-footer" id="mt-edit-footer">
          <button id="mt-confirm-edit" class="mi-turno-edit-confirm">Confirmar cambio</button>
          <button id="mt-cancel-edit" class="mi-turno-edit-cancelar">Cancelar</button>
        </div>
      </div>`;

    let selectedDay  = null;
    let selectedSlot = null;

    const daysEl   = document.getElementById('mt-edit-days');
    const slotsEl  = document.getElementById('mt-edit-slots');
    const footerEl = document.getElementById('mt-edit-footer');

    const dayGrid = document.createElement('div');
    dayGrid.className = 'day-grid';
    days.forEach(day => {
      const db = document.createElement('button');
      db.type = 'button';
      db.className = 'day-btn';
      db.innerHTML = `
        <span class="day-name">${day.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
        <span class="day-num">${day.getDate()}</span>
        <span class="day-month">${day.toLocaleDateString('es-AR', { month: 'short' })}</span>`;
      db.addEventListener('click', async () => {
        daysEl.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
        db.classList.add('selected');
        selectedDay  = day;
        selectedSlot = null;
        footerEl.style.display = 'none';
        await renderEditSlots(day, barberoConfig, schedule, slotsEl, (slot) => {
          selectedSlot = slot;
          footerEl.style.display = 'flex';
        });
      });
      dayGrid.appendChild(db);
    });
    daysEl.appendChild(dayGrid);

    document.getElementById('mt-cancel-edit').addEventListener('click', () => { extra.innerHTML = ''; });
    document.getElementById('mt-confirm-edit').addEventListener('click', async () => {
      if (!selectedDay || !selectedSlot) return;
      await submitEdit(t, selectedDay.toLocaleDateString('es-AR'), selectedSlot);
    });
  }

  async function renderEditSlots(day, barbero, schedule, container, onSelect) {
    container.innerHTML = '<div class="mi-turno-loading">Cargando horarios...</div>';
    const busySlots = await fetchEditBusy(day, barbero);
    const dow = day.getDay();
    const { start, end } = schedule[dow] || { start: 9, end: 20 };
    const duration = SLOT_DURATION;
    const now = new Date();
    const scheduleEnd = new Date(day); scheduleEnd.setHours(end, 0, 0, 0);

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'slot-grid';

    for (let h = start; h < end; h++) {
      for (let m = 0; m < 60; m += duration) {
        const slotDate = new Date(day); slotDate.setHours(h, m, 0, 0);
        if (slotDate <= now) continue;
        const slotEnd = new Date(slotDate.getTime() + duration * 60000);
        if (slotEnd > scheduleEnd) continue;
        const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        const isBusy = busySlots.some(b => slotDate < new Date(b.end) && slotEnd > new Date(b.start));
        const sb = document.createElement('button');
        sb.type = 'button';
        sb.className = 'slot-btn' + (isBusy ? ' slot-busy' : '');
        sb.textContent = timeStr;
        sb.disabled = isBusy;
        if (!isBusy) {
          sb.addEventListener('click', () => {
            grid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
            sb.classList.add('selected');
            onSelect(timeStr);
          });
        }
        grid.appendChild(sb);
      }
    }
    container.appendChild(grid);
  }

  async function fetchEditBusy(day, barbero) {
    return fetchD1BusySlots(barbero.nombre, day, barbero.id);
  }

  async function submitEdit(t, newFecha, newHora) {
    const footerEl = document.getElementById('mt-edit-footer');
    if (footerEl) footerEl.innerHTML = '<div class="mi-turno-loading">Guardando...</div>';

    const ctCookie2  = document.cookie.match(/gb_ct=([^;]+)/);
    const telCookie2 = document.cookie.match(/gb_tel=([^;]+)/);

    try {
      const res = await fetch('/api/mi-turno', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:       t.nombre,
          old_mensaje:  t.mensaje,
          new_fecha:    newFecha,
          new_hora:     newHora,
          cancel_token: ctCookie2  ? decodeURIComponent(ctCookie2[1])  : undefined,
          telefono:     telCookie2 ? decodeURIComponent(telCookie2[1]) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al modificar. Intentá de nuevo.');
      t.fecha = newFecha;
      t.hora  = newHora;
      t.mensaje = `${newFecha} ${newHora}`;
      showEditConfirmacion(t, newFecha, newHora);
    } catch (e) {
      if (footerEl) footerEl.innerHTML = `<div class="mi-turno-none">${e.message || 'Error al modificar. Intentá de nuevo.'}</div>`;
    }
  }

  function showEditConfirmacion(t, newFecha, newHora) {
    const extra = document.getElementById('mi-turno-extra');
    if (!extra) return;
    const gcalUrl = buildGcalUrl({ servicio: t.servicio, barbero: t.barbero, fecha: newFecha, hora: newHora });
    extra.innerHTML = `
      <div class="mi-turno-edit-panel-inner" style="text-align:center;padding:1.5rem 1.25rem;">
        <div style="color:var(--gold);font-size:1.4rem;margin-bottom:0.5rem;">✓</div>
        <div style="font-family:var(--font-serif);font-size:1rem;color:var(--text);margin-bottom:1.25rem;">
          Turno actualizado al <strong>${newFecha}</strong> a las <strong>${newHora}</strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;align-items:center;">
          <a href="${gcalUrl}" target="_blank" rel="noopener" class="btn-confirm-cal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Agregar al calendario
          </a>
          <button class="btn-confirm-new" id="mt-edit-ver-turno">Ver mi turno</button>
        </div>
      </div>`;
    document.getElementById('mt-edit-ver-turno').addEventListener('click', () => buscarTurno(t.nombre));
    extra.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
