import { Sk, SkPage } from "@/components/Skeleton";

/** Matches the heading and the settings card: email, password and sign out rows. */
export default function AccountLoading() {
  const row = "grid gap-4 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10";
  const about = (
    <div className="flex flex-col gap-2">
      <Sk className="h-4 w-24" />
      <Sk className="h-3 w-full max-w-60" />
    </div>
  );

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

        <div className="panel divide-y divide-line">
          <div className={row}>
            {about}
            <Sk className="h-[38px] w-full rounded-[var(--radius-btn)]" />
          </div>
          <div className={row}>
            {about}
            <div className="flex flex-col gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Sk className="h-3 w-32" />
                  <Sk className="h-[38px] w-full rounded-[var(--radius-btn)]" />
                </div>
              ))}
              <Sk className="h-[38px] w-40 rounded-[var(--radius-btn)]" />
            </div>
          </div>
          <div className={row}>
            {about}
            <Sk className="h-[38px] w-28 rounded-[var(--radius-btn)]" />
          </div>
        </div>
      </div>
    </SkPage>
  );
}
