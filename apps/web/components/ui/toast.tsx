'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { border: string; icon: string; label: string }> = {
  success: { border: 'border-emerald-500/30', icon: 'text-emerald-300', label: '✓' },
  error: { border: 'border-rose-500/30', icon: 'text-rose-300', label: '✕' },
  info: { border: 'border-nexus-500/30', icon: 'text-nexus-300', label: 'i' },
  warning: { border: 'border-amber-500/30', icon: 'text-amber-300', label: '!' },
};

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.tone === 'error' ? 7000 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2.5">
        {toasts.map((toast) => {
          const tone = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto animate-fade-up rounded-xl border ${tone.border} bg-ink-800/95 p-3.5 shadow-card backdrop-blur`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold ${tone.icon}`}>
                  {tone.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="text-slate-500 transition hover:text-slate-200"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

export default ToastProvider;
