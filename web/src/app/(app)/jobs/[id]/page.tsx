import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobDetail } from "@/components/JobDetail";
import { HISTORY_SELECT, JOB_SELECT, toJob } from "@/lib/mappers";
import { STATUS_LABEL } from "@/lib/status";
import type { StatusChange } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getJob(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select(JOB_SELECT).eq("id", id).maybeSingle();
  return data ? toJob(data) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getJob((await params).id);
  return { title: job ? `${job.title} at ${job.company}` : "Job" };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const supabase = await createClient();
  const [{ data: history }, { data: scores }] = await Promise.all([
    supabase
      .from("application_status_history")
      .select(HISTORY_SELECT)
      .eq("application_id", id)
      .order("changed_at", { ascending: true }),
    // Read only, one column: what this person usually scores.
    supabase.from("applications").select("fit_score"),
  ]);

  const all = (scores ?? []) as { fit_score: number }[];
  const average = all.length ? Math.round(all.reduce((a, r) => a + r.fit_score, 0) / all.length) : null;

  return (
    <JobDetail
      job={job}
      history={(history ?? []) as StatusChange[]}
      average={average}
      crumbStage={STATUS_LABEL[job.status]}
    />
  );
}
