"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScoreDial } from "@/components/ScoreDial";
import { BlockingOverlay } from "@/components/BlockingOverlay";
import { IconAlert, IconCheck, IconEye, IconEyeOff, IconMinus, IconShield, Logo, Spinner } from "@/components/icons";
import { cx } from "@/lib/format";
import { STATUSES } from "@/lib/status";

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col bg-surface px-[var(--gutter)] py-8 md:px-14">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="t-section">Shortlist</span>
        </div>
        <div className="my-auto w-full max-w-[380px] py-12">
          <Suspense>
            <AuthForm />
          </Suspense>
        </div>
        <p className="text-meta text-faint">Your resume and applications are private to your account.</p>
      </div>
      <Showcase />
    </div>
  );
}

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "confirm" ? "That confirmation link expired. Sign in or create the account again." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const cameFromSubmit = useRef(false);

  // When the request fails, the message takes the focus the form lost.
  useEffect(() => {
    if (error && !busy && cameFromSubmit.current) {
      cameFromSubmit.current = false;
      errorRef.current?.focus();
    }
  }, [error, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    // The inline hints already say what's wrong; move focus there instead of repeating it below.
    if (mode === "signup") {
      setTriedSubmit(true);
      if (!PASSWORD_RULES.every((rule) => rule.test(password))) return passwordRef.current?.focus();
      if (password !== confirm) return confirmRef.current?.focus();
    }
    cameFromSubmit.current = true;
    setBusy(true);
    const supabase = createClient();

    // On success we stay busy until the next page takes over, so a slow navigation still reads as loading.
    if (mode === "signin") {
      const [{ error }] = await Promise.all([
        supabase.auth.signInWithPassword({ email, password }),
        pause(MIN_LOADING_MS),
      ]);
      if (error) {
        setBusy(false);
        return setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      }
      setLeaving(true);
      router.replace("/");
      router.refresh();
      return;
    }

    const [{ data, error }] = await Promise.all([
      supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      }),
      pause(MIN_LOADING_MS),
    ]);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    if (data.session) {
      setLeaving(true);
      router.replace("/resume");
      router.refresh();
    } else {
      setBusy(false);
      setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
    }
  }

  const submitLabel =
    mode === "signin" ? (busy ? "Signing you in" : "Sign in") : busy ? "Creating your account" : "Create account";
  const invalid = Boolean(error) && !busy;

  return (
    <>
      <div inert={leaving || undefined}>
        <h1 className="t-page text-balance">{mode === "signin" ? "Welcome back" : "Start with one job post."}</h1>
        <p className="mt-3 text-ui text-muted">
          {mode === "signin"
            ? "Sign in to see your board and analyze new jobs."
            : "Add your resume once. Every job you paste after that is scored in about eleven seconds."}
        </p>

        {/* Spacing lives inside each reveal, so a closed one takes no room */}
        <form onSubmit={submit} className="mt-7 flex flex-col">
          <fieldset disabled={busy} className="flex min-w-0 flex-col">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </div>
            <div className="mt-4">
              <PasswordField
                ref={passwordRef}
                id="password"
                label="Password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={mode === "signin" ? 6 : undefined}
                value={password}
                onChange={setPassword}
                invalid={invalid && mode === "signin"}
              >
                {mode === "signup" && <PasswordStrength password={password} flagUnmet={triedSubmit} />}
              </PasswordField>
            </div>
            {/* Height animates instead of the form jumping between modes */}
            <div className="reveal" data-open={mode === "signup"} aria-hidden={mode !== "signup"}>
              <div>
                <div className="pt-4">
                  <PasswordField
                    ref={confirmRef}
                    id="confirm-password"
                    label="Confirm password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={setConfirm}
                    // Disabled while hidden, so it stays out of the tab order
                    // and out of form validation in sign in mode.
                    disabled={mode !== "signup"}
                  >
                    <PasswordMatch password={password} confirm={confirm} />
                  </PasswordField>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="reveal" data-open={Boolean(error)}>
            <div>
              <p
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="notice notice-bad mt-4 flex items-start gap-2.5 outline-none"
              >
                <IconAlert className="mt-0.5 size-4 shrink-0 text-bad" />
                {error}
              </p>
            </div>
          </div>

          <div className="reveal" data-open={Boolean(notice)}>
            <div>
              <p role="status" className="notice notice-quiet mt-4">
                {notice}
              </p>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-6" disabled={busy} aria-busy={busy}>
            {busy && <Spinner className="size-4" />}
            {submitLabel}
          </button>
          {busy && (
            <p className="mt-2 text-center text-meta text-faint" role="status">
              Fields lock while this runs.
            </p>
          )}
        </form>

        <p className="mt-6 text-ui text-muted">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setConfirm("");
              setTriedSubmit(false);
              setError(null);
              setNotice(null);
            }}
            className="font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>

      {/* The request shows in the form. The overlay only covers the
          navigation, so the old form never flashes behind the new screen. */}
      <BlockingOverlay
        open={leaving}
        title={mode === "signin" ? "Signing you in" : "Setting up your account"}
        detail={mode === "signin" ? "Loading your board and resume." : "Your first stop is the resume page."}
      />
    </>
  );
}

const MIN_LOADING_MS = 600;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function PasswordField({
  ref,
  id,
  label,
  autoComplete,
  minLength,
  value,
  onChange,
  disabled,
  invalid,
  children,
}: {
  ref?: React.Ref<HTMLInputElement>;
  id: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  children?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const name = label.toLowerCase();

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          disabled={disabled}
          aria-invalid={invalid || undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={children ? `${id}-hint` : undefined}
          className="field pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? `Hide ${name}` : `Show ${name}`}
          aria-controls={id}
          disabled={disabled}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-faint transition-colors enabled:hover:text-ink"
        >
          {visible ? <IconEye /> : <IconEyeOff />}
        </button>
      </div>
      {children && <div id={`${id}-hint`}>{children}</div>}
    </div>
  );
}

const PASSWORD_RULES = [
  { label: "Use at least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Add an uppercase letter", test: (p: string) => /\p{Lu}/u.test(p) },
  { label: "Add a lowercase letter", test: (p: string) => /\p{Ll}/u.test(p) },
  { label: "Add a number or symbol", test: (p: string) => /[^\p{L}\s]/u.test(p) },
];

/** The same four rules, in the two words each one is really about. */
const SHORT_RULE: Record<string, string> = {
  "Use at least 8 characters": "8 characters",
  "Add an uppercase letter": "Uppercase",
  "Add a lowercase letter": "Lowercase",
  "Add a number or symbol": "Number or symbol",
};

/** Four checks that answer as you type, plus the bar they add up to. */
function PasswordStrength({ password, flagUnmet }: { password: string; flagUnmet: boolean }) {
  const met = PASSWORD_RULES.map((rule) => rule.test(password));
  const score = met.filter(Boolean).length;
  // Once every rule passes there is nothing left to fix, so the checks fold away
  const done = score === PASSWORD_RULES.length;

  return (
    <>
      <div className="reveal" data-open={!done} aria-hidden={done}>
        <div>
          <div className="pt-2.5">
            <div className="flex gap-1.5" aria-hidden>
              {PASSWORD_RULES.map((rule, i) => (
                <span
                  key={rule.label}
                  className="h-1 flex-1 rounded-full transition-colors duration-200"
                  style={{ background: i < score ? "var(--good)" : "var(--line)" }}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {PASSWORD_RULES.map((rule, i) => (
                <li
                  key={rule.label}
                  className={cx(
                    "flex items-center gap-1 text-meta transition-colors duration-200",
                    met[i] ? "text-good" : flagUnmet ? "text-bad" : "text-faint",
                  )}
                >
                  {met[i] ? <IconCheck className="draw size-3.5" /> : <IconMinus className="size-3.5" />}
                  {SHORT_RULE[rule.label] ?? rule.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {score} of {PASSWORD_RULES.length} password requirements met
      </p>
    </>
  );
}

function PasswordMatch({ password, confirm }: { password: string; confirm: string }) {
  const match = confirm !== "" && confirm === password;
  const mismatch = confirm !== "" && !match;
  return (
    <>
      <div className="reveal" data-open={match} aria-hidden={!match}>
        <div>
          <p className="flex items-center gap-1.5 pt-2 text-meta text-good">
            <IconCheck className="draw size-3.5" />
            Passwords match
          </p>
        </div>
      </div>
      <div className="reveal" data-open={mismatch} aria-hidden={!mismatch}>
        <div>
          <p className="flex items-center gap-1.5 pt-2 text-meta text-bad">
            <IconMinus className="size-3.5" />
            Passwords don&apos;t match
          </p>
        </div>
      </div>
    </>
  );
}

const SAMPLE = [
  { met: true, text: "React Native and Next.js in one role" },
  { met: true, text: "Supabase and Postgres, both shipped" },
  { met: false, text: "GraphQL, listed as nice to have" },
];

const SAMPLE_COUNTS: Record<string, number> = { saved: 4, applied: 7, interview: 2, offer: 1 };

/** The first screen shows a real report rather than describing one. */
function Showcase() {
  return (
    <aside aria-hidden className="night relative hidden overflow-hidden border-l border-line lg:flex lg:flex-col lg:justify-center lg:px-14 2xl:px-20">
      <div className="mx-auto w-full max-w-[520px]">
        <p className="eyebrow">What you get back</p>
        <h2 className="t-page mt-3 text-balance">An honest score, and the reason for it.</h2>

        <div className="panel enter-pop mt-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <ScoreDial score={82} verdict="Good fit" size={132} />
          <div className="min-w-0 flex-1">
            <p className="text-meta text-muted">Northwind Labs</p>
            <p className="t-section">Senior Full Stack Engineer</p>
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {SAMPLE.map((row, i) => (
                <li
                  key={row.text}
                  className={cx("enter-up flex items-center gap-2 text-meta", row.met ? "text-ink-soft" : "text-faint")}
                  style={{ animationDelay: `calc(420ms + ${i} * var(--stagger))` }}
                >
                  {row.met ? (
                    <IconCheck className="size-3.5 shrink-0 text-good" />
                  ) : (
                    <IconMinus className="size-3.5 shrink-0 text-warn" />
                  )}
                  {row.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {STATUSES.filter((s) => s.id !== "rejected").map((s, i) => (
            <div
              key={s.id}
              data-status={s.id}
              className="panel enter-up px-3 py-2.5"
              style={{ animationDelay: `calc(240ms + ${i} * var(--stagger))` }}
            >
              <span className="flex items-center gap-1.5 text-meta text-muted">
                <span className="st-dot" />
                {s.label}
              </span>
              <span className="t-stat mt-1 block">{SAMPLE_COUNTS[s.id]}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-meta text-muted">
          <IconShield className="size-4 shrink-0 text-good" />
          Your resume and your applications stay in your own account. Row level security, always on.
        </p>
      </div>
    </aside>
  );
}
