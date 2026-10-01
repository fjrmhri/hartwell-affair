import { useEffect, useRef } from 'react';

/**
 * Dialog konfirmasi yang bisa dipakai ulang.
 * Props:
 *   open          – boolean, apakah dialog tampil
 *   title         – judul dialog
 *   body          – isi pesan (string atau ReactNode)
 *   confirmLabel  – teks tombol konfirmasi (default: "Ya")
 *   cancelLabel   – teks tombol batal (default: "Batal")
 *   danger        – boolean, apakah tombol konfirmasi bergaya bahaya
 *   onConfirm     – callback saat konfirmasi
 *   onCancel      – callback saat batal
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const dlgRef = useRef(null);
  const confirmRef = useRef(null);

  // Focus trap: simpan elemen yang memiliki fokus sebelum dialog dibuka,
  // fokuskan tombol konfirmasi saat dibuka, kembalikan fokus saat ditutup.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    // Fokuskan tombol konfirmasi setelah render
    requestAnimationFrame(() => confirmRef.current?.focus());
    return () => {
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open]);

  // Esc membatalkan
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, onCancel]);

  // Focus trap: tangkap Tab agar tidak keluar dari dialog
  useEffect(() => {
    if (!open || !dlgRef.current) return;
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = dlgRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onClick={onCancel}
    >
      <div
        className="confirm-dialog"
        ref={dlgRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="confirm-title">
          {title}
        </h2>
        <div id="confirm-body" className="confirm-body">
          {body}
        </div>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
