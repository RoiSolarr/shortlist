import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ResumeManager, type ResumeUsage } from "@/components/ResumeManager";
import { TopBar } from "@/components/TopBar";
import type { Resume } from "@/lib/types";

export const metadata: Metadata = { title: "Resume" };

export default async function ResumePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, { data: scored }] = await Promise.all([
    supabase.from("resumes").select("*").order("is_active", { ascending: false }).order("created_at", { ascending: false }),
    // Read only: what each version produced, and which skills it matched.
    supabase.from("applications").select("resume_id, fit_score, matched_skills"),
  ]);

  const rows = (scored ?? []) as { resume_id: string | null; fit_score: number; matched_skills: string[] | null }[];

  const usage: ResumeUsage = {};
  for (const row of rows) {
    if (!row.resume_id) continue;
    const entry = (usage[row.resume_id] ??= { jobs: 0, average: 0 });
    entry.jobs += 1;
    entry.average = (entry.average ?? 0) + row.fit_score;
  }
  for (const entry of Object.values(usage)) {
    entry.average = entry.jobs ? Math.round((entry.average ?? 0) / entry.jobs) : null;
  }

  const tally = new Map<string, number>();
  for (const row of rows) for (const skill of row.matched_skills ?? []) tally.set(skill, (tally.get(skill) ?? 0) + 1);
  const skills = [...tally.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));

  const versions = (data ?? []) as Resume[];

  return (
    <>
      <TopBar
        crumbs={[{ label: "Resume" }, { label: `${versions.length} ${versions.length === 1 ? "version" : "versions"}` }]}
      />

      <div className="page flex flex-col gap-7">
        <div className="max-w-[560px]">
          <h1 className="t-page">Your resume</h1>
          <p className="mt-3 text-ui text-muted">
            One upload powers every score and every letter. Keep a version per kind of role, and the active one is what
            new jobs are measured against.
          </p>
        </div>
        <ResumeManager userId={user!.id} initial={versions} usage={usage} skills={skills} />
      </div>
    </>
  );
}
