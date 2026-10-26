import type { Job, JobCard } from "./types";

/** Full card: application + its posting + the resume version it was scored against */
export const JOB_SELECT = "*, job_posting:job_postings(*), resume:resumes(id, label)";

/** Just what the board and lists need */
export const CARD_SELECT =
  "id, status, fit_score, verdict, board_position, applied_at, created_at, job_posting:job_postings(company, title, location)";

export const HISTORY_SELECT = "id, from_status, to_status, source, changed_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toJob(row: any): Job {
  const p = row.job_posting ?? {};
  return {
    id: row.id,
    job_posting_id: row.job_posting_id,
    resume_id: row.resume_id ?? null,
    resume_label: row.resume?.label ?? null,
    url: p.source_url ?? null,
    company: p.company ?? "Unknown company",
    title: p.title ?? "Untitled role",
    location: p.location ?? null,
    description: p.description ?? "",
    input_method: p.input_method ?? "link",
    fit_score: row.fit_score,
    verdict: row.verdict,
    summary: row.summary ?? "",
    matched_skills: row.matched_skills ?? [],
    missing_skills: row.missing_skills ?? [],
    talking_points: row.talking_points ?? [],
    cover_letter: row.cover_letter ?? "",
    ai_model: row.ai_model ?? null,
    analyzed_at: row.analyzed_at,
    status: row.status,
    notes: row.notes ?? null,
    applied_at: row.applied_at ?? null,
    position: row.board_position ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toCard(row: any): JobCard {
  const p = row.job_posting ?? {};
  return {
    id: row.id,
    company: p.company ?? "Unknown company",
    title: p.title ?? "Untitled role",
    location: p.location ?? null,
    fit_score: row.fit_score,
    verdict: row.verdict,
    status: row.status,
    position: row.board_position ?? 0,
    created_at: row.created_at,
    applied_at: row.applied_at ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */