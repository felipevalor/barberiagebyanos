/**
 * Gebyanos - Main JS
 * Premium Motion Design & Interactive Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Iniciar fetch de barberos sin bloquear — las animaciones arrancan de inmediato
    const barberosFetch = fetch('/api/barberos').catch(() => null);

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
        if (r?.ok) BARBEROS = await r.json();
    } catch { /* usa fallback hardcodeado */ }

    initReservaForm();
    initCalendarPicker();
    initMiTurno();
});

/**
 * Custom Cursor Logic
 */
function initCustomCursor() {
    if (window.matchMedia('(hover: none)').matches) return;

    const cursor = document.getElementById('custom-cursor');
    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    
    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    // Smooth ring following
    const animateRing = () => {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        
        ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
        requestAnimationFrame(animateRing);
    };
    animateRing();

    // Hover effects
    const hoverElements = document.querySelectorAll('a, button, .magnetic, .service-card, .gallery-item, select, input, textarea');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('active-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('active-hover'));
    });

    window.addEventListener('mousedown', () => document.body.classList.add('mousedown'));
    window.addEventListener('mouseup', () => document.body.classList.remove('mousedown'));
}

/**
 * Hamburger Menu
 */
function initHamburgerMenu() {
    const btn = document.getElementById('nav-hamburger');
    const links = document.getElementById('nav-links');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
    });

    // Cerrar al hacer click en un link
    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            document.body.classList.remove('nav-open');
        });
    });
}

/**
 * Navbar Scroll Effect
 */
function initNavScroll() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/**
 * Scroll Reveal Animation
 */
function initScrollReveal() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                
                // If it has stagger children
                const staggers = entry.target.querySelectorAll('.reveal-stagger');
                staggers.forEach((el, index) => {
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, index * 60);
                });
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    // Initial state for stagger elements
    document.querySelectorAll('.reveal-stagger').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
    });
}

/**
 * Hero Title — word-by-word reveal
 */
function initTextScramble() {
    const el = document.getElementById('scramble-text');
    if (!el) return;

    // Sacar el reveal genérico del h1 — las palabras se revelan solas
    el.classList.remove('reveal');
    el.style.opacity = '1';
    el.style.transform = 'none';

    const words = el.textContent.trim().split(' ');
    el.innerHTML = words
        .map((w, i) => `<span class="hw" style="animation-delay:${0.15 + i * 0.16}s">${w}</span>`)
        .join(' ');
}

/**
 * Magnetic Buttons Logic
 */
function initMagneticButtons() {
    if (window.matchMedia('(hover: none)').matches) return;

    const magnets = document.querySelectorAll('.magnetic');
    
    magnets.forEach(magnet => {
        magnet.addEventListener('mousemove', function(e) {
            const position = this.getBoundingClientRect();
            const x = e.pageX - position.left - window.scrollX;
            const y = e.pageY - position.top - window.scrollY;
            
            const centerX = position.width / 2;
            const centerY = position.height / 2;
            
            const deltaX = x - centerX;
            const deltaY = y - centerY;
            
            this.style.transform = `translate(${deltaX * 0.3}px, ${deltaY * 0.5}px)`;
        });
        
        magnet.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0px, 0px)';
        });
    });
}

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

  trigger.addEventListener('click', () => {
    select.classList.toggle('open');
  });

  dropdown.querySelectorAll('.select-option').forEach(option => {
    option.addEventListener('click', () => {
      const value = option.getAttribute('data-value');
      display.textContent = option.childNodes[0].textContent.trim();
      display.style.color = 'var(--text)';
      hiddenInput.value = value;
      
      // Disparar evento para validación
      document.dispatchEvent(new Event('servicioSeleccionado'));

      dropdown.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      select.classList.remove('open');
    });
  });

  // Cerrar al clickear afuera
  document.addEventListener('click', (e) => {
    if (!select.contains(e.target)) select.classList.remove('open');
  });
}

/**
 * Google Calendar Config
 */
const SLOT_DURATION = 30; // minutos
const TIMEZONE = 'America/Argentina/Buenos_Aires';

const DEFAULT_SCHEDULE = {
  1: { start: 9, end: 20 },
  2: { start: 9, end: 20 },
  3: { start: 9, end: 20 },
  4: { start: 9, end: 20 },
  5: { start: 9, end: 20 },
  6: { start: 9, end: 17 },
};

const SERVICIOS = {
  'Corte':             { duracion: 30 },
  'Corte + Barba':     { duracion: 45 },
  'Barba':             { duracion: 15 },
  'Afeitado':          { duracion: 15 },
  'Niños 10-13 años':  { duracion: 30 },
  'Niños 0-9 años':    { duracion: 30 },
};

/**
 * Reserva Form Logic
 */
// Poblado en DOMContentLoaded desde /api/barberos; fallback a hardcodeado si la API falla
let BARBEROS = [
  { id: 'gebyano', nombre: 'Gebyano', tel: '5493416021009', disponible: true,  calendarId: null,                      schedule: DEFAULT_SCHEDULE },
  { id: 'lobo',    nombre: 'Lobo',    tel: '5493412754502', disponible: true,  calendarId: null,                      schedule: DEFAULT_SCHEDULE },
  { id: 'felipe',  nombre: 'Felipe',  tel: '5493416513207', disponible: true,  calendarId: 'felipevalor7@gmail.com',  schedule: DEFAULT_SCHEDULE },
  { id: 'ns',      nombre: 'NS',      tel: null,            disponible: false, calendarId: null,                      schedule: null },
  { id: 'bql',     nombre: 'BQL',     tel: null,            disponible: false, calendarId: null,                      schedule: null }
];

function initReservaForm() {
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
  BARBEROS.forEach(b => {
    const card = document.createElement('div');
    card.className = 'barbero-card' + (!b.disponible ? ' barbero-no-disponible' : '');
    card.innerHTML = `
      <span class="barbero-nombre">${b.nombre}</span>
      ${!b.disponible ? '<span class="barbero-badge">Próximamente</span>' : ''}
    `;

    if (b.disponible) {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.barbero-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        // Disparar evento para el calendar picker
        document.dispatchEvent(new CustomEvent('barberoSeleccionado', { detail: b }));
      });
    }

    grid.appendChild(card);
  });

  // El botón submit es manejado por initCalendarPicker()
  // Prevenir submit nativo del form
  form.addEventListener('submit', (e) => e.preventDefault());
}

// ── Slots ocupados: D1 + Google Calendar del barbero ─────────────────────────
async function fetchD1BusySlots(barberoNombre, day, barberoId) {
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

function buildGcalUrl({ servicio, barbero, fecha, hora }) {
  const pad2   = n => String(n).padStart(2, '0');
  const [d, m, y] = fecha.split('/').map(Number);
  const [h, min]  = hora.split(':').map(Number);
  const dur    = SERVICIOS[servicio]?.duracion || 30;
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
async function initCalendarPicker() {
  const dayPicker  = document.getElementById('day-picker');
  const slotPicker = document.getElementById('slot-picker');
  const btn        = document.getElementById('reserva-btn');
  if (!dayPicker) return;

  let selectedBarbero  = null;
  let selectedServicio = null;
  let selectedDay      = null;
  let selectedSlot     = null;

  // Escuchar selección de barbero
  document.addEventListener('barberoSeleccionado', async (e) => {
    selectedBarbero = { ...e.detail };
    selectedDay  = null;
    selectedSlot = null;
    slotPicker.innerHTML = '';
    slotPicker.style.display = 'none';
    validar();
    // Cargar horario dinámico y feriados desde D1
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
    if (selectedServicio) await renderDays();
  });

  // Escuchar selección de servicio
  document.addEventListener('servicioSeleccionado', async () => {
    selectedServicio = document.getElementById('servicio-value')?.value;
    selectedSlot = null;
    validar();
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

    for (const day of days) {
      const dayBtn = document.createElement('button');
      dayBtn.className = 'day-btn';
      dayBtn.type = 'button';
      dayBtn.innerHTML = `
        <span class="day-name">${day.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
        <span class="day-num">${day.getDate()}</span>
        <span class="day-month">${day.toLocaleDateString('es-AR', { month: 'short' })}</span>
      `;
      dayBtn.addEventListener('click', () => {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
        dayBtn.classList.add('selected');
        selectedDay = day;
        selectedSlot = null;
        validar();
        renderSlots(day);
      });
      grid.appendChild(dayBtn);
    }

    dayPicker.appendChild(grid);
  }

  async function renderSlots(day) {
    slotPicker.innerHTML = '<div class="calendar-loading">Cargando horarios...</div>';
    slotPicker.style.display = 'block';

    const busySlots = await fetchBusySlots(day, selectedBarbero);

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

      if (!isBusy) {
        slotBtn.addEventListener('click', () => {
          document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
          slotBtn.classList.add('selected');
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
    const nombre    = document.getElementById('reserva-nombre')?.value.trim();
    const telefono  = document.getElementById('reserva-telefono')?.value.trim();
    const servicio  = document.getElementById('servicio-value')?.value;
    btn.disabled = !(nombre && telefono && servicio && selectedBarbero && selectedDay && selectedSlot);
  }

  document.getElementById('reserva-nombre')
    ?.addEventListener('input', validar);

  // Click en botón — confirmar turno directamente in-app
  document.getElementById('reserva-telefono')
    ?.addEventListener('input', validar);

  btn.addEventListener('click', async () => {
    const nombre    = document.getElementById('reserva-nombre').value.trim();
    const telefono  = document.getElementById('reserva-telefono').value.trim();
    const servicio  = document.getElementById('servicio-value').value;
    if (!nombre || !telefono || !servicio || !selectedBarbero || !selectedDay || !selectedSlot) return;

    btn.disabled    = true;
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
          duracion:   SERVICIOS[servicio]?.duracion || 30,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'No se pudo confirmar el turno. Intentá de nuevo.');
        btn.disabled    = false;
        btn.textContent = 'Confirmar turno';
        return;
      }

      // Mostrar pantalla de confirmación
      showConfirmacion(data.turno || { nombre, telefono, servicio, barbero: selectedBarbero.nombre, fecha, hora: selectedSlot });

    } catch {
      alert('Error de red. Verificá tu conexión e intentá de nuevo.');
      btn.disabled    = false;
      btn.textContent = 'Confirmar turno';
    }
  });

  function showConfirmacion(turno) {
    // Guardar nombre y teléfono en cookie (90 días)
    document.cookie = `gb_nombre=${encodeURIComponent(turno.nombre)}; max-age=${60*60*24*90}; SameSite=Lax; Path=/`;
    if (turno.telefono) document.cookie = `gb_tel=${encodeURIComponent(turno.telefono)}; max-age=${60*60*24*90}; SameSite=Lax; Path=/`;

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
        <span class="confirm-row-value">${turno.barbero}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-row-label">Servicio</span>
        <span class="confirm-row-value">${turno.servicio}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-row-label">Día</span>
        <span class="confirm-row-value">${fechaLabel}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-row-label">Hora</span>
        <span class="confirm-row-value">${turno.hora}</span>
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
    btn.disabled    = true;
    btn.textContent = 'Confirmar turno';
    selectedBarbero = null; selectedDay = null; selectedSlot = null;
    // Limpiar pickers (se re-renderizan al seleccionar de nuevo)
    const dayPicker  = document.getElementById('day-picker');
    const slotPicker = document.getElementById('slot-picker');
    if (dayPicker)  { dayPicker.innerHTML = '';  dayPicker.style.display  = 'none'; }
    if (slotPicker) { slotPicker.innerHTML = ''; slotPicker.style.display = 'none'; }
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
        <div class="mi-turno-card-fecha">${fechaLabel} · ${t.hora}</div>
        <div class="mi-turno-card-rows">
          <div class="mi-turno-card-row"><span>Barbero</span><span>${t.barbero}</span></div>
          <div class="mi-turno-card-row"><span>Servicio</span><span>${t.servicio}</span></div>
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
    try {
      const res = await fetch(`/api/mi-turno?nombre=${encodeURIComponent(t.nombre)}&mensaje=${encodeURIComponent(t.mensaje)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      result.innerHTML = '<div class="mi-turno-none">Tu turno fue cancelado.</div>';
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
    try {
      const res = await fetch('/api/mi-turno', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: t.nombre, old_mensaje: t.mensaje, new_fecha: newFecha, new_hora: newHora }),
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
