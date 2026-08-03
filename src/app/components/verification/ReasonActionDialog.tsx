import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Every publication/resolution action is explicit, human-authorized and requires
 * a free-text reason (persisted in the activation audit). This modal enforces the
 * non-empty reason before it will call `onConfirm`.
 */
export default function ReasonActionDialog({
  title,
  description,
  confirmLabel,
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-3 p-4">
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          <label className="block text-xs font-medium text-slate-600" htmlFor="action-reason">
            Reason (required)
          </label>
          <textarea
            id="action-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why are you taking this action?"
            className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-sky-400"
            autoFocus
          />
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</div>
          ) : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!trimmed || busy}
            onClick={() => onConfirm(trimmed)}
            className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-40 ${
              tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
