/** Mirrors the enum app.application_status */
export type JobStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

/** app.job_postings */
export interface JobPosting {
  id: string;
  user_id: string;
  source_url: string | null;
  company: string;
  title: string;
  location: string | null;
  description: string;
  input_method: "link" | "pasted";
  created_at: string;
  updated_at: string;
}

/** app.applications */
export interface ApplicationRow {
  id: string;
  user_id: string;
  job_posting_id: string;
  resume_id: string | null;
  status: JobStatus;
  fit_score: number;
  verdict: string;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  talking_points: string[];
  cover_letter: string;
  ai_model: string | null;
  analyzed_at: string;
  notes: string | null;
  applied_at: string | null;
  board_position: number;
  created_at: string;
  updated_at: string;
}

/** Columns a signed in user may change on app.applications (see migration 0003) */
export type ApplicationPatch = Partial<
  Pick<ApplicationRow, "status" | "notes" | "cover_letter" | "applied_at" | "board_position">
>;

/**
 * What the pages work with: one application joined with its job posting.
 * Built by toJob() in lib/mappers.ts.
 */
export interface Job {
  id: string;
  job_posting_id: string;
  resume_id: string | null;
  resume_label: string | null;
  url: string | null;
  company: string;
  title: string;
  location: string | null;
  description: string;
  input_method: "link" | "pasted";
  fit_score: number;
  verdict: string;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  talking_points: string[];
  cover_letter: string;
  ai_model: string | null;
  analyzed_at: string;
  status: JobStatus;
  notes: string | null;
  applied_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type JobCard = Pick<
  Job,
  "id" | "company" | "title" | "location" | "fit_score" | "verdict" | "status" | "position" | "created_at" | "applied_at"
>;

/** app.application_status_history */
export interface StatusChange {
  id: number;
  from_status: JobStatus | null;
  to_status: JobStatus;
  source: "user" | "automation";
  changed_at: string;
}

/** app.resumes */
export interface Resume {
  id: string;
  user_id: string;
  label: string;
  file_path: string | null;
  file_name: string | null;
  resume_text: string | null;
  extraction_status: "processing" | "ready" | "failed";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}