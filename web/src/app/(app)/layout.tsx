import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: resume }, { data: stages }] = await Promise.all([
    supabase.from("resumes").select("label, resume_text, extraction_status").eq("is_active", true).maybeSingle(),
    // Counts for the sidebar pipeline. Read only, one column.
    supabase.from("applications").select("status"),
  ]);

  const counts: Partial<Record<JobStatus, number>> = {};
  for (const row of stages ?? []) {
    const status = (row as { status: JobStatus }).status;
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return (
    <AppShell
      email={user.email ?? ""}
      hasResume={Boolean(resume?.resume_text?.trim())}
      counts={counts}
      resume={
        resume
          ? {
              label: resume.label as string,
              status: (resume.extraction_status as "processing" | "ready" | "failed") ?? "ready",
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
