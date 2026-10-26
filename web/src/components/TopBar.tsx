import Link from "next/link";
import { cx } from "@/lib/format";
import { IconArrowLeft } from "./icons";

export type Crumb = { label: string; href?: string };

/**
 * The bar at the top of every screen: where you are on the left, the
 * actions for this screen on the right. It sticks under the mobile header
 * and at the top of the content column on desktop. `back`, when given,
 * adds a Back button in front of the breadcrumb; `onBack` runs on its click.
 */
export function TopBar({
  crumbs,
  actions,
  back,
  onBack,
}: {
  crumbs: Crumb[];
  actions?: React.ReactNode;
  back?: string;
  onBack?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="sticky top-14 z-20 flex h-14 items-center justify-between gap-4 border-b border-line backdrop-blur md:top-0"
      style={{ background: "color-mix(in oklab, var(--canvas) 82%, transparent)", paddingInline: "var(--gutter)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <>
            <Link href={back} onClick={onBack} className="btn btn-ghost btn-sm shrink-0">
              <IconArrowLeft className="size-3.5" />
              Back
            </Link>
            <span className="h-5 w-px shrink-0 bg-line" aria-hidden />
          </>
        )}
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-ui">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                {i > 0 && (
                  <span className="text-faint" aria-hidden>
                    /
                  </span>
                )}
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="truncate text-muted transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cx("truncate", last ? "font-semibold text-ink" : "text-muted")} aria-current={last ? "page" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
