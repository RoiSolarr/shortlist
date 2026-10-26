import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AuthLayout } from "@/components/AuthLayout";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { IconAlert, IconArrowLeft } from "@/components/icons";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reached from a reset email through /auth/callback, which has already
 * swapped the link for a session. Without one, the link was used, expired,
 * or opened in another browser.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AuthLayout>{user ? <ResetPasswordForm email={user.email ?? ""} /> : <LinkExpired />}</AuthLayout>;
}

function LinkExpired() {
  return (
    <div className="enter-up">
      <span
        className="grid size-11 place-items-center rounded-[var(--radius)] text-bad"
        style={{ background: "color-mix(in oklab, var(--bad) 10%, transparent)" }}
        aria-hidden
      >
        <IconAlert className="size-5" />
      </span>
      <h1 className="t-page mt-5 text-balance">This link no longer works</h1>
      <p className="mt-3 text-ui text-muted">
        Reset links work once, for an hour, in the browser that asked for them. Send yourself a new one.
      </p>
      <Link href="/forgot-password" className="btn btn-primary btn-lg mt-7 w-full">
        Send a new link
      </Link>
      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-ui font-semibold text-muted transition-colors hover:text-ink"
      >
        <IconArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
