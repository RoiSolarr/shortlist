import { cx } from "@/lib/format";
import { STATUSES } from "@/lib/status";
import { ScoreDial } from "./ScoreDial";
import { IconCheck, IconMinus, IconShield, Logo } from "./icons";

/**
 * The signed out screens: the form on the left, a real report on the right.
 * Sign in, forgot password and reset password share it, so moving between
 * them only changes the form.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col bg-surface px-[var(--gutter)] py-8 md:px-14">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="t-section">Shortlist</span>
        </div>
        <div className="my-auto w-full max-w-[380px] py-12">{children}</div>
        <p className="text-meta text-faint">Your resume and applications are private to your account.</p>
      </div>
      <Showcase />
    </div>
  );
}

const SAMPLE = [
  { met: true, text: "React Native and Next.js in one role" },
  { met: true, text: "Supabase and Postgres, both shipped" },
  { met: false, text: "GraphQL, listed as nice to have" },
];

const SAMPLE_COUNTS: Record<string, number> = { saved: 4, applied: 7, interview: 2, offer: 1 };

/** The first screen shows a real report rather than describing one. */
function Showcase() {
  return (
    <aside aria-hidden className="night relative hidden overflow-hidden border-l border-line lg:flex lg:flex-col lg:justify-center lg:px-14 2xl:px-20">
      <div className="mx-auto w-full max-w-[520px]">
        <p className="eyebrow">What you get back</p>
        <h2 className="t-page mt-3 text-balance">An honest score, and the reason for it.</h2>

        <div className="panel enter-pop mt-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <ScoreDial score={82} verdict="Good fit" size={132} />
          <div className="min-w-0 flex-1">
            <p className="text-meta text-muted">Northwind Labs</p>
            <p className="t-section">Senior Full Stack Engineer</p>
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {SAMPLE.map((row, i) => (
                <li
                  key={row.text}
                  className={cx("enter-up flex items-center gap-2 text-meta", row.met ? "text-ink-soft" : "text-faint")}
                  style={{ animationDelay: `calc(420ms + ${i} * var(--stagger))` }}
                >
                  {row.met ? (
                    <IconCheck className="size-3.5 shrink-0 text-good" />
                  ) : (
                    <IconMinus className="size-3.5 shrink-0 text-warn" />
                  )}
                  {row.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {STATUSES.filter((s) => s.id !== "rejected").map((s, i) => (
            <div
              key={s.id}
              data-status={s.id}
              className="panel enter-up px-3 py-2.5"
              style={{ animationDelay: `calc(240ms + ${i} * var(--stagger))` }}
            >
              <span className="flex items-center gap-1.5 text-meta text-muted">
                <span className="st-dot" />
                {s.label}
              </span>
              <span className="t-stat mt-1 block">{SAMPLE_COUNTS[s.id]}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-meta text-muted">
          <IconShield className="size-4 shrink-0 text-good" />
          Your resume and your applications stay in your own account. Row level security, always on.
        </p>
      </div>
    </aside>
  );
}
