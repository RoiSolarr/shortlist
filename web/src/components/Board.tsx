"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { JobCard, JobStatus } from "@/lib/types";
import { STATUSES, STATUS_LABEL } from "@/lib/status";
import { cx, formatDate, initials, relativeTime } from "@/lib/format";
import { statusPatch, updateJob } from "@/lib/jobs";
import { useShell } from "./AppShell";
import { ScoreBadge } from "./ScoreDial";
import { useToast } from "./Toast";
import { IconGrip, IconSearch, IconSliders, IconStack } from "./icons";

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/** A reply has arrived once the job has moved past Applied. */
const ANSWERED: JobStatus[] = ["interview", "offer", "rejected"];
const SENT: JobStatus[] = ["applied", "interview", "offer", "rejected"];
/** Follow up after a week without an answer. */
const STALE_DAYS = 7;

const SORTS = [
  { id: "board", label: "Board order" },
  { id: "newest", label: "Newest" },
  { id: "score", label: "Highest score" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

export function Board({ initial }: { initial: JobCard[] }) {
  const [cards, setCards] = useState(initial);
  const [query, setQuery] = useState("");
  const [onlyStrong, setOnlyStrong] = useState(false);
  const [sort, setSort] = useState<SortId>("board");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<JobStatus | null>(null);
  const { toast } = useToast();
  // Cards animate in on first paint only, so a later move does not replay it
  const [appearing, setAppearing] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setAppearing(false), 800);
    return () => clearTimeout(id);
  }, []);

  // The drag overlay is portalled to the body, which only exists in the browser
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (onlyStrong && (c.fit_score ?? 0) < 60) return false;
      if (!q) return true;
      return `${c.title} ${c.company} ${c.location}`.toLowerCase().includes(q);
    });
  }, [cards, query, onlyStrong]);

  const columns = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s.id, [] as JobCard[]])) as Record<JobStatus, JobCard[]>;
    for (const c of filtered) map[c.status]?.push(c);
    const order = (a: JobCard, b: JobCard) =>
      sort === "newest"
        ? b.created_at.localeCompare(a.created_at)
        : sort === "score"
          ? (b.fit_score ?? 0) - (a.fit_score ?? 0)
          : a.position - b.position;
    for (const k of Object.keys(map) as JobStatus[]) map[k].sort(order);
    return map;
  }, [filtered, sort]);

  const active = cards.find((c) => c.id === activeId) ?? null;

  function statusFromOver(id: string | undefined): JobStatus | null {
    if (!id) return null;
    if (id.startsWith("col:")) return id.slice(4) as JobStatus;
    if (id.startsWith("card:")) return cards.find((c) => c.id === id.slice(5))?.status ?? null;
    return null;
  }

  async function move(card: JobCard, status: JobStatus, position: number, quiet = false) {
    const statusChanged = card.status !== status;
    const patch = statusChanged ? statusPatch(status, card.applied_at, position) : { board_position: position };
    const before = cards;
    const from = { status: card.status, position: card.position };
    setCards((all) =>
      all.map((c) =>
        c.id === card.id ? { ...c, status, position, applied_at: patch.applied_at ?? c.applied_at } : c,
      ),
    );

    const { error } = await updateJob(card.id, patch);
    if (error) {
      setCards(before);
      toast("Could not move the card. Try again.", "error", {
        label: "Retry",
        onClick: () => move(card, status, position, quiet),
      });
    } else if (statusChanged && !quiet) {
      toast(`Moved to ${STATUS_LABEL[status]}`, "ok", {
        label: "Undo",
        onClick: () => move({ ...card, status, position }, from.status, from.position, true),
      });
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    setOverStatus(statusFromOver(e.over?.id ? String(e.over.id) : undefined));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverStatus(null);
    const card = cards.find((c) => c.id === e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!card || !overId) return;

    if (overId.startsWith("col:")) {
      const status = overId.slice(4) as JobStatus;
      const rest = cards.filter((c) => c.status === status && c.id !== card.id);
      if (status === card.status && rest.length === 0) return;
      const last = rest.reduce((m, c) => Math.max(m, c.position), -Infinity);
      move(card, status, Number.isFinite(last) ? last + 1 : 0);
      return;
    }

    const target = cards.find((c) => c.id === overId.slice(5));
    if (!target || target.id === card.id) return;
    const list = cards
      .filter((c) => c.status === target.status && c.id !== card.id)
      .sort((a, b) => a.position - b.position);
    const idx = list.findIndex((c) => c.id === target.id);
    const prev = list[idx - 1];
    const position = prev ? (prev.position + target.position) / 2 : target.position - 1;
    move(card, target.status, position);
  }

  /* ---- The four numbers a job hunt actually raises ---- */
  const sent = cards.filter((c) => SENT.includes(c.status));
  const answered = cards.filter((c) => ANSWERED.includes(c.status));
  const inPlay = cards.filter((c) => c.status !== "rejected").length;
  const replyRate = sent.length ? Math.round((answered.length / sent.length) * 100) : null;
  const waits = cards
    .filter((c) => c.status === "applied")
    .map((c) => daysSince(c.applied_at))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  const medianWait = waits.length ? waits[Math.floor(waits.length / 2)] : null;
  const mean = (list: JobCard[]) =>
    list.length ? Math.round(list.reduce((a, c) => a + (c.fit_score ?? 0), 0) / list.length) : null;
  const appliedFit = mean(sent.filter((c) => c.status !== "rejected"));
  const rejectedFit = mean(cards.filter((c) => c.status === "rejected"));

  return (
    <div className="flex flex-col gap-5">
      {/* Four numbers, not an empty hero */}
      <div className="gutter px-[var(--gutter)]">
        <div className="panel grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          <Stat label="In play" value={inPlay} foot="excludes rejected" />
          <Stat
            label="Reply rate"
            value={replyRate === null ? "—" : `${replyRate}%`}
            foot={`${answered.length} of ${sent.length} answered`}
          />
          <Stat
            label="Median days to reply"
            value={medianWait === null ? "—" : medianWait}
            foot={`follow up after ${STALE_DAYS}`}
          />
          <Stat
            label="Average fit applied"
            value={appliedFit ?? "—"}
            foot={rejectedFit === null ? "no rejections yet" : `vs ${rejectedFit} for rejected`}
          />
        </div>
      </div>

      <div className="gutter flex flex-wrap items-center justify-between gap-3">
        <p className="pl-[var(--gutter)] text-meta text-muted">Drag a card to update its stage.</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, company, location"
              aria-label="Search jobs"
              className="field h-9 w-full pl-9 sm:w-64"
            />
          </div>
          <button
            type="button"
            aria-pressed={onlyStrong}
            onClick={() => setOnlyStrong((v) => !v)}
            className={cx("btn btn-sm h-9", onlyStrong ? "btn-primary" : "btn-quiet")}
          >
            <IconSliders className="size-3.5" />
            Score 60+
          </button>
          <label className="relative">
            <span className="sr-only">Sort cards</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="field h-9 cursor-pointer appearance-none py-0 pr-8 pl-3 font-semibold"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint" aria-hidden>
              ▾
            </span>
          </label>
        </div>
      </div>

      <DndContext
        // A fixed id keeps dnd-kit's accessibility ids the same on the server and in the browser
        // (without it React reports a hydration mismatch on aria-describedby)
        id="job-board"
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverStatus(null);
        }}
      >
        <div className="scroll-x flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] pb-4 xl:grid xl:grid-cols-5 xl:overflow-visible">
          {STATUSES.map((s, column) => (
            <Column
              key={s.id}
              status={s.id}
              label={s.label}
              hint={s.hint}
              cards={columns[s.id]}
              highlight={overStatus === s.id && active?.status !== s.id}
              draggingId={activeId}
              appearing={appearing}
              column={column}
              onMove={(card, status) => move(card, status, -Date.now())}
            />
          ))}
        </div>

        {/* On the body, not in the page: the page's entrance animation makes its wrapper the
            containing block for fixed elements, which pushed the held card off the cursor
            by the width of the sidebar */}
        {mounted &&
          createPortal(
            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }}>
              {active ? <CardBody card={active} lifted /> : null}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </div>
  );
}

function Stat({ label, value, foot }: { label: string; value: React.ReactNode; foot: string }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-foot">{foot}</p>
    </div>
  );
}

function Column({
  status,
  label,
  hint,
  cards,
  highlight,
  draggingId,
  appearing,
  column,
  onMove,
}: {
  status: JobStatus;
  label: string;
  hint: string;
  cards: JobCard[];
  highlight: boolean;
  draggingId: string | null;
  appearing: boolean;
  column: number;
  onMove: (card: JobCard, status: JobStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const lit = highlight || (isOver && !cards.some((c) => c.id === draggingId));

  return (
    <section
      ref={setNodeRef}
      data-status={status}
      data-lit={lit}
      aria-label={`${label}, ${cards.length} jobs`}
      className="column flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col overflow-hidden sm:w-[280px] xl:w-auto xl:max-w-none"
    >
      <span className="column-rule" aria-hidden />
      <header className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-2">
          <span className="st-dot" />
          <h2 className="text-ui font-semibold">{label}</h2>
          <span className="tabular ml-auto text-meta font-semibold text-muted">{cards.length}</span>
        </div>
        <p className="mt-0.5 pl-[15px] text-meta text-faint">{hint}</p>
      </header>

      <ul className="flex min-h-28 flex-1 flex-col gap-2 px-2 pb-2">
        {cards.map((c, i) => (
          <DraggableCard
            key={c.id}
            card={c}
            hidden={c.id === draggingId}
            appearing={appearing}
            delay={Math.min(i, 5) * 50 + column * 30}
            onMove={onMove}
          />
        ))}
        {cards.length === 0 && <EmptyColumn status={status} />}
      </ul>
    </section>
  );
}

function EmptyColumn({ status }: { status: JobStatus }) {
  return (
    <li className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-[var(--radius)] px-4 py-8 text-center">
      <span
        className="grid size-8 place-items-center rounded-[var(--radius-sm)]"
        style={{ background: "color-mix(in oklab, var(--st) 10%, transparent)", color: "var(--st)" }}
        aria-hidden
      >
        <IconStack className="size-4" />
      </span>
      <span className="text-meta text-faint">
        {status === "saved" ? "Analyzed jobs appear here" : "Drop a card here"}
      </span>
    </li>
  );
}

function DraggableCard({
  card,
  hidden,
  appearing,
  delay,
  onMove,
}: {
  card: JobCard;
  hidden: boolean;
  appearing: boolean;
  delay: number;
  onMove: (card: JobCard, status: JobStatus) => void;
}) {
  const drag = useDraggable({ id: card.id });
  const drop = useDroppable({ id: `card:${card.id}` });
  const open = drop.isOver && !hidden;

  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...drag.attributes}
      {...drag.listeners}
      aria-roledescription="Draggable job card"
      data-status={card.status}
      className={cx("relative touch-manipulation rounded-[var(--radius)] outline-none", hidden && "opacity-30", appearing && "enter-up")}
      style={appearing ? { animationDelay: `${delay}ms` } : undefined}
    >
      {/* The drop target opens space for the card instead of appearing abruptly */}
      <span className="reveal" data-open={open} aria-hidden>
        <span>
          <span className="drop-slot" />
        </span>
      </span>
      <CardBody card={card} onMove={onMove} />
    </li>
  );
}

function CardBody({
  card,
  lifted,
  onMove,
}: {
  card: JobCard;
  lifted?: boolean;
  onMove?: (card: JobCard, status: JobStatus) => void;
}) {
  const shell = useShell();
  const waiting = card.status === "applied" ? daysSince(card.applied_at) : null;
  const stale = waiting !== null && waiting >= STALE_DAYS;
  const foot =
    stale && waiting !== null
      ? `No reply in ${waiting} days`
      : card.status !== "saved" && card.applied_at
        ? `Applied ${formatDate(card.applied_at)}`
        : `Analyzed ${relativeTime(card.created_at)}`;

  return (
    <div
      data-status={card.status}
      className={cx(
        "rounded-[var(--radius)] border border-line bg-surface p-3",
        lifted ? "card-held" : "lift cursor-grab hover:border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ScoreBadge score={card.fit_score} size="sm" />
        <span className="flex items-center gap-1.5">
          <IconGrip className="grip size-3.5 text-faint" aria-hidden />
          <span className="text-[10px] font-bold tracking-[0.06em] text-faint uppercase">
            {initials(card.company)}
          </span>
        </span>
      </div>

      <Link
        href={`/jobs/${card.id}`}
        draggable={false}
        onClick={(e) => shell.navigate(e, { title: card.title, detail: "Opening the job report." })}
        className="mt-2 line-clamp-2 block text-ui leading-snug font-semibold text-ink hover:underline hover:underline-offset-4"
      >
        {card.title}
      </Link>
      <p className="mt-0.5 truncate text-meta text-muted">{card.company}</p>

      <p
        className={cx("tabular mt-2.5 border-t border-line pt-2 text-meta", stale ? "font-semibold text-warn" : "text-faint")}
      >
        {stale && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-warn align-middle" />}
        {foot}
      </p>

      {onMove && (
        <label className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5 text-meta text-muted xl:hidden">
          Stage
          <select
            value={card.status}
            onChange={(e) => onMove(card, e.target.value as JobStatus)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="ml-auto rounded-md border border-line bg-sunken px-2 py-1 text-meta font-semibold text-ink"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

