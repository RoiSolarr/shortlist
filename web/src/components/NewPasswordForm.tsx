"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { IconAlert, Spinner } from "./icons";
import { PasswordField, PasswordMatch, PasswordStrength, meetsPasswordRules } from "./PasswordFields";

/** Supabase's wording, turned into what to do next. */
function friendly(message: string) {
  if (/different from the old password/i.test(message)) return "That is your current password. Choose a different one.";
  if (/reauthenticat/i.test(message)) return "For your security, sign out and sign in again, then change your password.";
  return message;
}

/**
 * A new password typed twice and held to the same four rules as sign up.
 * The caller saves it: `save` resolves to Supabase's error message, or null
 * when it worked.
 */
export function NewPasswordForm({
  email,
  save,
  onSaved,
  compact = false,
}: {
  /** Fills a hidden username field, so password managers update the right entry. */
  email: string;
  save: (password: string) => Promise<string | null>;
  onSaved?: () => void;
  /** Inside a panel: a regular button rather than a full width one. */
  compact?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // When the save fails, the message takes the focus the form lost.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    // The inline hints already say what is wrong; focus goes there instead of repeating it below.
    setTriedSubmit(true);
    if (!meetsPasswordRules(password)) return passwordRef.current?.focus();
    if (password !== confirm) return confirmRef.current?.focus();

    setBusy(true);
    const failure = await save(password);
    setBusy(false);
    if (failure) return setError(friendly(failure));
    setPassword("");
    setConfirm("");
    setTriedSubmit(false);
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <fieldset disabled={busy} className="flex min-w-0 flex-col">
        <PasswordField
          ref={passwordRef}
          id="new-password"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        >
          <PasswordStrength password={password} flagUnmet={triedSubmit} />
        </PasswordField>
        <div className="mt-4">
          <PasswordField
            ref={confirmRef}
            id="confirm-new-password"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
          >
            <PasswordMatch password={password} confirm={confirm} />
          </PasswordField>
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

      <button
        type="submit"
        className={cx("btn btn-primary", compact ? "mt-5 self-start" : "btn-lg mt-6")}
        disabled={busy}
        aria-busy={busy}
      >
        {busy && <Spinner className="size-4" />}
        {busy ? "Updating password" : "Update password"}
      </button>
    </form>
  );
}
