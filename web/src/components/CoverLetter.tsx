"use client";

import { useEffect, useRef, useState } from "react";
import { relativeTime, wordCount } from "@/lib/format";
import { IconCheck, IconCopy, IconDownload, IconShield, Spinner } from "./icons";

export function CoverLetter({
  value,
  fileName,
  onSave,
  onApplied,
}: {
  value: string;
  fileName: string;
  onSave: (text: string) => Promise<boolean>;
  /** Optional: offer the next step once the letter is ready to send. */
  onApplied?: () => void;
}) {
  const [text, setText] = useState(value);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const dirty = text !== value;
  const words = wordCount(text);

  useEffect(() => setText(value), [value]);

  // Grow with the content so the letter reads like a page, not a scroll box
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName.replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "_") || "cover_letter"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function save() {
    setSaving(true);
    const ok = await onSave(text);
    setSaving(false);
    if (ok) setSavedAt(new Date().toISOString());
  }

  return (
    <section aria-labelledby="cover-letter-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="cover-letter-title" className="t-section">
            Cover letter{" "}
            <span className="tabular ml-1 text-meta font-normal text-muted">
              {words} words · about {Math.max(1, Math.round(words / 230))} minute
              {Math.max(1, Math.round(words / 230)) === 1 ? "" : "s"} to read
            </span>
          </h2>
        </div>
        <div className="flex items-center">
          {savedAt && !dirty && (
            <span className="mr-3 flex items-center gap-1.5 text-meta text-good">
              <IconCheck className="size-3.5" />
              Saved {relativeTime(savedAt)}
            </span>
          )}
          {/* Save actions slide in with the first edit rather than popping */}
          <div className="reveal-x" data-open={dirty} aria-hidden={!dirty}>
            <div className="flex gap-2 pe-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setText(value)} disabled={saving || !dirty}>
                Discard
              </button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty} aria-busy={saving}>
                {saving && <Spinner className="size-3.5" />}
                Save changes
              </button>
            </div>
          </div>
          <button className="btn btn-quiet btn-sm" onClick={download} aria-label="Download as text file">
            <IconDownload className="size-3.5" />
          </button>
          <button
            className="btn btn-quiet btn-sm ms-2"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy cover letter"}
          >
            <span className="morph" data-on={copied} aria-hidden>
              <span className="morph-a">
                <IconCopy className="size-3.5" />
                Copy
              </span>
              <span className="morph-b">
                <IconCheck className="draw size-3.5" />
                Copied
              </span>
            </span>
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Cover letter copied to the clipboard" : ""}
          </span>
        </div>
      </div>

      {/* A document surface: comfortable measure, generous leading */}
      <div className="panel overflow-hidden">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Cover letter text"
          spellCheck
          className="block min-h-60 w-full resize-none overflow-hidden bg-transparent px-5 py-6 text-body leading-[1.8] text-ink-soft outline-none md:px-10 md:py-9"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken px-4 py-3">
          <p className="flex items-center gap-2 text-meta text-muted">
            <IconShield className="size-4 shrink-0 text-good" />
            Only facts from your resume. If a requirement is not in it, the letter says so instead of claiming it.
          </p>
          {onApplied && (
            <button className="btn btn-primary btn-sm" onClick={onApplied}>
              <IconCheck className="size-3.5" />
              Mark as applied
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
