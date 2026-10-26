import { Sk, SkPage } from "@/components/Skeleton";

/** Matches the heading, the sign in details panel and the sign out row. */
export default function AccountLoading() {
  return (
    <SkPage className="">
      <div className="flex h-14 items-center border-b border-line" style={{ paddingInline: "var(--gutter)" }}>
        <Sk className="h-3.5 w-20" />
      </div>

      <div className="page flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Sk className="h-8 w-56 md:h-9" />
          <Sk className="h-3.5 w-full max-w-[52ch]" />
        </div>

        <div className="flex max-w-[560px] flex-col gap-7">
          <div className="panel flex flex-col gap-5 p-5 md:p-6">
            <div className="flex flex-col gap-2">
              <Sk className="h-4 w-36" />
              <Sk className="h-3 w-52" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Sk className="h-3 w-28" />
                <Sk className="h-10 w-full rounded-[var(--radius-btn)]" />
              </div>
            ))}
            <Sk className="h-[38px] w-40 rounded-[var(--radius-btn)]" />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
            <div className="flex flex-col gap-2">
              <Sk className="h-3.5 w-16" />
              <Sk className="h-3 w-60" />
            </div>
            <Sk className="h-[38px] w-28 rounded-[var(--radius-btn)]" />
          </div>
        </div>
      </div>
    </SkPage>
  );
}
