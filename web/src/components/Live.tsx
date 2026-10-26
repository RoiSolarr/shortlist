import { cx } from "@/lib/format";

/**
 * Shared indicators for work whose duration is unknown.
 * Both are pure presentation and safe in a server component.
 */

/** The step that is running right now. */
export function StepLive({ className = "size-5" }: { className?: string }) {
  return (
    <span className={cx("relative grid place-items-center", className)} aria-hidden>
      <span
        className="absolute inset-0 rounded-full"
        style={{ border: "2px solid color-mix(in oklab, var(--accent) 22%, transparent)" }}
      />
      <svg viewBox="0 0 24 24" className="spin absolute inset-0 size-full" fill="none">
        <path d="M12 2.6a9.4 9.4 0 0 1 9.4 9.4" stroke="var(--accent)" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
      <span className="size-1.5 rounded-full" style={{ background: "var(--accent)" }} />
    </span>
  );
}

/** Indeterminate progress. It never pretends to reach the end. */
export function Track({ className }: { className?: string }) {
  return (
    <span className={cx("track", className)} style={{ ["--bar" as string]: "var(--accent)" }} aria-hidden>
      <span className="track-seg" />
      <span className="track-seg track-seg-2" />
    </span>
  );
}
