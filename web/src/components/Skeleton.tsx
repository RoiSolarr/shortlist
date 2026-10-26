import { cx } from "@/lib/format";

/**
 * Skeleton primitives. They sweep gently rather than flash, and they are
 * sized to the real geometry so nothing shifts when the content arrives.
 */
export function Sk({ className }: { className?: string }) {
  return <span aria-hidden className={cx("skel block", className)} />;
}

export function SkLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden className={cx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} className={cx("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </span>
  );
}

/**
 * Wraps a whole route skeleton: announces the wait once, politely.
 * `data-skeleton` tells the shell's navigation overlay the page is not in yet.
 */
export function SkPage({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true" data-skeleton>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}
