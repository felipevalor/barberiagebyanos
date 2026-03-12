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
    initReservaForm(); // Antes initFormHandler
    initCustomSelect();
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

  let barberoSeleccionado = null;

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
        barberoSeleccionado = b;
        validarFormulario();
      });
    }

    grid.appendChild(card);
  });

  // Validar que nombre + servicio + barbero + fecha estén completos
  function validarFormulario() {
    const nombre   = document.getElementById('reserva-nombre')?.value.trim();
    const servicio = document.getElementById('servicio-value')?.value;
    const fecha    = document.getElementById('reserva-fecha')?.value;
    btn.disabled = !(nombre && servicio && barberoSeleccionado && fecha);
  }

  document.getElementById('reserva-nombre')
    ?.addEventListener('input', validarFormulario);
  
  document.getElementById('reserva-fecha')
    ?.addEventListener('change', validarFormulario);

  // Escuchar cambios en el select custom
  document.addEventListener('servicioSeleccionado', validarFormulario);

  // Submit del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre   = document.getElementById('reserva-nombre').value.trim();
    const servicio = document.getElementById('servicio-value').value;
    const fecha    = document.getElementById('reserva-fecha').value;
    
    if (!nombre || !servicio || !barberoSeleccionado || !fecha) return;

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    // Formatear fecha para el mensaje (de YYYY-MM-DD a DD/MM/YYYY opcionalmente)
    const [y, m, d] = fecha.split('-');
    const fechaFormateada = `${d}/${m}/${y}`;

    // 1. Guardar en D1 (fire and forget)
    fetch('/api/reserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nombre, 
        servicio, 
        barbero: barberoSeleccionado.nombre,
        fecha: fechaFormateada 
      })
    }).catch(() => {});

    // 2. Armar mensaje perfecto y abrir WhatsApp
    const mensaje = encodeURIComponent(
      `Hola ${barberoSeleccionado.nombre}! Soy ${nombre}. ` +
      `Quisiera reservar un turno para *${servicio}* el día *${fechaFormateada}*. ` +
      `¿Tenés disponibilidad?`
    );

    const waUrl = `https://wa.me/${barberoSeleccionado.tel}?text=${mensaje}`;
    
    // Abrir en nueva pestaña
    window.open(waUrl, '_blank');

    // Feedback visual y limpieza
    btn.textContent = '¡Redirigido!';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Ir al WhatsApp';
      form.reset();
      // Limpiar también el selector custom
      document.getElementById('select-servicio-display').textContent = 'Seleccioná un servicio';
      document.getElementById('servicio-value').value = '';
      validarFormulario();
    }, 2000);
  });
}
