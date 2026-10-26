import { Sk, SkPage } from "@/components/Skeleton";

const COLUMNS = [3, 2, 2, 1, 1];

/** Five column shells at the real widths, with the stats strip above. */
export default function BoardLoading() {
  return (
    <SkPage className="">
      <div className="flex h-14 items-center justify-between border-b border-line" style={{ paddingInline: "var(--gutter)" }}>
        <Sk className="h-3.5 w-32" />
      </div>

      <div className="page-wide flex flex-col gap-5">
        <div className="gutter">
          <div className="panel grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-4">
                <Sk className="h-3 w-24" />
                <Sk className="h-7 w-12" />
                <Sk className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="gutter flex items-center justify-between gap-3">
          <Sk className="h-3 w-48" />
          <div className="flex gap-2">
            <Sk className="h-9 w-56 rounded-[var(--radius-btn)]" />
            <Sk className="h-9 w-28 rounded-[var(--radius-btn)]" />
          </div>
        </div>

        <div className="scroll-x flex gap-3 overflow-hidden px-[var(--gutter)] pb-4 xl:grid xl:grid-cols-5">
          {COLUMNS.map((cards, column) => (
            <div
              key={column}
              className="column flex w-[82vw] max-w-[300px] shrink-0 flex-col overflow-hidden sm:w-[280px] xl:w-auto xl:max-w-none"
            >
              <span className="column-rule" style={{ background: "var(--line-strong)" }} />
              <div className="px-3 pt-2.5 pb-3">
                <div className="flex items-center gap-2">
                  <Sk className="size-2 rounded-full" />
                  <Sk className="h-3.5 w-20" />
                  <Sk className="ml-auto h-3 w-4" />
                </div>
                <Sk className="mt-1.5 ml-[15px] h-3 w-28" />
              </div>
              <div className="flex flex-col gap-2 px-2 pb-2">
                {Array.from({ length: cards }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-line bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <Sk className="h-6 w-9 rounded-[var(--radius-sm)]" />
                      <Sk className="h-3 w-6" />
                    </div>
                    <Sk className="h-3.5 w-11/12" />
                    <Sk className="h-3 w-2/3" />
                    <Sk className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkPage>
  );
}
