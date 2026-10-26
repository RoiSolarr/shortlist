"use client";

import { useState } from "react";
import { cx } from "@/lib/format";
import { IconCheck, IconEye, IconEyeOff, IconMinus } from "./icons";

/**
 * The password pieces shared by sign up, reset and the account page, so
 * every screen that sets a password holds it to the same four rules.
 */

export function PasswordField({
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

export const PASSWORD_RULES = [
  { label: "Use at least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Add an uppercase letter", test: (p: string) => /\p{Lu}/u.test(p) },
  { label: "Add a lowercase letter", test: (p: string) => /\p{Ll}/u.test(p) },
  { label: "Add a number or symbol", test: (p: string) => /[^\p{L}\s]/u.test(p) },
];

export const meetsPasswordRules = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

/** The same four rules, in the two words each one is really about. */
const SHORT_RULE: Record<string, string> = {
  "Use at least 8 characters": "8 characters",
  "Add an uppercase letter": "Uppercase",
  "Add a lowercase letter": "Lowercase",
  "Add a number or symbol": "Number or symbol",
};

/** Four checks that answer as you type, plus the bar they add up to. */
export function PasswordStrength({ password, flagUnmet }: { password: string; flagUnmet: boolean }) {
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

export function PasswordMatch({ password, confirm }: { password: string; confirm: string }) {
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
