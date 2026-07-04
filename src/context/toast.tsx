import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/* ─── Toast ─── */

interface ToastItem { id: string; msg: string; type?: 'default' | 'success' | 'danger' }

interface ToastCtx {
  toasts: ToastItem[];
  toast: (msg: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastCtx>({ toasts: [], toast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, type: ToastItem['type'] = 'default') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
          {toasts.map(t => <div key={t.id} className={`toast ${t.type || ''}`}>{t.msg}</div>)}
        </div>
      )}
    </ToastContext.Provider>
  );
}
