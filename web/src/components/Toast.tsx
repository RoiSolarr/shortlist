"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cx } from "@/lib/format";
import { IconAlert, IconCheck } from "./icons";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: "ok" | "error"; action?: ToastAction; leaving?: boolean };
type Ctx = { toast: (message: string, tone?: Toast["tone"], action?: ToastAction) => void };

const ToastContext = createContext<Ctx>({ toast: () => {} });

/** Matches --dur-exit, plus a frame of slack before unmounting. */
const EXIT_MS = 180;

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), EXIT_MS);
  }, []);

  const toast = useCallback(
    (message: string, tone: Toast["tone"] = "ok", action?: ToastAction) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone, action }]);
      // Held mounted in an exiting state first, so it leaves instead of vanishing
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t, i) => {
          // Newest sits at the bottom; the ones behind step back a little so
          // a run of toasts reads as a stack.
          const depth = Math.min(toasts.length - 1 - i, 2);
          return (
            <div
              key={t.id}
              role="status"
              className={cx(
                "pointer-events-auto flex max-w-md items-center gap-3 rounded-[var(--radius)] bg-ink py-2.5 pr-2.5 pl-3.5 text-ui text-on-ink shadow-[var(--shadow-lift)]",
                t.leaving ? "toast-out" : "toast-in",
              )}
              style={{ scale: `${1 - depth * 0.035}`, opacity: 1 - depth * 0.15 }}
            >
              <span className={t.tone === "error" ? "text-bad" : "text-good"}>
                {t.tone === "error" ? <IconAlert className="size-4" /> : <IconCheck className="draw size-4" />}
              </span>
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    dismiss(t.id);
                    t.action?.onClick();
                  }}
                  className="shrink-0 rounded-md px-2 py-1 text-ui font-semibold underline underline-offset-4 transition-colors hover:bg-white/10"
                >
                  {t.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
