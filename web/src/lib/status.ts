import type { JobStatus } from "./types";

export const STATUSES: {
  id: JobStatus;
  label: string;
  hint: string;
}[] = [
  { id: "saved", label: "Saved", hint: "Analyzed, not sent yet" },
  { id: "applied", label: "Applied", hint: "Application sent" },
  { id: "interview", label: "Interview", hint: "Talking with the team" },
  { id: "offer", label: "Offer", hint: "Offer received" },
  { id: "rejected", label: "Rejected", hint: "Closed for now" },
];

export const STATUS_LABEL: Record<JobStatus, string> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s.label]),
) as Record<JobStatus, string>;

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && STATUSES.some((s) => s.id === value);
}
