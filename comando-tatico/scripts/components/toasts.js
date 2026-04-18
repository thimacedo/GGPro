/**
 * toasts.js — Sistema de Notificações Animadas
 * Slide-in toasts com auto-dismiss (3.5s)
 */

const TOAST_COLORS = {
  success:     '#22c55e',
  error:       '#ef4444',
  warning:     '#f59e0b',
  info:        '#3b82f6',
  celebration: '#22c55e',
  danger:      '#ef4444'
};

const _queue = [];
let _container = null;

function ensureContainer() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'toastContainer';
  _container.style.cssText = `
    position:fixed; top:16px; left:50%; transform:translateX(-50%);
    z-index:9999; display:flex; flex-direction:column; gap:8px;
    pointer-events:none; max-width:400px; width:90%;
  `;
  document.body.appendChild(_container);
}

function render() {
  ensureContainer();
  _container.innerHTML = _queue.map(t => `
    <div style="
      background:${TOAST_COLORS[t.type] || TOAST_COLORS.info};
      color:#fff; padding:10px 18px; border-radius:12px;
      font-size:13px; font-weight:700;
      display:flex; align-items:center; gap:8px;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      pointer-events:auto;
      animation:toastIn 0.3s ease;
      font-family:'Segoe UI',system-ui,sans-serif;
    ">
      <span style="font-size:18px;flex-shrink:0;">${t.icon}</span>
      <span style="flex:1;">${t.msg}</span>
    </div>
  `).join('');
}

function show(icon, msg, type = 'info') {
  const id = Date.now() + Math.random();
  _queue.push({ id, icon, msg, type });
  render();
  setTimeout(() => {
    const idx = _queue.findIndex(t => t.id === id);
    if (idx !== -1) { _queue.splice(idx, 1); render(); }
  }, 3500);
}

export default { show };
