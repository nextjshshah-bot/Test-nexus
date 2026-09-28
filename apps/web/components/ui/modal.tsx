'use client';

import { useEffect, type ReactNode } from 'react';

/** Accessible, dependency-free modal with backdrop blur and ESC handling. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}): JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative z-10 my-6 w-full ${widths[size]} animate-fade-up rounded-2xl border border-white/[0.08] bg-ink-850 shadow-card`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-white/25 hover:text-slate-100"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>

        {footer ? <div className="flex flex-wrap justify-end gap-2.5 border-t border-white/[0.06] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Modal;
