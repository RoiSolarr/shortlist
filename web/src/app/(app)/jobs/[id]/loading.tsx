import { Sk, SkPage } from "@/components/Skeleton";

/** Matches the report: identity, stage track, fit panel, letter. */
export default function JobLoading() {
  return (
    <SkPage className="">
      <div className="flex h-14 items-center justify-between border-b border-line" style={{ paddingInline: "var(--gutter)" }}>
        <Sk className="h-3.5 w-48" />
        <div className="flex gap-2">
          <Sk className="h-8 w-20 rounded-[var(--radius-sm)]" />
          <Sk className="h-8 w-24 rounded-[var(--radius-sm)]" />
        </div>
      </div>

      <div className="page flex flex-col gap-7">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <Sk className="size-13 shrink-0 rounded-[var(--radius-btn)]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <Sk className="h-3.5 w-32" />
              <Sk className="h-6 w-4/5" />
              <Sk className="h-3 w-64" />
            </div>
          </div>
          <Sk className="h-10 w-full rounded-[var(--radius-btn)]" />
        </div>

        <div className="panel grid gap-7 p-5 lg:grid-cols-[auto_1fr] lg:p-7">
          <div className="flex flex-col items-center gap-3 lg:w-[200px]">
            <Sk className="size-[168px] rounded-full" />
            <Sk className="h-6 w-32 rounded-[var(--radius-sm)]" />
            <Sk className="h-3 w-40" />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Sk className="h-4 w-full" />
              <Sk className="h-4 w-full" />
              <Sk className="h-4 w-2/3" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Sk className="h-3.5 w-48" />
              <Sk className="h-2 w-full rounded-full" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {[0, 1].map((group) => (
                <div key={group} className="flex flex-col gap-2.5">
                  <Sk className="h-3.5 w-28" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Sk key={i} className="h-[26px] w-20 rounded-[var(--radius-sm)]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Sk className="h-4 w-56" />
          <div className="grid gap-2.5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Sk key={i} className="h-20 w-full rounded-[var(--radius)]" />
            ))}
          </div>
        </div>

        <div className="panel min-h-60 p-5 md:p-9">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Sk key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
            ))}
          </div>
        </div>
      </div>
    </SkPage>
  );
}
