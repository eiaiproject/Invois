import { createContext, useContext } from 'react';

export interface ToastItem {
  id: string;
  msg: string;
  type?: 'default' | 'success' | 'danger';
}

export interface ToastCtx {
  toasts: ToastItem[];
  toast: (msg: string, type?: ToastItem['type']) => void;
}

export const ToastContext = createContext<ToastCtx>({ toasts: [], toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}
