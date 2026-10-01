"use client";

import { useEffect, useRef } from "react";

/**
 * Gallery spotlight for the hero — owner-approved ambient light.
 *
 * A soft warm-white light follows the cursor (or a finger dragged across the
 * hero) with a little weight behind it, and drifts slowly on its own when left
 * alone, so the hero is alive on a phone too. Fine film grain sits over it.
 *
 * Built to cost almost nothing:
 *   - the light is one fixed-size element moved by `transform`, so following
 *     the pointer is compositor work, never a repaint of the hero
 *   - the animation loop runs only while the hero is on screen and the tab is
 *     visible, and stops entirely under reduced motion (the light then rests
 *     where the stylesheet puts it)
 *
 * Decorative only: aria-hidden and pointer-events none, so it never takes a
 * click — including in the on-page editor, which finds what was clicked with
 * elementsFromPoint and therefore looks straight through it.
 */

const IDLE_MS = 2600;
const EASE = 0.08;

export function HeroSpotlight() {
  const layer = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = layer.current?.parentElement;
    const lamp = light.current;
    if (!hero || !lamp) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    let x = hero.clientWidth * 0.34;
    let y = hero.clientHeight * 0.42;
    let targetX = x;
    let targetY = y;
    let lastInput = -Infinity;
    let frame = 0;
    let onScreen = true;
    const start = performance.now();

    const place = () => {
      lamp.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

    const tick = (now: number) => {
      frame = 0;
      if (now - lastInput > IDLE_MS) {
        // A slow, never-repeating figure across the hero.
        const t = (now - start) / 1000;
        targetX = hero.clientWidth * (0.5 + 0.3 * Math.sin(t * 0.21));
        targetY = hero.clientHeight * (0.46 + 0.18 * Math.sin(t * 0.33 + 1));
      }
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      place();
      run();
    };

    const run = () => {
      if (!frame && onScreen && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const follow = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      targetX = event.clientX - box.left;
      targetY = event.clientY - box.top;
      lastInput = performance.now();
      run();
    };

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) run();
    });

    const onVisibilityChange = () => run();

    place();
    visibility.observe(hero);
    hero.addEventListener("pointermove", follow, { passive: true });
    hero.addEventListener("pointerdown", follow, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    run();

    return () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      hero.removeEventListener("pointermove", follow);
      hero.removeEventListener("pointerdown", follow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={layer}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      <div className="spot-vignette" />
      <div ref={light} className="spot-light" />
      <div className="spot-grain" />
    </div>
  );
}
