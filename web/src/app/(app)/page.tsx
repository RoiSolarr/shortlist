import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnalyzePanel } from "@/components/AnalyzePanel";
import { ScoreBadge } from "@/components/ScoreDial";
import { CompanyMark } from "@/components/JobReport";
import { TopBar } from "@/components/TopBar";
import { IconChevronRight, IconSpark } from "@/components/icons";
import { STATUS_LABEL } from "@/lib/status";
import { relativeTime } from "@/lib/format";
import { CARD_SELECT, toCard } from "@/lib/mappers";
import type { JobCard } from "@/lib/types";

const DAY = 86_400_000;
const BANDS = [
  { label: "0–39", min: 0, max: 39 },
  { label: "40–59", min: 40, max: 59 },
  { label: "60–79", min: 60, max: 79 },
  { label: "80–89", min: 80, max: 89 },
  { label: "90+", min: 90, max: 100 },
];

export default async function AnalyzePage() {
  const supabase = await createClient();
  const [{ data: resume }, { data: recent }, { data: runs }] = await Promise.all([
    supabase.from("resumes").select("resume_text, label").eq("is_active", true).maybeSingle(),
    supabase.from("applications").select(CARD_SELECT).order("analyzed_at", { ascending: false }).limit(6),
    // Read only, three columns: the numbers in the context rail.
    supabase.from("applications").select("fit_score, analyzed_at, ai_model"),
  ]);

  const jobs: JobCard[] = (recent ?? []).map(toCard);
  const all = (runs ?? []) as { fit_score: number; analyzed_at: string; ai_model: string | null }[];

  const now = Date.now();
  const week = all.filter((r) => now - new Date(r.analyzed_at).getTime() <= 7 * DAY);
  const weekBefore = all.filter((r) => {
    const age = now - new Date(r.analyzed_at).getTime();
    return age > 7 * DAY && age <= 14 * DAY;
  });
  const mean = (rows: { fit_score: number }[]) =>
    rows.length ? Math.round(rows.reduce((a, r) => a + r.fit_score, 0) / rows.length) : null;

  const average = mean(all);
  const weekAverage = mean(week) ?? average;
  const distribution = BANDS.map((b) => ({
    ...b,
    n: all.filter((r) => r.fit_score >= b.min && r.fit_score <= b.max).length,
  }));
  const peak = Math.max(1, ...distribution.map((b) => b.n));
  const model = all.find((r) => r.ai_model)?.ai_model ?? null;

  return (
    <>
      <TopBar
        crumbs={[{ label: "Analyze" }]}
        actions={
          model ? (
            <span className="hidden items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 py-1.5 text-meta text-muted sm:inline-flex">
              <IconSpark className="size-3.5 text-faint" />
              {model} · free tier
            </span>
          ) : null
        }
      />

      <div className="page">
        <AnalyzePanel
          hasResume={Boolean(resume?.resume_text?.trim())}
          resumeLabel={resume?.label ?? null}
          average={average}
          hero={
            <div className="max-w-[560px]">
              <h1 className="t-page text-balance">Score a job before you spend an hour on it.</h1>
              <p className="mt-3.5 text-ui text-muted">
                Shortlist reads the post, compares it with your active resume, scores the fit out of 100, and drafts a
                letter using only facts you can back up. Every run lands on your board.
              </p>
            </div>
          }
          rail={
            <>
              {all.length > 0 && (
                <section className="panel overflow-hidden" aria-label="Last 7 days">
                  <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
                    <p className="eyebrow">Last 7 days</p>
                    {week.length !== weekBefore.length && (
                      <p className="tabular text-meta font-semibold text-good">
                        {week.length >= weekBefore.length ? "+" : ""}
                        {week.length - weekBefore.length} vs last week
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-line">
                    <div className="stat">
                      <p className="stat-label">Analyzed</p>
                      <p className="stat-value">{week.length}</p>
                      <p className="stat-foot">{week.filter((r) => r.fit_score >= 80).length} above 80</p>
                    </div>
                    <div className="stat">
                      <p className="stat-label">Average fit</p>
                      <p className="stat-value">{weekAverage ?? "—"}</p>
                      <p className="stat-foot">
                        {weekAverage === null ? "No runs yet" : weekAverage >= 60 ? "Worth applying" : "Close the gaps"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-line px-4 py-3.5">
                    <p className="eyebrow mb-3">Fit distribution</p>
                    <div className="flex h-16 items-end gap-1.5">
                      {distribution.map((b) => (
                        <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                          <span
                            className="w-full rounded-[3px]"
                            title={`${b.n} job${b.n === 1 ? "" : "s"}`}
                            style={{
                              height: `${Math.max(4, Math.round((b.n / peak) * 52))}px`,
                              background: b.n === peak ? "var(--ink)" : "color-mix(in oklab, var(--ink) 28%, transparent)",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {distribution.map((b) => (
                        <span key={b.label} className="tabular flex-1 text-center text-[10px] text-faint">
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="panel px-4 py-3.5" aria-label="How to read a score">
                <p className="eyebrow mb-3">How to read a score</p>
                <ul className="flex flex-col gap-2.5 text-meta">
                  {[
                    { dot: "var(--good)", band: "80+", text: "Apply today" },
                    { dot: "var(--warn)", band: "60–79", text: "Worth a tailored letter" },
                    { dot: "var(--bad)", band: "< 60", text: "Stretch, close the gaps first" },
                  ].map((row) => (
                    <li key={row.band} className="flex items-center gap-2.5">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: row.dot }} />
                      <span className="tabular w-12 shrink-0 font-semibold">{row.band}</span>
                      <span className="text-muted">{row.text}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel-ink px-4 py-3.5">
                <p className="flex items-center gap-2 text-ui font-semibold">
                  <IconSpark className="size-4" />
                  Automation is live
                </p>
                <p className="mt-1.5 text-meta opacity-75">
                  n8n fetches the post, Gemini scores it, Supabase stores it.
                </p>
              </section>
            </>
          }
          below={
            jobs.length > 0 ? (
              <section aria-labelledby="recent-title">
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <h2 id="recent-title" className="t-section">
                    Recent runs <span className="ml-1 font-normal text-faint">{all.length} total</span>
                  </h2>
                  <Link href="/board" className="text-meta font-semibold text-muted transition-colors hover:text-ink">
                    View board
                  </Link>
                </div>
                <ul className="panel divide-y divide-line overflow-hidden">
                  {jobs.map((j) => (
                    <li key={j.id} className="cv-auto">
                      <Link href={`/jobs/${j.id}`} className="row group flex items-center gap-3.5">
                        <ScoreBadge score={j.fit_score} />
                        <CompanyMark name={j.company} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ui font-semibold">{j.title}</span>
                          <span className="block truncate text-meta text-muted">{j.company}</span>
                        </span>
                        <span data-status={j.status} className="st-pill hidden sm:inline-flex">
                          <span className="st-dot" />
                          {STATUS_LABEL[j.status]}
                        </span>
                        <span className="tabular hidden w-20 text-right text-meta text-faint md:block">
                          {relativeTime(j.created_at)}
                        </span>
                        <IconChevronRight className="row-chevron size-4 text-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          }
        />
      </div>
    </>
  );
}
