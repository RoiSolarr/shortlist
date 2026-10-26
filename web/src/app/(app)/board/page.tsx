import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Board } from "@/components/Board";
import { TopBar } from "@/components/TopBar";
import { IconSpark } from "@/components/icons";
import { CARD_SELECT, toCard } from "@/lib/mappers";
import { STATUSES } from "@/lib/status";
import type { JobCard } from "@/lib/types";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select(CARD_SELECT).order("board_position", { ascending: true });

  const jobs: JobCard[] = (data ?? []).map(toCard);

  return (
    <>
      <TopBar crumbs={[{ label: "Board" }, { label: `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}` }]} />

      <div className="page-wide">{jobs.length === 0 ? <EmptyBoard /> : <Board initial={jobs} />}</div>
    </>
  );
}

/** The pipeline itself, drawn once, as the empty state. */
function EmptyBoard() {
  return (
    <div className="gutter">
      <div className="panel flex flex-col items-center gap-7 px-6 py-14 text-center md:py-20">
        <ol className="flex items-center gap-1 sm:gap-3" aria-hidden>
          {STATUSES.map((s, i) => (
            <li key={s.id} data-status={s.id} className="flex items-center gap-1 sm:gap-3">
              <span
                className="enter-pop flex items-center gap-1.5 rounded-full px-2.5 py-1 text-meta font-semibold sm:px-3"
                style={{
                  animationDelay: `${i * 60}ms`,
                  color: i === 0 ? "var(--st)" : "var(--faint)",
                  background: i === 0 ? "color-mix(in oklab, var(--st) 12%, transparent)" : "transparent",
                  boxShadow: i === 0 ? "none" : "inset 0 0 0 1px var(--line)",
                }}
              >
                <span className="st-dot" style={i === 0 ? undefined : { background: "var(--line-strong)" }} />
                {s.label}
              </span>
              {i < STATUSES.length - 1 && <span className="h-px w-2 bg-line sm:w-4" />}
            </li>
          ))}
        </ol>

        <div className="max-w-sm">
          <h2 className="t-job">Your board is empty</h2>
          <p className="mt-2.5 text-ui text-muted">
            Analyze your first job post. It shows up here in Saved, and you move it along as you apply and interview.
          </p>
        </div>

        <Link href="/" className="btn btn-primary btn-lg">
          <IconSpark className="size-4" />
          Analyze a job
        </Link>
      </div>
    </div>
  );
}
