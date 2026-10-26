"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { IconAlert, IconArrowLeft, IconMail, Spinner } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}

/** Supabase takes one reset request per address per minute. */
const RESEND_AFTER_S = 60;
const MIN_LOADING_MS = 600;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Supabase's wording, turned into what to do next. */
function friendly(message: string) {
  if (/rate limit|only request this after/i.test(message)) {
    return "Too many reset emails in a short time. Wait a minute, then try again.";
  }
  return message;
}

function ForgotPasswordForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | null>(
    params.get("error") === "expired" ? "That reset link expired or was already used. Send yourself a new one." : null,
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);
  const cameFromSubmit = useRef(false);

  // Counts down to the next allowed resend
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  // Focus follows the outcome: the message when it failed, the new heading when it was sent
  useEffect(() => {
    if (error && !busy && cameFromSubmit.current) {
      cameFromSubmit.current = false;
      errorRef.current?.focus();
    }
  }, [error, busy]);

  useEffect(() => {
    if (sentTo) sentRef.current?.focus();
  }, [sentTo]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const address = email.trim();
    setError(null);
    cameFromSubmit.current = true;
    setBusy(true);
    const [{ error }] = await Promise.all([
      createClient().auth.resetPasswordForEmail(address, {
        // The callback signs the link in, then opens the new password screen
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }),
      pause(MIN_LOADING_MS),
    ]);
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setSentTo(address);
    setWait(RESEND_AFTER_S);
  }

  const errorNotice = (
    <div className="reveal" data-open={Boolean(error)}>
      <div>
        <p ref={errorRef} tabIndex={-1} role="alert" className="notice notice-bad mt-4 flex items-start gap-2.5 outline-none">
          <IconAlert className="mt-0.5 size-4 shrink-0 text-bad" />
          {error}
        </p>
      </div>
    </div>
  );

  if (sentTo) {
    return (
      <div className="enter-up">
        <BackToSignIn />
        <span
          className="grid size-11 place-items-center rounded-[var(--radius)] text-good"
          style={{ background: "color-mix(in oklab, var(--good) 12%, transparent)" }}
          aria-hidden
        >
          <IconMail className="size-5" />
        </span>
        <h1 ref={sentRef} tabIndex={-1} className="t-page mt-5 text-balance outline-none">
          Check your email
        </h1>
        <p className="mt-3 text-ui text-muted" role="status">
          If an account exists for <span className="font-semibold break-all text-ink">{sentTo}</span>, a link to choose
          a new password is on its way.
        </p>

        <ul className="notice notice-quiet mt-6 flex list-disc flex-col gap-1.5 pl-8 text-meta">
          <li>Open it in this browser. The link only works where you asked for it.</li>
          <li>It works once and expires after an hour.</li>
          <li>Nothing yet? Check your spam folder.</li>
        </ul>

        {errorNotice}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => send()}
            disabled={busy || wait > 0}
            aria-busy={busy}
          >
            {busy && <Spinner className="size-4" />}
            {busy ? "Sending" : wait > 0 ? <span className="tabular">Resend in {wait}s</span> : "Resend link"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
            disabled={busy}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackToSignIn />
      <h1 className="t-page text-balance">Forgot your password?</h1>
      <p className="mt-3 text-ui text-muted">
        Enter the email you sign in with. We will send you a link to choose a new password.
      </p>

      <form onSubmit={send} className="mt-7 flex flex-col">
        <fieldset disabled={busy} className="flex min-w-0 flex-col">
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </fieldset>

        {errorNotice}

        <button type="submit" className="btn btn-primary btn-lg mt-6" disabled={busy} aria-busy={busy}>
          {busy && <Spinner className="size-4" />}
          {busy ? "Sending link" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}

/** Sits above the heading, where a way back is looked for first. */
function BackToSignIn() {
  return (
    <Link
      href="/login"
      className="mb-8 inline-flex items-center gap-1.5 text-ui font-semibold text-muted transition-colors hover:text-ink"
    >
      <IconArrowLeft className="size-4" />
      Back to sign in
    </Link>
  );
}
