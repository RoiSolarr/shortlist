import { Sk, SkPage } from "@/components/Skeleton";

/** Matches the Analyze hero, the input panel and the context rail. */
export default function AnalyzeLoading() {
  return (
    <SkPage className="">
      <div className="flex h-14 items-center border-b border-line" style={{ paddingInline: "var(--gutter)" }}>
        <Sk className="h-3.5 w-20" />
      </div>

      <div className="page">
        <div className="with-rail">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-3">
              <Sk className="h-8 w-4/5 md:h-9" />
              <Sk className="h-8 w-3/5 md:h-9" />
              <div className="mt-2 flex flex-col gap-2">
                <Sk className="h-3.5 w-full" />
                <Sk className="h-3.5 w-11/12" />
              </div>
            </div>

            <div className="panel-raised overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-5">
                <Sk className="h-9 w-64 rounded-[var(--radius-btn)]" />
                <Sk className="h-3 w-44" />
              </div>
              <div className="p-4 md:p-5">
                <Sk className="h-11 w-full rounded-[var(--radius-btn)]" />
                <Sk className="mt-3 h-14 w-full rounded-[var(--radius)]" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line bg-sunken px-4 py-3 md:px-5">
                <Sk className="h-3.5 w-56" />
                <Sk className="h-[38px] w-32 rounded-[var(--radius-btn)]" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Sk className="h-4 w-32" />
              <div className="panel divide-y divide-line overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3.5 px-3.5 py-3">
                    <Sk className="h-[30px] w-10 shrink-0 rounded-[var(--radius-sm)]" />
                    <Sk className="size-7 shrink-0 rounded-[var(--radius-btn)]" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Sk className="h-3.5 w-1/2" />
                      <Sk className="h-3 w-1/4" />
                    </div>
                    <Sk className="h-[22px] w-20 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="panel p-4">
              <Sk className="h-2.5 w-20" />
              <div className="mt-3 grid grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Sk className="h-3 w-16" />
                    <Sk className="h-7 w-10" />
                  </div>
                ))}
              </div>
              <Sk className="mt-4 h-16 w-full" />
            </div>
            <div className="panel flex flex-col gap-2.5 p-4">
              <Sk className="h-2.5 w-28" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Sk key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkPage>
  );
}
