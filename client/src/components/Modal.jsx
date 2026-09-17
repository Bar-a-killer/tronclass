import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, icon: Icon, onClose, children, footer, size = 'max-w-md' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[90vh] w-full ${size} flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
          <h3 id="modal-title" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-100">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-sky-400" />}
            <span className="truncate">{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
