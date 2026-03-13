/**
 * Gebyanos - Main JS
 * Premium Motion Design & Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initNavScroll();
    initScrollReveal();
    initTextScramble();
    initMagneticButtons();
    initReservaForm();
    initCustomSelect();
    initCalendarPicker();
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
 * Text Scramble Effect
 */
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => (this.resolve = resolve));
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dull">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

function initTextScramble() {
    const phrases = [
        "El corte que buscabas.",
        "Estilo que habla por vos.",
        "Barbería de barrio, nivel de autor."
    ];
    
    const el = document.getElementById('scramble-text');
    const fx = new TextScramble(el);
    
    let counter = 0;
    const next = () => {
        fx.setText(phrases[counter]).then(() => {
            setTimeout(next, 2500);
        });
        counter = (counter + 1) % phrases.length;
    };
    
    // Start after a short delay
    setTimeout(next, 1000);
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
const GOOGLE_CALENDAR_CONFIG = {
  apiKey: 'AIzaSyCt8-oaJu57_A73I7bVtCAupY9xA9rZ6aQ',
  calendarId: 'felipevalor7@gmail.com',
  timezone: 'America/Argentina/Buenos_Aires',
  schedule: {
    1: { start: 9, end: 20 },
    2: { start: 9, end: 20 },
    3: { start: 9, end: 20 },
    4: { start: 9, end: 20 },
    5: { start: 9, end: 20 },
    6: { start: 9, end: 17 },
  },
  slotDuration: 30,
};

/**
 * Reserva Form Logic
 */
const BARBEROS = [
  { id: 'gebyano', nombre: 'Gebyano', tel: '5493416021009', disponible: true },
  { id: 'lobo',    nombre: 'Lobo',    tel: '5493412754502', disponible: true },
  { id: 'ns',      nombre: 'NS',      tel: null,            disponible: false },
  { id: 'bql',     nombre: 'BQL',     tel: null,            disponible: false }
];

function initReservaForm() {
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

/**
 * Google Calendar Picker
 */
async function initCalendarPicker() {
  const dayPicker  = document.getElementById('day-picker');
  const slotPicker = document.getElementById('slot-picker');
  const btn        = document.getElementById('reserva-btn');
  if (!dayPicker) return;

  let selectedBarbero = null;
  let selectedDay     = null;
  let selectedSlot    = null;

  // Escuchar selección de barbero
  document.addEventListener('barberoSeleccionado', async (e) => {
    selectedBarbero = e.detail;
    selectedDay = null;
    selectedSlot = null;
    slotPicker.innerHTML = '';
    slotPicker.style.display = 'none';
    validar();
    await renderDays();
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
      if (GOOGLE_CALENDAR_CONFIG.schedule[dow]) {
        days.push(d);
      }
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

    const busySlots = await fetchBusySlots(day);

    const dow = day.getDay();
    const { start, end } = GOOGLE_CALENDAR_CONFIG.schedule[dow];
    const duration = GOOGLE_CALENDAR_CONFIG.slotDuration;

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

    for (const { h, m } of slots) {
      const slotDate = new Date(day);
      slotDate.setHours(h, m, 0, 0);

      if (slotDate <= now) continue;

      const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const isBusy = busySlots.some(b => {
        const bStart = new Date(b.start);
        const bEnd   = new Date(b.end);
        return slotDate >= bStart && slotDate < bEnd;
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

  async function fetchBusySlots(day) {
    const timeMin = new Date(day);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(day);
    timeMax.setHours(23, 59, 59, 999);

    const calId = encodeURIComponent(GOOGLE_CALENDAR_CONFIG.calendarId);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?` +
      `key=${GOOGLE_CALENDAR_CONFIG.apiKey}` +
      `&timeMin=${timeMin.toISOString()}` +
      `&timeMax=${timeMax.toISOString()}` +
      `&singleEvents=true` +
      `&orderBy=startTime`;

    try {
      const res  = await fetch(url);
      const data = await res.json();
      return (data.items || [])
        .filter(e => e.status !== 'cancelled')
        .map(e => ({ start: e.start.dateTime, end: e.end.dateTime }))
        .filter(e => e.start && e.end);
    } catch {
      return [];
    }
  }

  function validar() {
    const nombre   = document.getElementById('reserva-nombre')?.value.trim();
    const servicio = document.getElementById('servicio-value')?.value;
    btn.disabled = !(nombre && servicio && selectedBarbero && selectedDay && selectedSlot);
  }

  document.getElementById('reserva-nombre')
    ?.addEventListener('input', validar);
  document.addEventListener('servicioSeleccionado', validar);

  // Click en botón — armar mensaje con fecha/hora y abrir WA
  btn.addEventListener('click', async () => {
    const nombre   = document.getElementById('reserva-nombre').value.trim();
    const servicio = document.getElementById('servicio-value').value;
    if (!nombre || !servicio || !selectedBarbero || !selectedDay || !selectedSlot) return;

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    // Guardar en D1 (fire and forget)
    fetch('/api/reserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        servicio,
        barbero: selectedBarbero.nombre,
        fecha: selectedDay.toLocaleDateString('es-AR'),
        hora: selectedSlot,
      })
    }).catch(() => {});

    // Armar mensaje WA con fecha y hora
    const fechaStr = selectedDay.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    const mensaje = encodeURIComponent(
      `Hola ${selectedBarbero.nombre}! Soy ${nombre}.\n` +
      `Quiero reservar un turno para: *${servicio}*.\n` +
      `Fecha: *${fechaStr} a las ${selectedSlot}hs*.\n` +
      `¿Confirmás el turno?`
    );

    setTimeout(() => {
      window.open(`https://wa.me/${selectedBarbero.tel}?text=${mensaje}`, '_blank');
      btn.disabled = false;
      btn.textContent = 'Ir al WhatsApp';
    }, 400);
  });
}
