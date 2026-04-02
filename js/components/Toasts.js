class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 300;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast animate-in slide-in-from-right duration-300 ${type}`;
    
    const colors = {
      info: 'var(--blue-600)',
      success: 'var(--emerald-600)',
      warning: 'var(--yellow-500)',
      error: 'var(--red-600)',
      ai: 'var(--indigo-600)'
    };

    const icons = {
      info: 'info',
      success: 'check-circle',
      warning: 'alert-triangle',
      error: 'alert-octagon',
      ai: 'sparkles'
    };

    toast.style.cssText = `
      pointer-events: auto;
      background: var(--slate-900);
      border-left: 4px solid ${colors[type]};
      padding: 1rem 1.25rem;
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      min-width: 18rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      border: 1px solid rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
    `;

    toast.innerHTML = `
      <div style="color: ${colors[type]}; margin-top: 0.125rem;">
        <i data-lucide="${icons[type]}" style="width: 1.25rem; height: 1.25rem;"></i>
      </div>
      <div style="flex: 1;">
        <h4 style="font-size: 0.6875rem; font-weight: 900; color: white; text-transform: uppercase; margin-bottom: 0.125rem;">${title}</h4>
        <p style="font-size: 0.75rem; font-weight: 600; color: var(--slate-400); line-height: 1.4;">${message}</p>
      </div>
    `;

    this.container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.replace('animate-in', 'animate-out');
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

export const toasts = new ToastManager();
