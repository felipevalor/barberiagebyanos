// public/js/calendar-picker.js
// Day picker + slot picker para el formulario de reserva.
import { escapeHtml } from './ui-utils.js';
import { SERVICIOS, DEFAULT_SCHEDULE, SLOT_DURATION, GEBYANO_TEL } from './config.js';
import { updateServicioDropdown } from './catalogo.js';

function getWaFallbackUrl(barbero) {
  const tel = barbero?.tel || GEBYANO_TEL;
  const msg = encodeURIComponent('Hola, quiero reservar un turno');
  return `https://wa.me/${tel}?text=${msg}`;
}

function updateFormSteps(activeStep) {
  const steps = document.querySelectorAll('.form-step');
  steps.forEach(step => {
    const n = parseInt(step.getAttribute('data-step'), 10);
    step.classList.remove('active', 'completed');
    step.removeAttribute('aria-current');
    if (n < activeStep)  step.classList.add('completed');
    if (n === activeStep) {
      step.classList.add('active');
      step.setAttribute('aria-current', 'step');
    }
  });
}

// ── Slots ocupados: D1 + Google Calendar del barbero ─────────────────────────
export async function fetchD1BusySlots(barberoNombre, day, barberoId) {
  const fecha    = `${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}`;
  const idParam  = barberoId ? `&barberoId=${encodeURIComponent(barberoId)}` : '';
  try {
    const res = await fetch(`/api/turnos?barbero=${encodeURIComponent(barberoNombre)}&fecha=${encodeURIComponent(fecha)}${idParam}`);
    if (!res.ok) return [];
    const { occupied } = await res.json();
    return (occupied || []).map(({ hora, duracion }) => {
      const [h, m] = hora.split(':').map(Number);
      const start = new Date(day); start.setHours(h, m, 0, 0);
      const end   = new Date(start.getTime() + duracion * 60000);
      return { start: start.toISOString(), end: end.toISOString() };
    });
  } catch { return []; }
}

export function buildGcalUrl({ servicio, barbero, fecha, hora, duracion }) {
  const pad2   = n => String(n).padStart(2, '0');
  const [d, m, y] = fecha.split('/').map(Number);
  const [h, min]  = hora.split(':').map(Number);
  const dur    = duracion || SERVICIOS[servicio]?.duracion || 30;
  const endMin = h * 60 + min + dur;
  const dtStr  = `${y}${pad2(m)}${pad2(d)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent('Turno Gebyanos — ' + servicio)}`
    + `&dates=${dtStr}T${pad2(h)}${pad2(min)}00/${dtStr}T${pad2(Math.floor(endMin/60))}${pad2(endMin%60)}00`
    + `&details=${encodeURIComponent('Barbero: ' + barbero + '\nGebyanos — 1 de Mayo 1687, Rosario')}`;
}

/**
 * Google Calendar Picker
 */
export async function initCalendarPicker() {
  const dayPicker  = document.getElementById('day-picker');
  const slotPicker = document.getElementById('slot-picker');
  const btn        = document.getElementById('reserva-btn');
  // Initialize button as incomplete on load (HTML disabled attr was removed)
  btn.classList.add('btn-incomplete');
  let tooltipTimer = null;
  if (!dayPicker) return;

  let selectedBarbero  = null;
  let selectedServicio = null;
  let selectedDay      = null;
  let selectedSlot     = null;
  let serviciosCache   = [];  // [{nombre, duracion_min, precio_ars}] del barbero actual

  // Escuchar selección de barbero
  document.addEventListener('barberoSeleccionado', async (e) => {
    selectedBarbero = { ...e.detail };
    selectedDay  = null;
    selectedSlot = null;
    slotPicker.innerHTML = '';
    slotPicker.style.display = 'none';
    validar();
    updateFormSteps(4);
    // Cargar horario dinámico, feriados y precios desde D1
    try {
      const r = await fetch(`/api/horarios?barbero=${selectedBarbero.id}`);
      if (r.ok) selectedBarbero.schedule = await r.json();
    } catch { /* usa schedule hardcodeado del BARBEROS array */ }
    try {
      const rf = await fetch(`/api/feriados?barbero=${selectedBarbero.id}`);
      if (rf.ok) {
        const { feriados } = await rf.json();
        selectedBarbero.feriados = new Set(feriados);
      }
    } catch { selectedBarbero.feriados = new Set(); }
    try {
      const rs = await fetch(`/api/servicios?barbero_id=${selectedBarbero.id}`);
      if (rs.ok) {
        serviciosCache = await rs.json();
        updateServicioDropdown(serviciosCache);
      }
    } catch { /* usa precios sin mostrar */ }
    if (selectedServicio) await renderDays();
  });

  // Escuchar selección de servicio
  document.addEventListener('servicioSeleccionado', async () => {
    selectedServicio = document.getElementById('servicio-value')?.value;
    selectedSlot = null;
    validar();
    updateFormSteps(3);
    if (selectedBarbero && selectedDay) {
      await renderSlots(selectedDay);
    } else if (selectedBarbero) {
      await renderDays();
    }
  });

  async function renderDays() {
    dayPicker.innerHTML = '<div class="calendar-loading">Cargando disponibilidad...</div>';
    dayPicker.style.display = 'block';

    const today = new Date();
    const days = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      if (!selectedBarbero.schedule[dow]) continue;
      // Filtrar feriados no trabajados
      const fechaStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      if (selectedBarbero.feriados && selectedBarbero.feriados.has(fechaStr)) continue;
      days.push(d);
    }

    dayPicker.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'day-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Seleccioná un día');

    for (const day of days) {
      const dayBtn = document.createElement('button');
      dayBtn.className = 'day-btn';
      dayBtn.type = 'button';
      dayBtn.setAttribute('aria-pressed', 'false');
      dayBtn.setAttribute('aria-label', day.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));
      dayBtn.innerHTML = `
        <span class="day-name" aria-hidden="true">${day.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
        <span class="day-num" aria-hidden="true">${day.getDate()}</span>
        <span class="day-month" aria-hidden="true">${day.toLocaleDateString('es-AR', { month: 'short' })}</span>
      `;
      dayBtn.addEventListener('click', () => {
        document.querySelectorAll('.day-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
        dayBtn.classList.add('selected');
        dayBtn.setAttribute('aria-pressed', 'true');
        selectedDay = day;
        selectedSlot = null;
        validar();
        updateFormSteps(5);
        renderSlots(day);
      });
      grid.appendChild(dayBtn);
    }

    dayPicker.appendChild(grid);
  }

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

    const dow = day.getDay();
    const { start, end } = selectedBarbero.schedule[dow];
    const duration = SLOT_DURATION;

    const slots = [];
    for (let h = start; h < end; h++) {
      for (let m = 0; m < 60; m += duration) {
        slots.push({ h, m });
      }
    }

    slotPicker.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'slot-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Seleccioná un horario');

    const now = new Date();
    const duracionServicio = SERVICIOS[selectedServicio]?.duracion || SLOT_DURATION;

    const scheduleEnd = new Date(day);
    scheduleEnd.setHours(end, 0, 0, 0);

    for (const { h, m } of slots) {
      const slotDate = new Date(day);
      slotDate.setHours(h, m, 0, 0);

      if (slotDate <= now) continue;

      const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const slotEnd = new Date(slotDate.getTime() + duracionServicio * 60 * 1000);

      if (slotEnd > scheduleEnd) continue;
      const isBusy = busySlots.some(b => {
        const bStart = new Date(b.start);
        const bEnd   = new Date(b.end);
        return slotDate < bEnd && slotEnd > bStart;
      });

      const slotBtn = document.createElement('button');
      slotBtn.className = 'slot-btn' + (isBusy ? ' slot-busy' : '');
      slotBtn.textContent = timeStr;
      slotBtn.disabled = isBusy;
      slotBtn.type = 'button';
      slotBtn.setAttribute('aria-label', timeStr + (isBusy ? ' — no disponible' : ''));
      if (isBusy) {
        slotBtn.setAttribute('aria-disabled', 'true');
      } else {
        slotBtn.setAttribute('aria-pressed', 'false');
        slotBtn.addEventListener('click', () => {
          document.querySelectorAll('.slot-btn').forEach(b => { b.classList.remove('selected'); if (!b.disabled) b.setAttribute('aria-pressed', 'false'); });
          slotBtn.classList.add('selected');
          slotBtn.setAttribute('aria-pressed', 'true');
          selectedSlot = timeStr;
          validar();
        });
      }

      grid.appendChild(slotBtn);
    }

    slotPicker.appendChild(grid);
  }

  async function fetchBusySlots(day, barbero) {
    return fetchD1BusySlots(barbero.nombre, day, barbero.id);
  }

  function validar() {
    const nombre   = document.getElementById('reserva-nombre')?.value.trim();
    const telefono = document.getElementById('reserva-telefono')?.value.trim();
    const servicio = document.getElementById('servicio-value')?.value;
    const completo = !!(nombre && telefono && servicio && selectedBarbero && selectedDay && selectedSlot);
    btn.classList.toggle('btn-incomplete', !completo);
  }

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

  btn.addEventListener('click', async () => {
    // If form incomplete, show tooltip instead of submitting
    if (btn.classList.contains('btn-incomplete')) {
      const tooltip = document.getElementById('reserva-btn-tooltip');
      if (tooltip) {
        clearTimeout(tooltipTimer);
        tooltip.style.display = 'block';
        tooltipTimer = setTimeout(() => { tooltip.style.display = 'none'; }, 3000);
      }
      return;
    }

    const nombre   = document.getElementById('reserva-nombre').value.trim();
    const telefono = document.getElementById('reserva-telefono').value.trim();
    const servicio = document.getElementById('servicio-value').value;
    if (!nombre || !telefono || !servicio || !selectedBarbero || !selectedDay || !selectedSlot) return; // safety net

    btn.disabled = true;
    btn.classList.remove('btn-incomplete');
    btn.textContent = 'Confirmando...';

    const fecha = selectedDay.toLocaleDateString('es-AR');

    try {
      const res = await fetch('/api/reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono,
          servicio,
          barberoId:  selectedBarbero.id,
          barbero:    selectedBarbero.nombre,
          fecha,
          hora:       selectedSlot,
          calendarId: selectedBarbero.calendarId || null,
          duracion:   serviciosCache.find(s => s.nombre === servicio)?.duracion_min || SERVICIOS[servicio]?.duracion || 30,
          precio_ars: serviciosCache.find(s => s.nombre === servicio)?.precio_ars || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'No se pudo confirmar el turno. Intentá de nuevo.');
        btn.disabled = false;
        btn.textContent = 'Confirmar turno';
        validar();
        return;
      }

      // Guardar cancel_token en cookie (90 días)
      if (data.cancel_token) {
        document.cookie = `gb_ct=${encodeURIComponent(data.cancel_token)}; max-age=${60*60*24*90}; SameSite=Lax; Secure; Path=/`;
      }

      // Mostrar pantalla de confirmación
      const duracionConfirm = serviciosCache.find(s => s.nombre === servicio)?.duracion_min || SERVICIOS[servicio]?.duracion || 30;
      showConfirmacion({ ...(data.turno || { nombre, telefono, servicio, barbero: selectedBarbero.nombre, fecha, hora: selectedSlot }), duracion: duracionConfirm });

    } catch {
      alert('Error de red. Verificá tu conexión e intentá de nuevo.');
      btn.disabled = false;
      btn.textContent = 'Confirmar turno';
      validar();
    }
  });

  function showConfirmacion(turno) {
    // Guardar nombre y teléfono en cookie (90 días)
    document.cookie = `gb_nombre=${encodeURIComponent(turno.nombre)}; max-age=${60*60*24*90}; Secure; SameSite=Lax; Path=/`;
    if (turno.telefono) document.cookie = `gb_tel=${encodeURIComponent(turno.telefono)}; max-age=${60*60*24*90}; Secure; SameSite=Lax; Path=/`;

    // Ocultar form, mostrar confirmación
    document.getElementById('reserva-form').style.display = 'none';
    const confirmDiv = document.getElementById('reserva-confirmacion');
    confirmDiv.style.display = 'block';

    // Armar detalles
    const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const [d, m, y] = turno.fecha.split('/').map(Number);
    const dt       = new Date(y, m - 1, d);
    const fechaLabel = `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]}`;

    document.getElementById('confirm-details').innerHTML = `
      <div class="confirm-row">
        <span class="confirm-row-label">Barbero</span>
        <span class="confirm-row-value">${escapeHtml(turno.barbero)}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-row-label">Servicio</span>
        <span class="confirm-row-value">${escapeHtml(turno.servicio)}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-row-label">Día</span>
        <span class="confirm-row-value">${escapeHtml(fechaLabel)}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-row-label">Hora</span>
        <span class="confirm-row-value">${escapeHtml(turno.hora)}</span>
      </div>`;

    document.getElementById('btn-gcal').href = buildGcalUrl(turno);

    // Scroll suave a la confirmación
    confirmDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  document.getElementById('btn-nueva-reserva')?.addEventListener('click', () => {
    // Resetear form
    document.getElementById('reserva-form').style.display = '';
    document.getElementById('reserva-confirmacion').style.display = 'none';
    document.getElementById('reserva-nombre').value = '';
    document.getElementById('reserva-telefono').value = '';
    document.getElementById('servicio-value').value = '';
    btn.classList.add('btn-incomplete');
    btn.textContent = 'Confirmar turno';
    selectedBarbero = null; selectedDay = null; selectedSlot = null;
    updateFormSteps(1);
    // Limpiar pickers (se re-renderizan al seleccionar de nuevo)
    const dayPicker  = document.getElementById('day-picker');
    const slotPicker = document.getElementById('slot-picker');
    if (dayPicker)  { dayPicker.innerHTML = '';  dayPicker.style.display  = 'none'; }
    if (slotPicker) { slotPicker.innerHTML = ''; slotPicker.style.display = 'none'; }
    const fallbackElReset = document.getElementById('slots-fallback');
    if (fallbackElReset) fallbackElReset.style.display = 'none';
  });
}
