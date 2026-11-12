"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * The storefront's three scroll effects (cement design). Decoration only:
 * with this script absent every page is complete, just still.
 *
 *   Header tone   The header is bone on dark and black on a pale bar. Each
 *                 section says which it is (`data-tone`); the header takes
 *                 the tone of whatever is under it.
 *   Hero          The photo eases back and dims as the page slides over it.
 *   Posters       Lines rise into place the first time they are seen.
 *
 * Nothing here reads or writes content. Under reduced motion the header tone
 * still follows the page (it is legibility, not motion); the other two do
 * nothing.
 */
export function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const head = document.querySelector<HTMLElement>(".site-head");
    const frame = head?.closest<HTMLElement>(".storefront") ?? null;
    if (!head || !frame) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const update = () => {
      raf = 0;
      // Measured from the header itself: inside the editor it sits below the
      // edit bar, not at the top of the window. The tone is that of whatever
      // is behind the middle of the header; at the top of a page that starts
      // below the header, it is that of the section the header sits on.
      const box = head.getBoundingClientRect();
      const toneAt = (line: number) => {
        let found: string | null = null;
        for (const el of frame.querySelectorAll<HTMLElement>("[data-tone]")) {
          if (el === head) continue;
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.top <= line && r.bottom > line) found = el.dataset.tone ?? "dark";
        }
        return found;
      };
      const tone = toneAt(box.top + box.height / 2) ?? toneAt(box.bottom + 1) ?? "dark";
      if (head.dataset.tone !== tone) head.dataset.tone = tone;

      const hero = frame.querySelector<HTMLElement>(".hero-hold");
      if (hero && !reduce.matches) {
        const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
        hero.style.setProperty("--p", p.toFixed(3));
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Content arriving or changing height (a saved edit, a photo loading)
    // can change what sits under the header without a scroll.
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resized?.observe(frame);
    update();

    // Posters. Only ones that start below the screen are held back, so
    // nothing already in view ever blinks, and never while the owner is
    // editing, where every word must stay put to be clicked.
    let seen: IntersectionObserver | null = null;
    const editing = Boolean(frame.closest(".be-canvas"));
    if (!reduce.matches && !editing && typeof IntersectionObserver !== "undefined") {
      seen = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("rise-in");
            entry.target.classList.remove("rise-ready");
            seen?.unobserve(entry.target);
          }
        },
        { threshold: 0.3 },
      );
      for (const el of frame.querySelectorAll<HTMLElement>("[data-rise]")) {
        if (el.classList.contains("rise-in")) continue;
        if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
          el.classList.add("rise-ready");
          seen.observe(el);
        }
      }
    }

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resized?.disconnect();
      seen?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      for (const el of frame.querySelectorAll(".rise-ready")) el.classList.remove("rise-ready");
    };
  }, [pathname]);

  return null;
}
