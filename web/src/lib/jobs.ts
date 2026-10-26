"use client";

import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import { HISTORY_SELECT, JOB_SELECT, toJob } from "@/lib/mappers";
import type { ApplicationPatch, JobStatus, StatusChange } from "@/lib/types";

/** Builds the patch for a status move. Moving to Applied stamps today's date once. */
export function statusPatch(status: JobStatus, appliedAt: string | null, position?: number): ApplicationPatch {
  const patch: ApplicationPatch = { status, board_position: position ?? -Date.now() };
  if (status === "applied" && !appliedAt) patch.applied_at = todayISO();
  return patch;
}

/** Updates the tracking columns of an application and returns the refreshed card. */
export async function updateJob(id: string, patch: ApplicationPatch) {
  const { data, error } = await createClient().from("applications").update(patch).eq("id", id).select(JOB_SELECT).single();
  return { job: data ? toJob(data) : null, error };
}

/** Deletes the job posting; its application and history go with it (on delete cascade). */
export async function deleteJob(jobPostingId: string) {
  const { error } = await createClient().from("job_postings").delete().eq("id", jobPostingId);
  return { error };
}

export async function loadHistory(applicationId: string) {
  const { data } = await createClient()
    .from("application_status_history")
    .select(HISTORY_SELECT)
    .eq("application_id", applicationId)
    .order("changed_at", { ascending: true });
  return (data ?? []) as StatusChange[];
}