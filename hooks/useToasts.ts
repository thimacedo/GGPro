import { useState, useCallback } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'ai';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((title: string, message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // IA toasts can be longer since they contain explanations
    const duration = type === 'ai' ? 10000 : 4000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
