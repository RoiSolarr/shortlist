"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/lib/format";
import { STATUSES } from "@/lib/status";
import type { JobStatus } from "@/lib/types";
import { BlockingOverlay } from "./BlockingOverlay";
import { useTravellingIndicator } from "./useIndicator";
import { IconBoard, IconFile, IconSpark, IconUser, Logo, Spinner } from "./icons";

const NAV = [
  { href: "/", label: "Analyze", icon: IconSpark, detail: "Loading your recent runs." },
  { href: "/board", label: "Board", icon: IconBoard, detail: "Loading your board." },
  { href: "/resume", label: "Resume", icon: IconFile, detail: "Loading your resume." },
];

/** The overlay holds at least this long, so fast work does not flash. */
const MIN_OVERLAY_MS = 500;
/** A stalled navigation never leaves the screen locked. */
const MAX_NAV_OVERLAY_MS = 15_000;

/** What the blocking overlay says while it is up. */
export type Busy = { title: string; detail?: string };

/**
 * The blocking overlay lives here, outside the page, because the page's
 * entrance animation would otherwise shrink a fixed overlay to the content
 * column and leave the sidebar clickable.
 */
const ShellContext = createContext<{
  /**
   * Blocks the screen until the next page has painted. Pass a link's click
   * event, or null when the code navigates itself.
   */
  navigate: (e: React.MouseEvent | null, busy: Busy) => void;
  /** Blocks the screen while work on this page runs. Call the result to release it. */
  block: (busy: Busy) => () => void;
  /** Signs out behind the "Signing out" overlay and lands on the login page. */
  signOut: () => void;
}>({ navigate: () => {}, block: () => () => {}, signOut: () => {} });

export const useShell = () => useContext(ShellContext);

/** Where a path sits in the nav order, so page movement matches the model. */
function navIndex(pathname: string) {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/board") || pathname.startsWith("/jobs")) return 1;
  if (pathname.startsWith("/resume")) return 2;
  if (pathname.startsWith("/account")) return 3;
  return 0;
}

export type ShellResume = { label: string; status: "processing" | "ready" | "failed" } | null;

export function AppShell({
  email,
  hasResume,
  counts,
  resume,
  children,
}: {
  email: string;
  hasResume: boolean;
  /** Optional: live pipeline counts for the sidebar. */
  counts?: Partial<Record<JobStatus, number>>;
  /** Optional: the version every new job is scored against. */
  resume?: ShellResume;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // From a navigating click until the new page has painted
  const [navigating, setNavigating] = useState<(Busy & { from: string; at: number }) | null>(null);
  // Work on the current page, such as an upload
  const [working, setWorking] = useState<Busy | null>(null);
  const blockId = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/board" && pathname.startsWith("/jobs"));

  const activeIndex = NAV.findIndex((item) => isActive(item.href));
  const total = counts ? Object.values(counts).reduce((a, n) => a + (n ?? 0), 0) : undefined;

  const onPending = useCallback((href: string, pending: boolean) => {
    setPendingHref((current) => (pending ? href : current === href ? null : current));
  }, []);

  const side = useTravellingIndicator(activeIndex, "y");
  const tabs = useTravellingIndicator(activeIndex, "x");

  const navigate = useCallback(
    (e: React.MouseEvent | null, busy: Busy) => {
      // A modified click opens a new tab, so this page is not going anywhere
      if (e && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
      setNavigating({ ...busy, from: pathname, at: Date.now() });
    },
    [pathname],
  );

  const block = useCallback((busy: Busy) => {
    const id = ++blockId.current;
    const at = Date.now();
    setWorking(busy);
    return () => {
      // A later block replaces this one, so only the latest release clears it
      setTimeout(
        () => blockId.current === id && setWorking(null),
        Math.max(0, at + MIN_OVERLAY_MS - Date.now()),
      );
    };
  }, []);

  const signOut = useCallback(async () => {
    // The overlay stays up through the navigation, so there is no flash of
    // the signed in shell on the way out.
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }, [router]);

  const shell = useMemo(() => ({ navigate, block, signOut }), [navigate, block, signOut]);
  const onAccount = pathname.startsWith("/account");

  function startNav(e: React.MouseEvent, href: string, busy: Busy) {
    if (navIndex(href) === navIndex(pathname)) return;
    navigate(e, busy);
  }

  // The route skeleton shows first, so the overlay waits for it to be
  // replaced by the real page rather than closing on the URL change alone.
  useEffect(() => {
    if (!navigating || pathname === navigating.from) return;
    const main = mainRef.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      if (main?.querySelector("[data-skeleton]")) return;
      observer.disconnect();
      timer = setTimeout(() => setNavigating(null), Math.max(0, navigating.at + MIN_OVERLAY_MS - Date.now()));
    };
    const observer = new MutationObserver(settle);
    if (main) observer.observe(main, { childList: true, subtree: true });
    settle();
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [navigating, pathname]);

  useEffect(() => {
    if (!navigating) return;
    const id = setTimeout(() => setNavigating(null), MAX_NAV_OVERLAY_MS);
    return () => clearTimeout(id);
  }, [navigating]);

  const overlay = navigating ?? working;

  return (
    <>
      <div className="min-h-dvh md:grid md:grid-cols-[var(--sidebar)_1fr]" inert={signingOut || overlay !== null || undefined}>
        {/* Sidebar, desktop. Never remounts, never moves during a transition. */}
        <aside
          className="sticky top-0 hidden h-dvh flex-col border-r border-line px-3 py-5 backdrop-blur md:flex"
          style={{ background: "color-mix(in oklab, var(--surface) 55%, transparent)" }}
        >
          <div className="mb-7 flex items-center gap-2.5 px-2">
            <Logo />
            <span className="t-section">Shortlist</span>
          </div>

          <p className="eyebrow px-3 pb-2">Workspace</p>
          <nav ref={side.listRef as React.Ref<HTMLElement>} className="relative flex flex-col gap-0.5" aria-label="Main">
            {/* Hidden on Account, which is none of these three */}
            {side.box && activeIndex >= 0 && (
              <span
                aria-hidden
                data-ready={side.ready}
                className="nav-indicator"
                style={{ height: side.box.size, transform: `translateY(${side.box.offset}px)` }}
              />
            )}
            {NAV.map(({ href, label, icon: Icon, detail }) => (
              <Link
                key={href}
                href={href}
                onClick={(e) => startNav(e, href, { title: label, detail })}
                data-nav-item
                aria-current={isActive(href) ? "page" : undefined}
                className={cx(
                  "nav-item relative flex h-9 items-center gap-2.5 rounded-[var(--radius-btn)] px-3 text-ui font-semibold",
                  isActive(href) ? "" : "text-muted hover:text-ink",
                )}
              >
                <NavItemBody
                  href={href}
                  label={label}
                  icon={<Icon className="size-[17px]" />}
                  onPending={onPending}
                  count={href === "/board" ? total : undefined}
                  flag={href === "/resume" && !hasResume}
                />
              </Link>
            ))}
          </nav>

          {counts && (
            <>
              <p className="eyebrow px-3 pt-6 pb-2">Pipeline</p>
              <ul className="flex flex-col">
                {STATUSES.map((s) => (
                  <li key={s.id} data-status={s.id} className="flex h-8 items-center gap-2.5 px-3 text-ui text-muted">
                    <span className="st-dot" />
                    {s.label}
                    <span className="tabular ml-auto text-meta text-faint">{counts[s.id] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-5">
            <ResumeCard resume={resume} hasResume={hasResume} />

            {/* Avatar, email and the way to the account page in one block. The text
                column can shrink, so a long address truncates instead of overlapping. */}
            <div className="flex min-w-0 items-center gap-2.5 border-t border-line px-1 pt-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-bold text-ink-soft ring-1 ring-line">
                {initialsFromEmail(email)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-meta text-ink-soft" title={email}>
                  {email}
                </span>
                <Link
                  href="/account"
                  onClick={(e) => !onAccount && navigate(e, { title: "Account", detail: "Loading your account." })}
                  aria-current={onAccount ? "page" : undefined}
                  className={cx(
                    "w-fit text-meta transition-colors hover:text-ink",
                    onAccount ? "font-semibold text-ink" : "text-faint",
                  )}
                >
                  Account
                </Link>
              </span>
            </div>
          </div>
        </aside>

        {/* Top bar, mobile */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line px-4 backdrop-blur md:hidden"
          style={{ background: "color-mix(in oklab, var(--canvas) 85%, transparent)" }}
        >
          <div className="flex items-center gap-2">
            <Logo className="size-6" />
            <span className="t-section">Shortlist</span>
          </div>
          <Link
            href="/account"
            onClick={(e) => !onAccount && navigate(e, { title: "Account", detail: "Loading your account." })}
            aria-current={onAccount ? "page" : undefined}
            className={cx("btn btn-ghost btn-sm", onAccount && "text-ink")}
            aria-label="Account"
          >
            <IconUser className="size-4" />
          </Link>
        </header>

        <NavProgress active={pendingHref !== null} />

        <main ref={mainRef} className="relative min-w-0 pb-24 md:pb-0">
          <ShellContext.Provider value={shell}>
            <PageTransition pathname={pathname}>{children}</PageTransition>
          </ShellContext.Provider>
        </main>

        {/* Tab bar, mobile */}
        <nav
          ref={tabs.listRef as React.Ref<HTMLElement>}
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          style={{ background: "color-mix(in oklab, var(--surface) 92%, transparent)" }}
        >
          {tabs.box && activeIndex >= 0 && (
            <span
              aria-hidden
              data-ready={tabs.ready}
              className="nav-indicator-bar"
              style={{ width: tabs.box.size, transform: `translateX(${tabs.box.offset}px)` }}
            />
          )}
          {NAV.map(({ href, label, icon: Icon, detail }) => (
            <Link
              key={href}
              href={href}
              onClick={(e) => startNav(e, href, { title: label, detail })}
              data-nav-item
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-meta font-semibold transition-colors",
                isActive(href) ? "text-ink" : "text-faint",
              )}
            >
              <NavItemBody
                href={href}
                label={label}
                icon={<Icon className="size-5" />}
                onPending={onPending}
                flag={href === "/resume" && !hasResume}
                stacked
              />
            </Link>
          ))}
        </nav>
      </div>

      <BlockingOverlay open={signingOut} title="Signing out" detail="Closing your session on this device." />
      <BlockingOverlay open={overlay !== null} title={overlay?.title ?? ""} detail={overlay?.detail} />
    </>
  );
}

function initialsFromEmail(email: string) {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

/** The version every new job is scored against, stated where it is read. */
function ResumeCard({ resume, hasResume }: { resume: ShellResume | undefined; hasResume: boolean }) {
  if (resume === undefined) return null;

  if (!resume || !hasResume) {
    return (
      <div className="panel-sunken px-3 py-2.5">
        <span className="flex items-center gap-2 text-meta font-semibold text-warn">
          <span className="size-1.5 rounded-full bg-warn" />
          No resume yet
        </span>
        <span className="mt-0.5 block text-meta text-muted">Add one before your first run.</span>
      </div>
    );
  }

  const working = resume.status === "processing";
  return (
    <div className="panel-sunken px-3 py-2.5">
      <span className="flex items-center gap-2 text-meta font-semibold">
        {working ? (
          <>
            <Spinner className="size-3.5 text-muted" />
            <span className="text-ink-soft">Reading your resume</span>
          </>
        ) : resume.status === "failed" ? (
          <span className="text-bad">Resume could not be read</span>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-good" />
            <span className="text-good">Resume active</span>
          </>
        )}
      </span>
      <span className="mt-0.5 block truncate text-meta text-muted" title={resume.label}>
        {resume.label}
      </span>
      {working && (
        <span className="track mt-2 block h-[3px]" aria-hidden>
          <span className="track-seg" />
          <span className="track-seg track-seg-2" />
        </span>
      )}
    </div>
  );
}

/**
 * The inside of a nav item. It lives in its own component because
 * useLinkStatus only reports for the Link above it, which is how the exact
 * tab being navigated to can show that it is working.
 */
function NavItemBody({
  href,
  label,
  icon,
  onPending,
  count,
  flag,
  stacked,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  onPending: (href: string, pending: boolean) => void;
  count?: number;
  flag?: boolean;
  stacked?: boolean;
}) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    onPending(href, pending);
    return () => onPending(href, false);
  }, [href, pending, onPending]);

  return (
    <>
      <span className={cx("transition-opacity", pending && "opacity-70")}>{icon}</span>
      {label}
      {count !== undefined && !stacked && (
        <span className="tabular ml-auto text-meta font-semibold opacity-60">{count}</span>
      )}
      {flag && (
        <span
          className={cx("size-1.5 rounded-full bg-warn", stacked ? "absolute top-3 ml-6" : "ml-auto")}
          aria-label="Resume missing"
        />
      )}
      {pending && (
        <span
          aria-hidden
          className={cx("track absolute h-[2px]", stacked ? "inset-x-6 bottom-2.5" : "inset-x-3 bottom-1")}
          style={{ ["--bar" as string]: "currentColor" }}
        >
          <span className="track-seg" />
        </span>
      )}
    </>
  );
}

function NavProgress({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="nav-progress track fixed inset-x-0 top-14 z-40 h-[2px] rounded-none md:top-0 md:left-[var(--sidebar)]"
    >
      <span className="track-seg" />
      <span className="track-seg track-seg-2" />
    </div>
  );
}

/**
 * Direction aware content movement. Nav order is Analyze, Board, Resume, so
 * moving right slides content in from the right and moving left from the
 * left. The shell above this never remounts.
 */
function PageTransition({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const index = navIndex(pathname);
  const previous = useRef<number | null>(null);
  const direction = previous.current === null || previous.current === index ? 0 : index > previous.current ? 1 : -1;

  useEffect(() => {
    previous.current = index;
  }, [index]);

  return (
    <div
      key={pathname}
      className="page-enter"
      style={
        {
          "--enter-x": direction === 0 ? "0px" : direction > 0 ? "var(--travel-lg)" : "calc(var(--travel-lg) * -1)",
          "--enter-y": direction === 0 ? "var(--travel-sm)" : "0px",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        <h1 className="t-page text-balance">{title}</h1>
        {description && <p className="measure mt-2.5 text-ui text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
