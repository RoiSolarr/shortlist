"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, StatusChange } from "@/lib/types";
import { deleteJob, loadHistory, updateJob } from "@/lib/jobs";
import { STATUS_LABEL } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { useShell } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { JobReport } from "./JobReport";
import { TopBar } from "./TopBar";
import { useToast } from "./Toast";
import { IconArrowUpRight, IconChevronRight, IconRefresh, IconTrash, Spinner } from "./icons";

export function JobDetail({
  job: initial,
  history: initialHistory,
  average = null,
  crumbStage,
}: {
  job: Job;
  history: StatusChange[];
  /** Optional: this person's average fit, for the dial notch. */
  average?: number | null;
  /** Optional: the stage shown in the breadcrumb. */
  crumbStage?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const shell = useShell();
  const [job, setJob] = useState(initial);
  const [history, setHistory] = useState(initialHistory);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [appliedAt, setAppliedAt] = useState(initial.applied_at ?? "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [version, setVersion] = useState(0);

  const dirty = notes !== (job.notes ?? "") || appliedAt !== (job.applied_at ?? "");
  const stageSince = [...history].reverse().find((h) => h.to_status === job.status)?.changed_at ?? null;

  async function saveTracking() {
    setSaving(true);
    const { job: saved, error } = await updateJob(job.id, { notes: notes || null, applied_at: appliedAt || null });
    setSaving(false);
    if (error || !saved) return toast("Could not save. Try again.", "error");
    setJob(saved);
    toast("Tracking details saved");
  }

  async function analyzeAgain() {
    setReanalyzing(true);
    const release = shell.block({ title: "Analyzing", detail: "Scoring this job against your active resume." });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_posting_id: job.job_posting_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || "Could not analyze again. Try in a minute.", "error");
      setJob(data.job);
      setVersion((v) => v + 1);
      toast("Analyzed again with your active resume");
      router.refresh();
    } catch {
      toast("Network error. Try again.", "error");
    } finally {
      setReanalyzing(false);
      release();
    }
  }

  async function remove() {
    setConfirming(false);
    const busy = { title: "Deleting", detail: "Removing this job, its cover letter and timeline." };
    const release = shell.block(busy);
    try {
      const { error } = await deleteJob(job.job_posting_id);
      if (error) return toast("Could not delete this job.", "error");
      toast("Job deleted");
      // The same words stay up until the board has painted
      shell.navigate(null, busy);
      router.replace("/board");
      router.refresh();
    } finally {
      release();
    }
  }

  return (
    <>
      <TopBar
        back="/board"
        onBack={(e) => shell.navigate(e, { title: "Back to board", detail: "Loading your board." })}
        crumbs={[
          { label: "Board", href: "/board" },
          ...(crumbStage ? [{ label: crumbStage }] : []),
          { label: job.company },
        ]}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={analyzeAgain} disabled={reanalyzing} aria-busy={reanalyzing}>
              {reanalyzing ? <Spinner className="size-3.5" /> : <IconRefresh className="size-3.5" />}
              {reanalyzing ? "Analyzing" : "Re-run"}
            </button>
            {job.url && (
              <a href={job.url} target="_blank" rel="noreferrer" className="btn btn-quiet btn-sm">
                Open post
                <IconArrowUpRight className="size-3.5" />
              </a>
            )}
          </>
        }
      />

      <div className="page">
        <JobReport
          key={version}
          job={job}
          average={average}
          stageSince={stageSince}
          stageReadOnly
          onChange={async (next) => {
            const statusChanged = next.status !== job.status;
            setJob(next);
            if (next.applied_at !== job.applied_at) setAppliedAt(next.applied_at ?? "");
            if (statusChanged) setHistory(await loadHistory(next.id));
          }}
        >
          <section aria-labelledby="tracking-title" className="panel p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="tracking-title" className="t-section">
                  Tracking
                </h2>
                <p className="mt-0.5 text-meta text-muted">Keep interview dates, contacts and follow ups in one place.</p>
              </div>
              <div className="reveal" data-open={dirty} aria-hidden={!dirty}>
                <div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={saveTracking}
                    disabled={saving || !dirty}
                    aria-busy={saving}
                  >
                    {saving && <Spinner className="size-3.5" />}
                    Save details
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[200px_1fr]">
              <div>
                <label htmlFor="applied-at" className="label">
                  Applied on
                </label>
                <input
                  id="applied-at"
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  className="field"
                />
                <p className="mt-1.5 text-meta text-faint">Filled in when you move a job to Applied.</p>
              </div>
              <div>
                <label htmlFor="notes" className="label">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Recruiter name, interview on Nov 4 at 10:00, salary range discussed, follow up next week"
                  className="field resize-y leading-relaxed"
                />
              </div>
            </div>

            {history.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="eyebrow mb-3.5">Timeline</h3>
                <ol className="flex flex-col">
                  {history.map((h, i) => (
                    <li key={h.id} data-status={h.to_status} className="relative flex gap-3.5 pb-4 last:pb-0">
                      {i < history.length - 1 && (
                        <span
                          className="draw-down absolute top-3 left-[3px] h-full w-px bg-line"
                          style={{ animationDelay: `${i * 70}ms` }}
                          aria-hidden
                        />
                      )}
                      <span className="st-dot enter-pop relative mt-1.5" style={{ animationDelay: `${i * 70}ms` }} />
                      <div className="text-ui">
                        <span className="font-semibold" style={{ color: "var(--st)" }}>
                          {h.from_status ? STATUS_LABEL[h.to_status] : `Analyzed, ${STATUS_LABEL[h.to_status]}`}
                        </span>
                        <span className="tabular ml-2 text-meta text-faint">{formatDate(h.changed_at)}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {job.description && (
            <details className="panel disclose group p-5 md:p-6">
              <summary className="t-section cursor-pointer list-none marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  Job post text
                  <span className="flex items-center gap-1.5 text-meta font-normal text-muted">
                    <span className="group-open:hidden">Show</span>
                    <span className="hidden group-open:inline">Hide</span>
                    <IconChevronRight className="size-4 transition-transform duration-200 group-open:rotate-90" />
                  </span>
                </span>
              </summary>
              <div className="mt-4 max-h-[480px] overflow-auto text-ui leading-relaxed whitespace-pre-wrap text-ink-soft">
                {job.description}
              </div>
            </details>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-meta text-faint">
            <span className="tabular">First analyzed {formatDate(job.created_at)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
              <IconTrash className="size-3.5" />
              Delete job
            </button>
          </footer>
          <ConfirmDialog
            open={confirming}
            title="Delete this job?"
            detail={`“${job.title}”, its cover letter and timeline are removed for good.`}
            confirmLabel="Delete"
            onConfirm={remove}
            onCancel={() => setConfirming(false)}
          />
        </JobReport>
      </div>
    </>
  );
}
