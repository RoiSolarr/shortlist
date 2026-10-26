import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/n8n";
import { JOB_SELECT, toJob } from "@/lib/mappers";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string, code?: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

/**
 * Body, one of:
 *   { url }                         analyze a job link
 *   { description, url? }           analyze pasted text
 *   { url, reanalyze: true }        same link again, overwrite the saved analysis
 *   { job_posting_id }              analyze a saved posting again with the active resume
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Sign in to analyze jobs.");

  const body = await request.json().catch(() => ({}));
  let url = typeof body.url === "string" ? body.url.trim() : "";
  let description = typeof body.description === "string" ? body.description.trim() : "";
  const reanalyze = body.reanalyze === true;
  const jobPostingId = typeof body.job_posting_id === "string" && UUID.test(body.job_posting_id) ? body.job_posting_id : null;

  // 1. Analyze a saved posting again: reuse its stored text (RLS: only the user's own postings)
  if (jobPostingId) {
    const { data: posting } = await supabase
      .from("job_postings")
      .select("id, source_url, description")
      .eq("id", jobPostingId)
      .maybeSingle();
    if (!posting) return fail(404, "That job was not found.");
    url = posting.source_url ?? "";
    description = posting.description;
  } else {
    if (!url && !description) return fail(400, "Paste a job link or the job description.");
    if (url) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        return fail(400, "That link does not look valid. It should start with https://");
      }
    }
    if (!url && description.length < 200) {
      return fail(400, "The description is too short. Paste the full job post text.");
    }
  }

  // 2. An active resume with text is required
  const { data: resume } = await supabase
    .from("resumes")
    .select("id, resume_text")
    .eq("is_active", true)
    .eq("extraction_status", "ready")
    .maybeSingle();
  if (!resume?.resume_text?.trim()) {
    return fail(400, "Add your resume first so the job can be compared with it.", "NO_RESUME");
  }

  // 3. Same link analyzed before? Ask before spending quota on it again.
  if (url && !jobPostingId && !reanalyze) {
    const { data: existing } = await supabase
      .from("job_postings")
      .select("id, applications(id)")
      .eq("source_url", url)
      .maybeSingle();
    const applicationId = (existing?.applications as { id: string }[] | undefined)?.[0]?.id;
    if (applicationId) {
      return fail(409, "You already analyzed this job.", "DUPLICATE", { job: { id: applicationId } });
    }
  }

  // 4. Daily limit protects the Gemini free tier
  const limit = Number(process.env.DAILY_ANALYSIS_LIMIT || 20);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .gte("analyzed_at", since.toISOString());
  if ((count ?? 0) >= limit) {
    return fail(429, `You reached today's limit of ${limit} analyses. Try again tomorrow.`, "LIMIT");
  }

  // 5. Hand off to n8n. user_id comes from the verified session, never from the browser.
  const result = await callN8n<{ job: Record<string, unknown> }>(process.env.N8N_ANALYZE_WEBHOOK_URL, {
    user_id: user.id,
    job_posting_id: jobPostingId,
    url: url || null,
    description: description || null,
  });

  if (!result.ok) return fail(result.status, result.error, result.code);
  const savedId = result.data?.job?.id;
  if (typeof savedId !== "string") return fail(502, "n8n finished but did not return the saved job.");

  // Read it back through RLS, joined with its posting and resume version
  const { data: saved } = await supabase.from("applications").select(JOB_SELECT).eq("id", savedId).maybeSingle();
  if (!saved) return fail(502, "The analysis was saved, but it could not be loaded. Refresh the board.");

  return NextResponse.json({ job: toJob(saved) });
}