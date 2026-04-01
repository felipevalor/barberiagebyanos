// public/js/cursor.js
// Animaciones del cursor, navbar, scroll reveal y efectos magnéticos.

export function initCustomCursor() {
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

export function initHamburgerMenu() {
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

export function initNavScroll() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

export function initScrollReveal() {
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

export function initTextScramble() {
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

export function initMagneticButtons() {
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
