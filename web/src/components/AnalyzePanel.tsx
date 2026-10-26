"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import { cx } from "@/lib/format";
import { JobReport } from "./JobReport";
import { RUN_STEPS, RunRail, type RunStepId } from "./RunRail";
import { IconAlert, IconCheck, IconClipboard, IconGlobe, IconLink, IconShield, IconSpark, IconText, Spinner } from "./icons";

type Mode = "link" | "text";
type Failure = { message: string; code?: string; job?: { id: string } };

/**
 * The four original step thresholds (0, 4, 9 and 14 seconds) now live in
 * RUN_STEPS, together with the fifth stage the sheet asks for. Nothing about
 * the request itself changed.
 */
const MIN_TEXT = 200;

/** Which applicant tracking system a link belongs to, from the link alone. */
function describeSource(raw: string) {
  const value = raw.trim();
  if (value.length < 9) return null;
  let host: string;
  try {
    host = new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host.includes(".")) return null;
  const ats =
    host.includes("greenhouse") ? "Greenhouse"
    : host.includes("lever.co") ? "Lever"
    : host.includes("workable") ? "Workable"
    : host.includes("ashbyhq") ? "Ashby"
    : host.includes("smartrecruiters") ? "SmartRecruiters"
    : host.includes("recruitee") ? "Recruitee"
    : host.includes("bamboohr") ? "BambooHR"
    : host.includes("myworkdayjobs") || host.includes("workday") ? "Workday"
    : null;
  const blocked = host.includes("linkedin.") || host.includes("indeed.");
  return { host, ats, blocked };
}

export function AnalyzePanel({
  hasResume,
  resumeLabel,
  average,
  hero,
  below,
  rail,
}: {
  hasResume: boolean;
  /** Optional: the version this run will be scored against. */
  resumeLabel?: string | null;
  /** Optional: this person's average fit, for the dial notch. */
  average?: number | null;
  /** Optional slots, so the run can take over the context rail. */
  hero?: React.ReactNode;
  below?: React.ReactNode;
  rail?: React.ReactNode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (job) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [job]);

  const canSubmit = hasResume && !running && (mode === "link" ? url.trim().length > 8 : text.trim().length >= 200);
  const source = useMemo(() => describeSource(url), [url]);

  async function analyze(e?: React.FormEvent, reanalyze = false) {
    e?.preventDefault();
    if (!canSubmit) return;
    setRunning(true);
    setElapsed(0);
    setFailure(null);
    setJob(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "link"
            ? { url: url.trim(), reanalyze }
            : { url: url.trim() || null, description: text.trim(), reanalyze },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFailure({ message: data.error || "Something went wrong. Try again.", code: data.code, job: data.job });
        return;
      }
      setJob(data.job);
      setUrl("");
      setText("");
      router.refresh();
    } catch {
      setFailure({ message: "Network error. Check your connection and try again." });
    } finally {
      setRunning(false);
    }
  }

  function switchToText() {
    setMode("text");
    setFailure(null);
  }

  async function pasteLink() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) setUrl(clip.trim());
      else urlRef.current?.focus();
    } catch {
      // No clipboard permission: put the cursor where it is needed instead.
      urlRef.current?.focus();
    }
  }

  const failedStep: RunStepId | null = failure
    ? failure.code === "UNREADABLE_PAGE"
      ? "fetch_post"
      : failure.code === "NO_RESUME"
        ? "load_resume"
        : failure.code === "DUPLICATE"
          ? null
          : "score_fit"
    : null;

  const showRail = running || failedStep !== null;

  const substeps: Partial<Record<RunStepId, string>> = {
    fetch_post: mode === "link" ? (source?.host ?? "Reading the link") : `${text.trim().length.toLocaleString()} words pasted`,
    load_resume: resumeLabel ?? "Your active version",
    score_fit: "Comparing the post with your resume",
    draft_letter: running && elapsed < 14 ? "Waiting on the score" : "Only facts from your resume",
    save_job: "Lands in Saved",
  };

  return (
    <div className="with-rail">
      <div className="flex min-w-0 flex-col gap-8">
        {hero}

        {/* The primary action on the page: the one raised surface here */}
        <form onSubmit={analyze} className="panel-raised overflow-hidden" aria-busy={running}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4 md:px-5">
            <div className="seg" role="tablist" aria-label="Input type">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "link"}
                onClick={() => setMode("link")}
                className="seg-item"
              >
                <IconLink className="size-4" />
                Job link
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "text"}
                onClick={() => setMode("text")}
                className="seg-item"
              >
                <IconText className="size-4" />
                Paste description
              </button>
            </div>
            <p className="text-meta text-faint">Greenhouse, Lever, Workable, Ashby and most career pages</p>
          </div>

          <div className="flex flex-col gap-4 p-4 md:p-5">
            {mode === "link" ? (
              <div className="enter-fade">
                <label htmlFor="job-url" className="sr-only">
                  Job post link
                </label>
                <div className="relative">
                  <input
                    ref={urlRef}
                    id="job-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://boards.greenhouse.io/company/jobs/0000000"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={running}
                    className="field mono h-11 pr-24 pl-10"
                  />
                  <IconLink className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                  <button
                    type="button"
                    onClick={pasteLink}
                    disabled={running}
                    className="btn btn-quiet btn-sm absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    <IconClipboard className="size-3.5" />
                    Paste
                  </button>
                </div>

                {/* What we know from the link itself, before a run is spent */}
                {source ? (
                  <div className="enter-fade mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius)] border border-line bg-sunken px-3 py-2.5">
                    <IconGlobe className="size-4 shrink-0 text-faint" />
                    {source.ats && (
                      <span className="chip chip-plain h-[20px] px-1.5 text-[10px] font-bold tracking-[0.08em] uppercase">
                        {source.ats}
                      </span>
                    )}
                    <span className="mono min-w-0 flex-1 truncate font-semibold">{source.host}</span>
                    {source.blocked ? (
                      <span className="flex items-center gap-1.5 text-meta font-semibold text-warn">
                        <IconAlert className="size-3.5" />
                        Blocks fetching, paste the description
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-meta font-semibold text-good">
                        <IconCheck className="size-3.5" />
                        Link recognised
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2.5 text-meta text-muted">
                    Works with most company career pages, Greenhouse, Lever and Workable. For LinkedIn or Indeed, paste
                    the description instead.
                  </p>
                )}
              </div>
            ) : (
              <div className="enter-fade flex flex-col gap-4">
                <div>
                  <label htmlFor="job-text" className="label">
                    Job description
                  </label>
                  <textarea
                    id="job-text"
                    rows={9}
                    placeholder="Paste the full job post here: title, company, responsibilities and requirements."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={running}
                    className="field resize-y"
                  />
                  <TextMeter length={text.trim().length} />
                </div>
                <div>
                  <label htmlFor="job-url-optional" className="label">
                    Link to the post <span className="font-normal text-faint">(optional, saved for reference)</span>
                  </label>
                  <input
                    id="job-url-optional"
                    type="url"
                    placeholder="https://"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={running}
                    className="field mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Which resume is being scored, stated where the decision happens */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken px-4 py-3 md:px-5">
            {!hasResume ? (
              <p className="text-meta font-semibold text-warn">
                Add your resume first.{" "}
                <Link href="/resume" className="underline underline-offset-4">
                  Go to Resume
                </Link>
              </p>
            ) : (
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                <IconShield className="size-4 shrink-0 text-good" />
                <span>
                  Scored against <span className="font-semibold text-ink">{resumeLabel ?? "your active resume"}</span>
                </span>
                <Link href="/resume" className="text-muted underline underline-offset-4 transition-colors hover:text-ink">
                  Change resume
                </Link>
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={!canSubmit} aria-busy={running}>
              {running ? <Spinner className="size-4" /> : <IconSpark className="size-4" />}
              {running ? "Analyzing" : "Analyze job"}
              {!running && (
                <span className="kbd" aria-hidden>
                  ⏎
                </span>
              )}
            </button>
          </div>
        </form>

        {/* The result forms in place: the skeleton holds the real geometry */}
        {running && <ResultSkeleton />}

        {failure && (
          <FailureNotice
            failure={failure}
            stepNumber={failedStep ? RUN_STEPS.findIndex((s) => s.id === failedStep) + 1 : null}
            onPaste={switchToText}
            onReanalyze={() => analyze(undefined, true)}
          />
        )}

        {job && (
          <div ref={resultRef} className="scroll-mt-20">
            <div className="seq mb-5 flex items-center justify-between gap-3" style={{ ["--seq" as string]: 0 }}>
              <p className="flex items-center gap-2 text-ui font-semibold text-good">
                <IconCheck className="draw size-4" />
                Saved to your board
              </p>
              <Link href="/board" className="btn btn-quiet btn-sm">
                Open board
              </Link>
            </div>
            <JobReport key={job.id} job={job} average={average ?? null} />
          </div>
        )}

        {below}
      </div>

      {/* The rail carries context, and the run while one is going */}
      <aside className="flex min-w-0 flex-col gap-4">
        {showRail ? (
          <RunRail elapsed={elapsed} substeps={substeps} failedStep={failedStep} />
        ) : (
          rail
        )}
      </aside>
    </div>
  );
}

/** Feedback on the way to a usable paste, not a warning. */
function TextMeter({ length }: { length: number }) {
  const ready = length >= MIN_TEXT;
  const ratio = Math.min(1, length / MIN_TEXT);
  return (
    <div className="mt-2.5 flex items-center gap-3">
      <span className="track h-[3px] w-24 shrink-0" aria-hidden>
        <span
          className="absolute inset-0 origin-left rounded-full transition-[transform,background-color] duration-200"
          style={{ transform: `scaleX(${ratio})`, background: ready ? "var(--good)" : "var(--line-strong)" }}
        />
      </span>
      <p className={cx("tabular text-meta", ready ? "text-muted" : "text-faint")}>
        {ready ? `${length.toLocaleString()} characters` : `${MIN_TEXT - length} more characters needed`}
      </p>
    </div>
  );
}

/** Occupies the exact geometry of the report, so nothing jumps on swap. */
function ResultSkeleton() {
  return (
    <div className="panel grid gap-7 p-5 md:grid-cols-[auto_1fr] md:p-7" aria-hidden>
      <div className="flex flex-col items-center gap-3">
        <span className="relative grid size-[164px] place-items-center">
          <svg viewBox="0 0 164 164" className="size-full -rotate-[210deg]" fill="none">
            <circle cx="82" cy="82" r="74" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" strokeDasharray="310 465" />
            <circle
              className="spin origin-center"
              cx="82"
              cy="82"
              r="74"
              stroke="var(--line-strong)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="58 465"
            />
          </svg>
          <span className="absolute text-meta text-faint">scoring</span>
        </span>
        <span className="skel h-3 w-28" />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span className="skel h-4 w-full" />
          <span className="skel h-4 w-11/12" />
          <span className="skel h-4 w-3/5" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((group) => (
            <div key={group} className="flex flex-col gap-2.5">
              <span className="skel h-3 w-24" />
              <div className="flex flex-wrap gap-1.5">
                {[64, 80, 56, 72].map((w, i) => (
                  <span key={i} className="skel h-6" style={{ width: w, animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A failure names the step, says why, and offers the one action that fixes it. */
function FailureNotice({
  failure,
  stepNumber,
  onPaste,
  onReanalyze,
}: {
  failure: Failure;
  stepNumber: number | null;
  onPaste: () => void;
  onReanalyze: () => void;
}) {
  return (
    <div role="alert" className="notice notice-bad enter-surface flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <IconAlert className="mt-0.5 size-4 shrink-0 text-bad" />
        <div className="min-w-0">
          <p className="t-section text-bad">
            {stepNumber ? `Step ${stepNumber} failed` : "That job is already on your board"}
          </p>
          <p className="mt-1 text-ui text-ink-soft">{failure.message}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-6.5">
        {failure.code === "UNREADABLE_PAGE" && (
          <button className="btn btn-quiet btn-sm" onClick={onPaste}>
            <IconText className="size-3.5" />
            Paste the description
          </button>
        )}
        {failure.code === "NO_RESUME" && (
          <Link href="/resume" className="btn btn-quiet btn-sm">
            Add resume
          </Link>
        )}
        {failure.code === "DUPLICATE" && failure.job && (
          <>
            <Link href={`/jobs/${failure.job.id}`} className="btn btn-quiet btn-sm">
              Open saved analysis
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={onReanalyze}>
              Analyze again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
