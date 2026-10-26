"use client";

import { useEffect, useRef } from "react";
import { Logo } from "./icons";
import { Track } from "./Live";

/**
 * A real block, not a modal.
 *
 * Covers the viewport, absorbs every pointer event, stops background
 * scrolling, holds keyboard focus, and never dismisses itself. Escape does
 * nothing on purpose. The caller marks the region behind it `inert` so
 * nothing back there can be reached, and keeps the overlay mounted until the
 * destination screen has painted.
 *
 * Indeterminate progress only: it never pretends to reach 100 percent.
 */
export function BlockingOverlay({
  open,
  title,
  detail,
}: {
  open: boolean;
  title: string;
  detail?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-busy="true"
      // Focus cannot leave: there is nothing to tab to in here, and the page
      // behind is inert.
      onKeyDown={(e) => {
        if (e.key === "Tab") e.preventDefault();
      }}
      className="overlay-in fixed inset-0 z-[90] grid touch-none place-items-center overscroll-contain px-6 outline-none backdrop-blur-[3px]"
      style={{ background: "color-mix(in oklab, var(--canvas) 78%, transparent)" }}
    >
      <div className="overlay-content-in flex w-full max-w-xs flex-col items-center gap-5">
        <Logo className="size-9" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="t-section">{title}</p>
          {detail && <p className="text-meta text-muted">{detail}</p>}
        </div>
        <Track className="h-1 w-40" />
      </div>
    </div>
  );
}
