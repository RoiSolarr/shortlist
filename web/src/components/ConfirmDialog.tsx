"use client";

import { useEffect, useRef } from "react";

/**
 * A question that has to be answered before something irreversible.
 *
 * A native modal dialog: it sits in the top layer above every page
 * transform and keeps focus inside. While it is open the page behind
 * neither scrolls nor takes clicks; only its two buttons answer, and
 * Escape counts as Cancel. Cancel comes first, so it is what focus lands on.
 */
export function ConfirmDialog({
  open,
  title,
  detail,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      // The whole box pops in. Scaling the content inside instead overshoots past the
      // dialog's edge for a moment, and the dialog scrolls, which drew a scrollbar
      className="enter-pop m-auto w-[calc(100%-32px)] max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-drag)] backdrop:bg-[color-mix(in_oklab,var(--canvas)_78%,transparent)] backdrop:backdrop-blur-[3px]"
    >
      {open && (
        <div className="p-5">
          <h2 id="confirm-title" className="t-section">
            {title}
          </h2>
          {detail && <p className="mt-1.5 text-ui text-muted">{detail}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-danger btn-sm" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
