import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly tone?: 'primary' | 'danger';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className="scrim" aria-labelledby="confirm-dialog-title" onClose={onCancel}>
      <div className="sheet">
        <div className="sheet-handle" aria-hidden="true" />
        <h2 id="confirm-dialog-title">{title}</h2>
        <p style={{ marginTop: 8, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="actions" style={{ marginTop: 18 }}>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'} btn-block`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
