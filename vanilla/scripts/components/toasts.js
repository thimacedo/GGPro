// Componente de Toasts (Notificações) - Narrador Pro
// Versão Premium com Animações e Tipos

class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.init();
  }

  init() {
    // Garantir que o container existe
    if (!document.getElementById('toastContainer')) {
      const el = document.createElement('div');
      el.id = 'toastContainer';
      el.className = 'fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none';
      document.body.appendChild(el);
    }
    this.container = document.getElementById('toastContainer');
    
    // Expor globalmente para facilitar o uso no app.js legado
    window.addToast = (title, message, type) => this.show(title, message, type);
    window.removeToast = (id) => this.remove(id);
  }

  show(title, message, type = 'info') {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = { id, title, message, type };
    this.toasts.push(toast);
    this.render();

    const duration = type === 'ai' ? 10000 : 5000;
    setTimeout(() => this.remove(id), duration);
  }

  remove(id) {
    const idx = this.toasts.findIndex(t => t.id === id);
    if (idx !== -1) {
      // Find the element and add leave animation
      const el = document.querySelector(`[data-toast-id="${id}"]`);
      if (el) {
        el.classList.replace('animate-slide-in', 'animate-fade-out');
        setTimeout(() => {
          this.toasts = this.toasts.filter(t => t.id !== id);
          this.render();
        }, 300);
      } else {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.render();
      }
    }
  }

  getIcon(type) {
    switch (type) {
      case 'success': return '✓';
      case 'ai': return '💬';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return '🔔';
    }
  }

  getTypeStyles(type) {
    switch (type) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
      case 'ai': return 'bg-purple-500/20 text-purple-400 border-purple-500/20';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/20';
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/10';
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = this.toasts.map(toast => {
      const styles = this.getTypeStyles(toast.type);
      const icon = this.getIcon(toast.type);
      
      return `
        <div 
          data-toast-id="${toast.id}"
          class="pointer-events-auto animate-slide-in bg-slate-900/95 border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[280px] max-w-[420px] backdrop-blur-xl ring-1 ring-white/5"
        >
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${styles} border shadow-inner">
            ${icon}
          </div>
          <div class="flex flex-col flex-1">
            <span class="text-[10px] font-black uppercase text-white tracking-widest">${toast.title}</span>
            <span class="text-xs text-slate-300 font-medium leading-tight mt-1">${toast.message}</span>
          </div>
          <button 
            onclick="window.removeToast('${toast.id}')" 
            class="p-2 text-slate-600 hover:text-white transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      `;
    }).join('');
  }
}

export const toastManager = new ToastManager();
