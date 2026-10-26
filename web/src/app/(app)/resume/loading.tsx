import { Sk, SkPage } from "@/components/Skeleton";

/** Matches the dropzone, the version list, the editor and the rail. */
export default function ResumeLoading() {
  return (
    <SkPage className="">
      <div className="flex h-14 items-center border-b border-line" style={{ paddingInline: "var(--gutter)" }}>
        <Sk className="h-3.5 w-28" />
      </div>

      <div className="page flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Sk className="h-8 w-56 md:h-9" />
          <Sk className="h-3.5 w-full max-w-[60ch]" />
          <Sk className="h-3.5 w-2/3 max-w-[44ch]" />
        </div>

        <div className="with-rail">
          <div className="flex min-w-0 flex-col gap-7">
            <div className="dropzone flex flex-col items-center gap-4 px-5 py-8 md:flex-row">
              <Sk className="size-12 shrink-0 rounded-[var(--radius)]" />
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 md:items-start">
                <Sk className="h-4 w-36" />
                <Sk className="h-3 w-full max-w-[48ch]" />
              </div>
              <Sk className="h-[38px] w-32 shrink-0 rounded-[var(--radius-btn)]" />
            </div>

            <div className="flex flex-col gap-3">
              <Sk className="h-4 w-44" />
              <div className="panel divide-y divide-line overflow-hidden">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                    <Sk className="size-4 shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Sk className="h-3.5 w-40" />
                      <Sk className="h-3 w-56" />
                    </div>
                    <Sk className="h-8 w-28 shrink-0 rounded-[var(--radius-sm)]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <Sk className="h-4 w-44" />
                <Sk className="h-3 w-16" />
              </div>
              <div className="flex flex-col gap-2.5 p-4 md:p-7">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Sk key={i} className={i % 4 === 3 ? "h-3.5 w-1/2" : "h-3.5 w-full"} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="panel flex flex-col gap-2.5 p-4">
                <Sk className="h-2.5 w-24" />
                <Sk className="h-3 w-full" />
                <Sk className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkPage>
  );
}
