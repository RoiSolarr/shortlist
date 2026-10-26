"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Resume } from "@/lib/types";
import { cx, formatDate, wordCount } from "@/lib/format";
import { useShell } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { StepLive, Track } from "./Live";
import { IconCheck, IconFile, IconTrash, IconUpload, Spinner } from "./icons";

const MAX_BYTES = 5 * 1024 * 1024;
const NEW = "new";

export type ResumeUsage = Record<string, { jobs: number; average: number | null }>;

function sortResumes(list: Resume[]) {
  return [...list].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active) || b.created_at.localeCompare(a.created_at),
  );
}

/** Wraps every matched phrase so the person sees what the model reads. */
function highlight(text: string, terms: string[]) {
  if (!terms.length || !text) return text;
  const escaped = [...new Set(terms)]
    .filter((t) => t.length > 1)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const lower = new Set(escaped.map((t) => t.toLowerCase().replace(/\\/g, "")));
  return text.split(re).map((part, i) =>
    lower.has(part.toLowerCase()) ? (
      <mark key={i} className="hit">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function ResumeManager({
  userId,
  initial,
  usage,
  skills,
}: {
  userId: string;
  initial: Resume[];
  /** Optional: how each version has performed, by resume id. */
  usage?: ResumeUsage;
  /** Optional: which skills this resume has matched, and how often. */
  skills?: { skill: string; count: number }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { block } = useShell();
  const [resumes, setResumes] = useState<Resume[]>(sortResumes(initial));
  const [selectedId, setSelectedId] = useState<string>(initial.find((r) => r.is_active)?.id ?? initial[0]?.id ?? NEW);
  const selected = resumes.find((r) => r.id === selectedId) ?? null;

  const [label, setLabel] = useState(selected?.label ?? "My resume");
  const [text, setText] = useState(selected?.resume_text ?? "");
  const [phase, setPhase] = useState<"idle" | "uploading" | "reading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  const busy = phase !== "idle";
  const toDelete = resumes.find((r) => r.id === confirmDelete);
  const dirty = selected
    ? text.trim() !== (selected.resume_text ?? "").trim() || label.trim() !== selected.label
    : text.trim().length > 0;

  // The highlight layer and the textarea share one height, so they stay
  // aligned and the document never scrolls inside itself.
  useEffect(() => {
    const el = editor.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const terms = useMemo(() => (skills ?? []).slice(0, 24).map((s) => s.skill), [skills]);
  const marked = useMemo(() => highlight(text, terms), [text, terms]);

  function select(r: Resume | null) {
    setSelectedId(r?.id ?? NEW);
    setLabel(r?.label ?? "My resume");
    setText(r?.resume_text ?? "");
    setError(null);
    setConfirmDelete(null);
  }

  async function reload(selectId?: string) {
    const { data } = await createClient()
      .from("resumes")
      .select("*")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    const list = sortResumes((data ?? []) as Resume[]);
    setResumes(list);
    const next = list.find((r) => r.id === selectId) ?? list.find((r) => r.is_active) ?? list[0] ?? null;
    select(next);
    router.refresh();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf") return setError("Choose a PDF file. For Word files, paste the text below.");
    if (file.size > MAX_BYTES) return setError("That file is larger than 5 MB. Export a smaller PDF.");

    const supabase = createClient();
    const resumeId = crypto.randomUUID();
    setPhase("uploading");
    // The whole screen waits with the upload, so nothing changes underneath it
    let release = block({ title: "Uploading your PDF", detail: "Sending the file to your account." });
    try {
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(`${userId}/${resumeId}.pdf`, file, { contentType: "application/pdf" });
      if (upErr) {
        setPhase("idle");
        return setError("Upload failed. Check your connection and try again.");
      }

      setPhase("reading");
      release = block({
        title: "Reading your resume",
        detail: "This can take up to a minute if the automation server is waking up.",
      });
      const res = await fetch("/api/resume/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: resumeId, file_name: file.name }),
      });
      const data = await res.json().catch(() => ({}));
      setPhase("idle");

      if (!res.ok) return setError(data.error || "Could not read the PDF. Paste your resume text instead.");
      toast("Resume read and set as active");
      await reload(resumeId);
    } finally {
      release();
    }
  }

  async function save(asNewVersion: boolean) {
    if (text.trim().length < 200) return setError("The resume text looks too short. Paste your full resume.");
    if (!label.trim()) return setError("Give this version a name.");
    setError(null);
    setSaving(true);
    const supabase = createClient();

    if (selected && !asNewVersion) {
      const { error: err } = await supabase
        .from("resumes")
        .update({ label: label.trim().slice(0, 80), resume_text: text.trim() })
        .eq("id", selected.id);
      setSaving(false);
      if (err) return setError("Could not save. Try again.");
      toast("Resume saved");
      return reload(selected.id);
    }

    const { data, error: err } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        label: (asNewVersion && selected && label.trim() === selected.label ? `${label.trim()} (new)` : label.trim()).slice(0, 80),
        resume_text: text.trim(),
        extraction_status: "ready",
        is_active: false,
      })
      .select("id")
      .single();
    if (err || !data) {
      setSaving(false);
      return setError("Could not save. Try again.");
    }
    const { error: activeErr } = await supabase.rpc("set_active_resume", { p_resume_id: data.id });
    setSaving(false);
    if (activeErr) setError("Saved, but could not make it active. Choose Use for new jobs below.");
    else toast("New version saved and set as active");
    return reload(data.id);
  }

  async function makeActive(r: Resume) {
    const release = block({ title: "Making it active", detail: `New jobs will be scored against “${r.label}”.` });
    try {
      const { error: err } = await createClient().rpc("set_active_resume", { p_resume_id: r.id });
      if (err) return toast("Could not switch resumes. Try again.", "error");
      toast(`New jobs will use “${r.label}”`);
      await reload(r.id);
    } finally {
      release();
    }
  }

  async function remove(r: Resume) {
    setConfirmDelete(null);
    const release = block({ title: "Deleting", detail: `Removing “${r.label}”.` });
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("resumes").delete().eq("id", r.id);
      if (err) return toast("Could not delete. Try again.", "error");
      if (r.file_path) await supabase.storage.from("resumes").remove([r.file_path]);
      toast("Resume version deleted");
      await reload();
    } finally {
      release();
    }
  }

  const words = wordCount(text);

  return (
    <div className="with-rail">
      <div className="flex min-w-0 flex-col gap-7">
        {/* Upload: the rules are stated before the person commits */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) handleFile(e.dataTransfer.files?.[0]);
          }}
          data-dragging={dragging}
          className="dropzone flex flex-col items-center gap-4 px-5 py-8 text-center md:flex-row md:text-left"
        >
          <div className="grid size-12 shrink-0 place-items-center rounded-[var(--radius)] bg-sunken text-ink-soft ring-1 ring-line">
            {busy ? <StepLive className="size-5" /> : <IconUpload className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="t-section text-ink">
              {phase === "uploading" ? "Uploading your PDF" : phase === "reading" ? "Reading your resume" : "Drop it here"}
            </p>
            <p className="mt-1 text-meta text-muted">
              {busy
                ? "This can take up to a minute if the automation server is waking up."
                : "PDF, up to 5 MB. It becomes a new version and is used for every new job."}
            </p>

            {busy && (
              <div className="mt-3.5 flex flex-col gap-2.5" role="status" aria-live="polite">
                <ol className="flex flex-col gap-2 text-meta sm:flex-row sm:gap-6">
                  <PhaseStep state={phase === "uploading" ? "now" : "done"}>Uploading the file</PhaseStep>
                  <PhaseStep state={phase === "reading" ? "now" : "next"}>Reading the text</PhaseStep>
                </ol>
                <Track className="h-[3px] w-full max-w-56" />
              </div>
            )}
          </div>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            id="resume-file"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
            disabled={busy}
          />
          <label htmlFor="resume-file" className={cx("btn btn-quiet cursor-pointer", busy && "pointer-events-none opacity-50")}>
            Choose a file
          </label>
        </div>

        {error && (
          <p role="alert" className="notice notice-bad enter-surface">
            {error}
          </p>
        )}

        {/* Versions, with what each one produced */}
        {resumes.length > 0 && (
          <section aria-labelledby="versions-title">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 id="versions-title" className="t-section">
                Versions <span className="ml-1 text-meta font-normal text-faint">the active one scores every new job</span>
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => select(null)} disabled={busy}>
                Paste a new version
              </button>
            </div>
            <ul className="panel divide-y divide-line overflow-hidden">
              {resumes.map((r) => {
                const used = usage?.[r.id];
                return (
                  <li
                    key={r.id}
                    data-active={r.is_active}
                    data-selected={r.id === selectedId}
                    className="version-row flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <button onClick={() => select(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className={r.is_active ? "text-good" : "text-faint"}>
                        <IconFile />
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-ui font-semibold">{r.label}</span>
                          {r.is_active && (
                            <span className="chip chip-match h-[20px] gap-1 px-1.5 text-[10px] font-bold tracking-[0.06em] uppercase">
                              <IconCheck className="size-3" />
                              Active
                            </span>
                          )}
                          {r.extraction_status !== "ready" && (
                            <span className="chip chip-gap h-[20px] px-1.5 text-[10px] font-bold tracking-[0.06em] uppercase">
                              {r.extraction_status}
                            </span>
                          )}
                        </span>
                        <span className="tabular mt-0.5 block truncate text-meta text-faint">
                          {r.file_name ? "From PDF" : "Pasted"}, uploaded {formatDate(r.created_at)}
                          {used && used.jobs > 0 && (
                            <>
                              {" · "}used by {used.jobs} job{used.jobs === 1 ? "" : "s"}
                              {used.average !== null && <> · average fit {used.average}</>}
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                    {r.is_active ? (
                      <span className="text-meta text-faint">Used for new jobs</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <button
                          className="btn btn-quiet btn-sm"
                          onClick={() => makeActive(r)}
                          disabled={busy || r.extraction_status !== "ready"}
                        >
                          Make active
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmDelete(r.id)}
                          aria-label={`Delete ${r.label}`}
                        >
                          <IconTrash className="size-3.5" />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2.5 text-meta text-faint">
              Past analyses keep their score when you switch or delete a version. Analyze a job again to score it
              against the active one.
            </p>
            <ConfirmDialog
              open={toDelete !== undefined}
              title={`Delete “${toDelete?.label ?? ""}”?`}
              detail="This version and its PDF are removed for good. Past analyses keep their score."
              confirmLabel="Delete"
              onConfirm={() => toDelete && remove(toDelete)}
              onCancel={() => setConfirmDelete(null)}
            />
          </section>
        )}

        {/* The parsed text is the source of truth */}
        <section aria-labelledby="resume-text-title" className="panel overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label htmlFor="resume-label" className="sr-only">
                Version name
              </label>
              <input
                id="resume-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                disabled={busy}
                className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-ui font-semibold outline-none transition-colors hover:bg-sunken focus:bg-sunken"
              />
              <h2 id="resume-text-title" className="sr-only">
                Resume text
              </h2>
            </div>
            <div className="flex items-center">
              <span className="tabular text-meta text-faint">{words} words</span>
              <div className="reveal-x" data-open={dirty} aria-hidden={!dirty}>
                <div className="flex items-center gap-2 ps-3">
                  {selected && (
                    <button className="btn btn-ghost btn-sm" onClick={() => save(true)} disabled={saving || busy || !dirty}>
                      Save as new version
                    </button>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => save(false)}
                    disabled={saving || busy || !dirty}
                    aria-busy={saving}
                  >
                    {saving && <Spinner className="size-3.5" />}
                    {selected ? "Save changes" : "Save resume"}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <p className="border-b border-line bg-sunken px-4 py-2 text-meta text-faint">
            Edit it directly. This is exactly what the model reads
            {terms.length > 0 && ", and the highlights are the phrases it has matched"}.
          </p>

          {/* One document: a highlight layer behind a transparent textarea */}
          <div className="relative px-4 py-4 md:px-7 md:py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 px-4 py-4 text-ui leading-[1.75] break-words whitespace-pre-wrap text-ink-soft md:px-7 md:py-6"
            >
              {marked}
            </div>
            <textarea
              ref={editor}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              aria-label="Resume text"
              spellCheck={false}
              placeholder={"Paste your resume here.\n\nYour Name\nYour Role\n\nExperience\n...\n\nSkills\n..."}
              className="relative block min-h-[420px] w-full resize-none overflow-hidden bg-transparent font-[inherit] text-ui leading-[1.75] text-transparent caret-ink outline-none placeholder:text-faint"
            />
          </div>
        </section>
      </div>

      {/* The rail: what the parse produced */}
      <aside className="flex min-w-0 flex-col gap-4">
        <section className="panel px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="eyebrow">Parse result</p>
            <p className="tabular text-ui font-bold">{words} words</p>
          </div>
          <p className="mt-2 text-meta text-muted">
            {selected?.extraction_status === "failed"
              ? "The PDF could not be read. Paste the text instead."
              : words < 200
                ? "That is short for a resume. Check that every page came through."
                : "Long enough to score against. Check the text if a PDF came out in a mixed order."}
          </p>
        </section>

        {skills && skills.length > 0 && (
          <section className="panel px-4 py-3.5">
            <p className="eyebrow mb-3">Skills it has matched</p>
            <ul className="flex flex-wrap gap-1.5">
              {skills.slice(0, 14).map((s) => (
                <li key={s.skill} className="chip chip-plain">
                  {s.skill}
                  <span className="chip-count">{s.count}×</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-meta text-faint">
              How often each one matched a job you analyzed. A skill that never matches reads as thin to a scorer.
            </p>
          </section>
        )}

        <section className="panel px-4 py-3.5">
          <p className="eyebrow mb-2">Privacy</p>
          <p className="text-meta text-muted">
            Your resume and your applications stay in your own account. Row level security, always on.
          </p>
        </section>
      </aside>
    </div>
  );
}

function PhaseStep({ state, children }: { state: "done" | "now" | "next"; children: React.ReactNode }) {
  return (
    <li
      className={cx(
        "flex items-center gap-2",
        state === "next" ? "text-faint" : state === "done" ? "text-muted" : "font-semibold text-ink",
      )}
    >
      <span className="grid size-4 shrink-0 place-items-center">
        {state === "done" && <IconCheck className="draw size-3.5 text-good" />}
        {state === "now" && <StepLive className="size-4" />}
        {state === "next" && <span className="size-1.5 rounded-full bg-line-strong" />}
      </span>
      {children}
    </li>
  );
}
