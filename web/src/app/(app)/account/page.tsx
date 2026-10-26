import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/AccountSettings";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <TopBar crumbs={[{ label: "Account" }]} />

      <div className="page flex flex-col gap-7">
        <div className="max-w-[560px]">
          <h1 className="t-page">Your account</h1>
          <p className="mt-3 text-ui text-muted">
            The email you sign in with, a new password when you need one, and signing out of this device.
          </p>
        </div>
        <AccountSettings email={user!.email ?? ""} />
      </div>
    </>
  );
}
