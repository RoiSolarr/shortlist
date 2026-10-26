"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Box = { offset: number; size: number };

/**
 * Measures the active item inside a container so a single element can travel
 * between items instead of popping from one to the next. Measurement is the
 * one place where JavaScript genuinely beats CSS here: the items have
 * different widths and the container reflows.
 *
 * Items are found by the `data-nav-item` attribute, in document order.
 */
export function useTravellingIndicator(activeIndex: number, axis: "x" | "y") {
  const listRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);

  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list || activeIndex < 0) return;

    const measure = () => {
      const item = list.querySelectorAll<HTMLElement>("[data-nav-item]")[activeIndex];
      if (!item) return;
      const outer = list.getBoundingClientRect();
      const inner = item.getBoundingClientRect();
      setBox(
        axis === "y"
          ? { offset: inner.top - outer.top, size: inner.height }
          : { offset: inner.left - outer.left, size: inner.width },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex, axis]);

  // The first position lands without a transition, so the indicator appears
  // where it belongs instead of flying in from the corner.
  useEffect(() => {
    if (!box || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [box, ready]);

  return { listRef, box, ready };
}
