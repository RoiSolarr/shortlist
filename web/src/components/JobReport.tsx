"use client";

import { useState } from "react";
import type { Job, JobStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/status";
import { cx, formatDate, hostname, initials, relativeTime } from "@/lib/format";
import { statusPatch, updateJob } from "@/lib/jobs";
import { ScoreDial } from "./ScoreDial";
import { StatusPicker } from "./StatusPicker";
import { CoverLetter } from "./CoverLetter";
import { useToast } from "./Toast";
import { IconArrowUpRight, IconCheck, IconClock, IconCopy, IconGlobe } from "./icons";

export function CompanyMark({ name, size = 44 }: { name: string | null; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[var(--radius-btn)] bg-sunken font-bold text-ink-soft ring-1 ring-line"
      style={{ width: size, height: size, fontSize: size * 0.32, letterSpacing: "-0.01em" }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

/**
 * The report arrives as one sequence: identity, then the score, then the
 * skills, then the letter. Everything stays interactive while it arrives.
 */
export function JobReport({
  job: initial,
  onChange,
  average = null,
  stageSince = null,
  stageReadOnly = false,
  children,
}: {
  job: Job;
  onChange?: (job: Job) => void;
  /** Optional: this person's average fit, for the dial notch. */
  average?: number | null;
  /** Optional: when the job entered its current stage. */
  stageSince?: string | null;
  /** Optional: show the stage without letting it change here. */
  stageReadOnly?: boolean;
  children?: React.ReactNode;
}) {
  const [job, setJob] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const host = hostname(job.url);

  function apply(next: Job) {
    setJob(next);
    onChange?.(next);
  }

  async function changeStatus(status: JobStatus) {
    const before = job;
    const patch = statusPatch(status, job.applied_at);
    apply({ ...job, status, applied_at: patch.applied_at ?? job.applied_at, position: patch.board_position ?? job.position });
    setBusy(true);
    const { job: saved, error } = await updateJob(job.id, patch);
    setBusy(false);
    if (error || !saved) {
      apply(before);
      toast("Could not update the status. Try again.", "error");
      return;
    }
    apply(saved);
    toast(`Moved to ${STATUS_LABEL[status]}`);
  }

  async function saveLetter(cover_letter: string) {
    const { job: saved, error } = await updateJob(job.id, { cover_letter });
    if (error || !saved) {
      toast("Could not save the letter. Try again.", "error");
      return false;
    }
    apply(saved);
    toast("Cover letter saved");
    return true;
  }

  async function copyPoints() {
    await navigator.clipboard.writeText(job.talking_points.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const matched = job.matched_skills ?? [];
  const missing = job.missing_skills ?? [];
  const total = matched.length + missing.length;
  const since = stageSince ?? (job.status === "applied" ? job.applied_at : null);
  const [lead, rest] = splitLead(job.summary);
  const delta = average === null || job.fit_score === null ? null : job.fit_score - average;

  return (
    <article className="flex flex-col gap-7">
      {/* Identity */}
      <header className="seq flex flex-col gap-5" style={seq(0)}>
        <div className="flex items-start gap-4">
          <CompanyMark name={job.company} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-ui font-semibold text-muted">{job.company}</p>
            <h1 className="t-job text-balance">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted">
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <IconGlobe className="size-3.5 text-faint" />
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <IconClock className="size-3.5 text-faint" />
                Analyzed {relativeTime(job.analyzed_at)}
              </span>
              {host && job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                >
                  {host}
                  <IconArrowUpRight className="size-3" />
                </a>
              )}
            </div>
          </div>
        </div>
        <StatusPicker
          value={job.status}
          onChange={stageReadOnly ? undefined : changeStatus}
          disabled={busy}
          since={since}
        />
      </header>

      {/* Fit: the signature moment */}
      <section className="panel seq grid gap-7 p-5 lg:grid-cols-[auto_1fr] lg:p-7" style={seq(1)} aria-label="Fit analysis">
        <div className="flex flex-col items-center gap-3 lg:w-[200px]">
          <ScoreDial score={job.fit_score} verdict={job.verdict} average={average} />
          {delta !== null && (
            <span
              className="chip"
              style={{
                color: delta >= 0 ? "var(--good)" : "var(--muted)",
                background: `color-mix(in oklab, ${delta >= 0 ? "var(--good)" : "var(--muted)"} 10%, transparent)`,
                border: `1px solid color-mix(in oklab, ${delta >= 0 ? "var(--good)" : "var(--muted)"} 20%, transparent)`,
              }}
            >
              <span className="tabular font-semibold">
                {delta >= 0 ? "+" : ""}
                {delta}
              </span>
              vs your average
            </span>
          )}
          <p className="max-w-[26ch] text-center text-meta leading-snug text-faint">
            {average !== null && <>Tick at {average} marks your average. </>}
            {job.resume_label ? `Scored against “${job.resume_label}”` : "Resume version no longer saved"},{" "}
            {formatDate(job.analyzed_at)}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {job.summary && (
            <p className="measure text-body text-ink-soft">
              <span className="font-semibold text-ink">{lead}</span>
              {rest && ` ${rest}`}
            </p>
          )}

          {total > 0 && (
            <div>
              <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-ui font-semibold">
                  Skill coverage{" "}
                  <span className="tabular font-normal text-muted">
                    {matched.length} of {total} matched
                  </span>
                </h3>
                <p className="text-meta text-faint">From the post, against your resume</p>
              </div>
              <div className="coverage" aria-hidden>
                {matched.map((s) => (
                  <span key={`m-${s}`} className="coverage-seg" data-kind="met" />
                ))}
                {missing.map((s) => (
                  <span key={`x-${s}`} className="coverage-seg" data-kind="missing" />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <SkillGroup title="You match" items={matched} tone="match" />
            <SkillGroup title="Gaps to address" items={missing} tone="gap" />
          </div>
        </div>
      </section>

      {job.talking_points?.length > 0 && (
        <section className="seq" style={seq(2)} aria-labelledby="points-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="points-title" className="t-section">
              Lead with these{" "}
              <span className="ml-1 text-meta font-normal text-faint">
                lines that map your work onto their post
              </span>
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={copyPoints} aria-label={copied ? "Copied" : "Copy all talking points"}>
              <span className="morph" data-on={copied} aria-hidden>
                <span className="morph-a">
                  <IconCopy className="size-3.5" />
                  Copy all
                </span>
                <span className="morph-b">
                  <IconCheck className="draw size-3.5" />
                  Copied
                </span>
              </span>
            </button>
          </div>
          <ul className="grid gap-2.5 md:grid-cols-3">
            {job.talking_points.slice(0, 3).map((p, i) => (
              <li
                key={p}
                className="enter-up flex gap-2.5 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-3 text-ui leading-snug"
                style={{ animationDelay: `calc(220ms + ${i} * var(--stagger))` }}
              >
                <IconCheck className="mt-0.5 size-4 shrink-0 text-good" />
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="seq" style={seq(3)}>
        <CoverLetter
          value={job.cover_letter ?? ""}
          fileName={`Cover letter ${job.company ?? ""} ${job.title ?? ""}`}
          onSave={saveLetter}
          onApplied={job.status === "saved" ? () => changeStatus("applied") : undefined}
        />
      </div>

      {children && (
        <div className="seq flex flex-col gap-7" style={seq(4)}>
          {children}
        </div>
      )}
    </article>
  );
}

/** The first sentence carries the recommendation, so it leads in bold. */
function splitLead(summary: string): [string, string] {
  const end = summary.indexOf(". ");
  if (end === -1 || end > 140) return [summary, ""];
  return [summary.slice(0, end + 1), summary.slice(end + 2)];
}

/** Position in the arrival sequence. */
function seq(step: number): React.CSSProperties {
  return { ["--seq" as string]: step };
}

function SkillGroup({ title, items, tone }: { title: string; items: string[]; tone: "match" | "gap" }) {
  const color = tone === "match" ? "var(--good)" : "var(--warn)";
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-ui font-semibold">
        <span className="size-1.5 rounded-full" style={{ background: color }} />
        {title}
        <span className="chip-count">{items?.length ?? 0}</span>
      </h3>
      {items?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((s, i) => (
            <li
              key={s}
              className={cx("chip enter-up", tone === "match" ? "chip-match" : "chip-gap")}
              style={{ animationDelay: `calc(240ms + ${Math.min(i, 5)} * var(--stagger))` }}
            >
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-meta text-faint">{tone === "gap" ? "No clear gaps found." : "No direct matches found."}</p>
      )}
    </div>
  );
}
