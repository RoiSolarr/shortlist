"use client";

import { createClient } from "@/lib/supabase/client";
import { useShell } from "./AppShell";
import { NewPasswordForm } from "./NewPasswordForm";
import { useToast } from "./Toast";
import { IconLogout } from "./icons";

/** Sign in details first, a new password under them, and signing out last. */
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
    <div className="flex max-w-[560px] flex-col gap-7">
      <section aria-labelledby="signin-title" className="panel p-5 md:p-6">
        <h2 id="signin-title" className="t-section">
          Sign in details
        </h2>
        <p className="mt-0.5 text-meta text-muted">What you use to get into Shortlist.</p>

        <div className="mt-5">
          <label htmlFor="account-email" className="label">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            readOnly
            className="field cursor-default bg-sunken text-ink-soft"
          />
          <p className="mt-1.5 text-meta text-faint">Password reset links are sent here.</p>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-ui font-semibold">Change password</h3>
          <p className="mt-0.5 text-meta text-muted">You stay signed in on this device after you change it.</p>
          <div className="mt-4">
            <NewPasswordForm
              email={email}
              save={savePassword}
              onSaved={() => toast("Password updated. Use it the next time you sign in.")}
              compact
            />
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div>
          <p className="text-ui font-semibold">Sign out</p>
          <p className="mt-0.5 text-meta text-muted">Your board and resume stay saved for next time.</p>
        </div>
        <button className="btn btn-quiet" onClick={signOut}>
          <IconLogout className="size-4" />
          Sign out
        </button>
      </footer>
    </div>
  );
}
