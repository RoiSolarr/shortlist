"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BlockingOverlay } from "./BlockingOverlay";
import { NewPasswordForm } from "./NewPasswordForm";

/** The screen a reset link opens: the link has already signed this person in. */
export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function save(password: string) {
    const { error } = await createClient().auth.updateUser({ password });
    return error?.message ?? null;
  }

  return (
    <>
      <div inert={leaving || undefined}>
        <h1 className="t-page text-balance">Choose a new password</h1>
        <p className="mt-3 text-ui text-muted">
          For <span className="font-semibold break-all text-ink">{email}</span>. You stay signed in once it is saved.
        </p>
        <div className="mt-7">
          <NewPasswordForm
            email={email}
            save={save}
            onSaved={() => {
              // The overlay covers the trip into the app, as it does after sign in
              setLeaving(true);
              router.replace("/");
              router.refresh();
            }}
          />
        </div>
      </div>

      <BlockingOverlay open={leaving} title="Password updated" detail="Loading your board and resume." />
    </>
  );
}
