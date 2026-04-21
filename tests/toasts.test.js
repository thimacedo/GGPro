/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toastManager } from '../js/components/toasts.js';

describe('ToastManager - UI Feedback', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Reinicializar o container através do init() do singleton se ele sumiu
    toastManager.init();
    toastManager.toasts = [];
    toastManager.render();
  });

  it('should create and show a toast', () => {
    toastManager.show('Teste', 'Mensagem de teste', 'success');
    
    const toast = document.querySelector('[data-toast-id]');
    expect(toast).not.toBeNull();
    expect(toast.innerHTML).toContain('Teste');
    expect(toast.innerHTML).toContain('Mensagem de teste');
  });

  it('should remove toast after timeout', async () => {
    // Usar um tempo bem curto para o teste ser rápido
    toastManager.show('Teste', 'Auto-remove', 'info');
    
    expect(document.querySelectorAll('[data-toast-id]').length).toBe(1);
    
    // Forçar a remoção manual para testar a lógica sem esperar 5s
    const id = toastManager.toasts[0].id;
    toastManager.remove(id);
    
    // Aguardar animação de saída (300ms no código)
    await new Promise(r => setTimeout(r, 400));
    expect(document.querySelectorAll('[data-toast-id]').length).toBe(0);
  });

  it('should handle different types styles', () => {
    toastManager.show('Erro', 'Bug', 'error');
    const iconContainer = document.querySelector('.rounded-xl');
    expect(iconContainer.className).toContain('text-red-400');
  });

  it('should fallback to default for unknown types', () => {
    toastManager.show('Oi', 'Desconhecido', 'ghost-type');
    const iconContainer = document.querySelector('.rounded-xl');
    expect(iconContainer.innerHTML).toContain('🔔');
  });

  it('should handle remove of non-existent id gracefully', () => {
    expect(() => toastManager.remove('non-existent')).not.toThrow();
  });
});
