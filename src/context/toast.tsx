import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { ToastContext, type ToastItem } from './toastContext';

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = (id: string) => (prev: ToastItem[]) => prev.filter(t => t.id !== id);

  const scheduleRemove = useCallback((id: string, type: ToastItem['type']) => {
    const duration = type === 'danger' ? 6000 : 3500;
    setTimeout(() => setToasts(removeToast(id)), duration);
  }, []);

  const toast = useCallback((msg: string, type: ToastItem['type'] = 'default') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, msg, type }]);
    scheduleRemove(id, type);
  }, [scheduleRemove]);

  const ctxVal = useMemo(() => ({ toasts, toast }), [toasts, toast]);

  return (
    <ToastContext.Provider value={ctxVal}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type || ''}`}>{t.msg}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
