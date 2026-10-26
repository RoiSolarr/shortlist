"use client";

import { cx } from "@/lib/format";
import { IconAlert, IconCheck, IconDatabase, IconFile, IconGlobe, IconPencil, IconSpark, Spinner } from "./icons";

/**
 * Five named stages instead of one anonymous spinner, so the person can see
 * which part is slow and the automation becomes visible work.
 *
 * The stage names map to the n8n nodes: fetch_post, load_resume, score_fit,
 * draft_letter, save_job. The analyze endpoint answers once, at the end, so
 * the rail advances on the same elapsed thresholds the panel has always
 * used and the timings shown are the ones this screen actually waited.
 */
export const RUN_STEPS = [
  { id: "fetch_post", label: "Fetch the post", at: 0, icon: IconGlobe },
  { id: "load_resume", label: "Read your resume", at: 4, icon: IconFile },
  { id: "score_fit", label: "Score the fit", at: 9, icon: IconSpark, badge: "Gemini" },
  { id: "draft_letter", label: "Draft the cover letter", at: 14, icon: IconPencil },
  { id: "save_job", label: "Save to your board", at: 20, icon: IconDatabase },
] as const;

export type RunStepId = (typeof RUN_STEPS)[number]["id"];

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function RunRail({
  elapsed,
  substeps,
  failedStep,
}: {
  elapsed: number;
  /** What each stage is doing right now, by id. */
  substeps?: Partial<Record<RunStepId, string>>;
  failedStep?: RunStepId | null;
}) {
  const failedIndex = failedStep ? RUN_STEPS.findIndex((s) => s.id === failedStep) : -1;
  const current =
    failedIndex >= 0 ? failedIndex : RUN_STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);
  const progress = failedIndex >= 0 ? (failedIndex + 0.5) / RUN_STEPS.length : (current + 0.5) / RUN_STEPS.length;

  return (
    <section className="panel overflow-hidden" role="status" aria-live="polite">
      <span className="rail rounded-none" aria-hidden>
        <span
          className="rail-fill"
          style={{ width: `${Math.round(progress * 100)}%`, ["--bar" as string]: failedIndex >= 0 ? "var(--bad)" : "var(--ink)" }}
        />
      </span>

      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
        <p className="t-section">
          {failedIndex >= 0 ? "Run stopped" : "Analyzing"}{" "}
          <span className="text-ui font-normal text-muted">
            step {current + 1} of {RUN_STEPS.length}
          </span>
        </p>
        <span className="tabular rounded-md bg-sunken px-2 py-1 text-meta font-semibold text-muted ring-1 ring-line">
          {clock(elapsed)}
        </span>
      </div>

      <ol className="px-4 pb-2">
        {RUN_STEPS.map((step, i) => {
          const state =
            failedIndex === i ? "failed" : i < current ? "done" : i === current ? (failedIndex >= 0 ? "next" : "now") : "next";
          const Icon = step.icon;
          const took =
            state === "done"
              ? (RUN_STEPS[i + 1]?.at ?? elapsed) - step.at
              : state === "now"
                ? Math.max(0, elapsed - step.at)
                : null;

          return (
            <li key={step.id} className="run-step" data-state={state}>
              <span className="run-badge" aria-hidden>
                {state === "done" && <IconCheck className="draw size-3.5" />}
                {state === "now" && <Spinner className="size-3.5" />}
                {state === "failed" && <IconAlert className="size-3.5" />}
                {state === "next" && <Icon className="size-3.5" />}
              </span>

              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={cx("text-ui", state === "next" ? "text-faint" : "font-semibold text-ink")}>
                    {step.label}
                  </span>
                  {"badge" in step && step.badge && state !== "next" && (
                    <span className="chip chip-plain h-[18px] px-1.5 text-[10px] font-bold tracking-[0.06em] uppercase">
                      {step.badge}
                    </span>
                  )}
                </span>
                {substeps?.[step.id] && (
                  <span className={cx("mt-0.5 block text-meta", state === "next" ? "text-faint" : "text-muted")}>
                    {substeps[step.id]}
                    {state === "now" && <span className="caret" />}
                  </span>
                )}
              </span>

              <span className="tabular self-start pt-0.5 text-meta text-faint">
                {took === null ? "—" : `${took.toFixed(1)}s`}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-meta text-muted">
        <IconDatabase className="mt-px size-3.5 shrink-0 text-faint" />
        Safe to leave. The run finishes on the server and the job appears on your board.
      </p>
    </section>
  );
}
