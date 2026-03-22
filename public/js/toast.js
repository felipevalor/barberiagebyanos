/**
 * toast.js — Sistema de notificaciones inline para Gebyanos admin
 * Reemplaza alert() nativo con toasts accesibles y cohesivos con el design system.
 *
 * Uso:
 *   showToast('Turno guardado');
 *   showToast('Error al eliminar', { variant: 'error' });
 *   showToast('Info', { variant: 'info', duration: 5000 });
 */
(function () {
  let _container = null;

  function getContainer() {
    if (_container) return _container;
    _container = document.getElementById('toast-container');
    if (!_container) {
      _container = document.createElement('div');
      _container.id = 'toast-container';
      document.body.appendChild(_container);
    }
    return _container;
  }

  window.showToast = function (message, { variant = 'success', duration = 3500 } = {}) {
    const c = getContainer();

    const el = document.createElement('div');
    el.className = 'toast toast--' + variant;
    // role="alert" para errores (assertive), role="status" para el resto (polite)
    el.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    el.textContent = message;
    c.appendChild(el);

    // Auto-dismiss con animación de salida
    setTimeout(() => {
      el.classList.add('toast--out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
  };
})();
