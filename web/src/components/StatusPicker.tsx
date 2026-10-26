"use client";

import { STATUSES } from "@/lib/status";
import type { JobStatus } from "@/lib/types";
import { cx } from "@/lib/format";
import { IconX } from "./icons";

/** How long the job has been sitting in its current stage. */
function durationSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  return "today";
}

/**
 * The four forward stages read left to right as progress, with the current
 * one filled in its own colour. Rejected sits apart, because it is not a
 * step forward. Without `onChange` the track only shows the stage.
 */
export function StatusPicker({
  value,
  onChange,
  disabled,
  since,
}: {
  value: JobStatus;
  onChange?: (status: JobStatus) => void;
  disabled?: boolean;
  /** Optional: when the job entered the current stage. */
  since?: string | null;
}) {
  const readOnly = !onChange;

  return (
    <div className="scroll-x -mx-1 overflow-x-auto px-1 pb-1">
      <div
        role="radiogroup"
        aria-label="Application status"
        aria-readonly={readOnly || undefined}
        className="stage-track min-w-[560px]"
      >
        {STATUSES.map((s) => {
          const active = s.id === value;
          const rejected = s.id === "rejected";
          const body = (
            <>
              {rejected ? <IconX className="size-3.5" /> : <span className="st-dot" />}
              {s.label}
              {active && since && <span className="tabular font-normal opacity-85">· {durationSince(since)}</span>}
            </>
          );
          return readOnly ? (
            <span
              key={s.id}
              role="radio"
              aria-checked={active}
              data-status={s.id}
              data-apart={rejected || undefined}
              title={s.hint}
              // The track's hover belongs to the buttons, so a stage that cannot be chosen keeps still
              className={cx("stage-step cursor-default", !active && "hover:bg-transparent hover:text-muted")}
            >
              {body}
            </span>
          ) : (
            <button
              key={s.id}
              role="radio"
              aria-checked={active}
              data-status={s.id}
              data-apart={rejected || undefined}
              disabled={disabled}
              onClick={() => !active && onChange(s.id)}
              title={s.hint}
              className="stage-step"
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
