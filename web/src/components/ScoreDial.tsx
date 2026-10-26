"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scoreTone } from "@/lib/format";

/** Matches --dur-score in globals.css. */
const SWEEP_MS = 900;
/** A 240 degree gauge, open at the bottom. */
const SWEEP_DEG = 240;
const START_DEG = 150;
/** The two band edges: 40 and 70 out of 100. */
const BAND_TICKS = [40, 70];

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ScoreDial({
  score,
  verdict,
  size = 168,
  average = null,
}: {
  score: number | null;
  verdict?: string | null;
  size?: number;
  /** Optional: marks where this person usually lands. */
  average?: number | null;
}) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const [shown, setShown] = useState(0);
  const numeral = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  // The numeral counts with the arc, written straight to the DOM so a 60fps
  // count never re-renders the tree. The server still ships the real number.
  useIsoLayoutEffect(() => {
    const el = numeral.current;
    if (!el || score === null || score === undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / SWEEP_MS);
      el.textContent = String(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    el.textContent = "0";
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, value]);

  const stroke = Math.round(size * 0.075);
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * (SWEEP_DEG / 360);
  const offset = arc - (arc * shown) / 100;

  const point = (v: number, radius: number) => {
    const a = ((START_DEG + (v / 100) * SWEEP_DEG) * Math.PI) / 180;
    return [c + radius * Math.cos(a), c + radius * Math.sin(a)] as const;
  };

  return (
    <figure
      data-tone={scoreTone(score)}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-label={`Fit score ${value} out of 100${verdict ? `, ${verdict}` : ""}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`rotate(${START_DEG} ${c} ${c})`}>
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--tone)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset var(--dur-score) var(--ease-out)",
              filter: "drop-shadow(0 0 5px color-mix(in oklab, var(--tone) 28%, transparent))",
            }}
          />
        </g>

        {/* Band edges, cut into the track */}
        {BAND_TICKS.map((v) => {
          const [x1, y1] = point(v, r - stroke / 2);
          const [x2, y2] = point(v, r + stroke / 2);
          return (
            <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--surface)" strokeWidth={2} opacity={0.9} />
          );
        })}

        {/* Where this person usually lands */}
        {average !== null && average !== undefined && (
          <line
            {...(() => {
              const [x1, y1] = point(average, r + stroke / 2 + 3);
              const [x2, y2] = point(average, r + stroke / 2 + 8);
              return { x1, y1, x2, y2 };
            })()}
            stroke="var(--muted)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
      </svg>

      <figcaption className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span
          ref={numeral}
          className="tabular font-bold"
          style={{ fontSize: size * 0.3, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--tone)" }}
        >
          {score ?? "?"}
        </span>
        {verdict && (
          <span
            className="enter-fade mt-1 line-clamp-1 max-w-[88%] px-1 text-center text-meta font-semibold"
            style={{ color: "var(--tone)", animationDelay: "560ms" }}
          >
            {verdict}
          </span>
        )}
      </figcaption>

      {/* The ends of the scale */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-2 text-[10px] text-faint" aria-hidden>
        <span className="tabular">0</span>
        <span className="tabular">100</span>
      </span>
    </figure>
  );
}

/** The score chip. The band decides the tint. */
export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  return (
    <span data-tone={scoreTone(score)} className={size === "sm" ? "score score-sm" : "score"} title="Fit score">
      {score ?? "?"}
    </span>
  );
}
