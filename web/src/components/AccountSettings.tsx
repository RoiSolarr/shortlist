"use client";

import { createClient } from "@/lib/supabase/client";
import { useShell } from "./AppShell";
import { NewPasswordForm } from "./NewPasswordForm";
import { useToast } from "./Toast";
import { IconLogout } from "./icons";

/**
 * One card, one row per setting: what it is on the left, the control on the
 * right. Every control starts on the same line, so the two buttons align.
 * Below 1024px the rows stack.
 */
const ROW = "grid gap-4 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10";

/** Email first, a new password under it, and signing out last. */
export function AccountSettings({ email }: { email: string }) {
  const { block, signOut } = useShell();
  const { toast } = useToast();

  async function savePassword(password: string) {
    const release = block({ title: "Updating password", detail: "Saving your new password." });
    try {
      const { error } = await createClient().auth.updateUser({ password });
      return error?.message ?? null;
    } finally {
      release();
    }
  }

  return (
    <section aria-label="Account settings" className="panel divide-y divide-line">
      <div className={ROW}>
        <div>
          <h2 id="email-title" className="t-section">
            Email
          </h2>
          <p className="mt-0.5 text-meta text-muted">You sign in with this address. Password reset links are sent here.</p>
        </div>
        <input
          type="email"
          value={email}
          readOnly
          aria-labelledby="email-title"
          className="field cursor-default bg-sunken text-ink-soft"
        />
      </div>

      <div className={ROW}>
        <div>
          <h2 className="t-section">Password</h2>
          <p className="mt-0.5 text-meta text-muted">You stay signed in on this device after you change it.</p>
        </div>
        <NewPasswordForm
          email={email}
          save={savePassword}
          onSaved={() => toast("Password updated. Use it the next time you sign in.")}
          compact
        />
      </div>

      <div className={ROW}>
        <div>
          <h2 className="t-section">Sign out</h2>
          <p className="mt-0.5 text-meta text-muted">Your board and resume stay saved for next time.</p>
        </div>
        <div>
          <button className="btn btn-quiet" onClick={signOut}>
            <IconLogout className="size-4" />
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
