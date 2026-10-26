"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { BlockingOverlay } from "@/components/BlockingOverlay";
import { PASSWORD_RULES, PasswordField, PasswordMatch, PasswordStrength } from "@/components/PasswordFields";
import { IconAlert, Spinner } from "@/components/icons";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <AuthForm />
      </Suspense>
    </AuthLayout>
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
                aside={
                  mode === "signin" && (
                    // Carries the address over, so it is not typed twice
                    <Link
                      href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                      className="text-meta font-semibold text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )
                }
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
