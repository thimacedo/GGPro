import React from 'react';
import { CheckCircle2, MessageSquare, Bell, X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'ai' | 'error' | 'warning';
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => (
  <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    {toasts.map((toast) => (
      <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300 bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[240px] max-w-[400px] backdrop-blur-md">
        <div className={`p-2 rounded-lg ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : toast.type === 'ai' ? 'bg-purple-500/20 text-purple-400' : toast.type === 'error' ? 'bg-red-500/20 text-red-400' : toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'ai' ? <MessageSquare size={18} /> : <Bell size={18} />}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase text-white tracking-tight">{toast.title}</span>
          <span className="text-[10px] text-slate-300 font-medium leading-tight mt-0.5">{toast.message}</span>
        </div>
        <button onClick={() => removeToast(toast.id)} className="ml-auto text-slate-600 hover:text-white p-1 flex-shrink-0"><X size={14} /></button>
      </div>
    ))}
  </div>
);

export default ToastContainer;
