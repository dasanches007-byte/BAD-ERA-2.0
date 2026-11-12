"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useShop } from "@/components/storefront/shop-context";
import type { CatalogPhoto } from "@/lib/catalog/queries";

/**
 * Zooming into a product's photos (cement design; replaced the light on
 * 12 November 2026 at the owner's request).
 *
 * A tap or click on a product photo opens it out of its place to fill the
 * screen, already zoomed in on the spot that was touched. From there:
 *
 *   Touch     pinch to zoom, drag to move, double-tap for the whole photo or
 *             back in; at full view, swipe sideways for the next photo and
 *             down to close
 *   Mouse     move to look around, click to zoom out or in, wheel to zoom
 *   Keyboard  + and − zoom, arrows move (or change photo at full view),
 *             0 shows the whole photo, Escape closes
 *
 * It is the owner's photo, only larger: nothing is drawn over it or added to
 * it, and it is only ever as sharp as the file that was uploaded.
 *
 * While it is open the page behind is inert and does not scroll, focus stays
 * inside, and on closing the photo returns to its place and focus to the
 * photo it was opened from. Under reduced motion nothing travels: it simply
 * appears and goes.
 */

/** Where a photo sits on the page, so the zoom can open out of it and return. */
export type ZoomOrigin = {
  rect: { left: number; top: number; width: number; height: number };
  focal: { x: number; y: number };
  /** The photo's own width / height, once known. */
  aspect: number | null;
};

export type ZoomStart = {
  index: number;
  /** Where on the screen it was tapped; null when opened from the keyboard. */
  at: { x: number; y: number } | null;
};

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const OPEN_MS = 440;
const CLOSE_MS = 300;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

type View = { z: number; tx: number; ty: number };

export function PhotoZoom({
  photos,
  title,
  start,
  originOf,
  onClose,
}: {
  photos: CatalogPhoto[];
  title: string;
  start: ZoomStart;
  /** The photo's place on the page right now, or null if it has none. */
  originOf: (index: number) => ZoomOrigin | null;
  onClose: (index: number) => void;
}) {
  const shop = useShop();
  const [index, setIndex] = useState(() => clamp(start.index, 0, Math.max(0, photos.length - 1)));
  const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
  const [zoomed, setZoomed] = useState(false);
  const [atMax, setAtMax] = useState(false);
  const [sharp, setSharp] = useState<Record<number, true>>({});

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ z: 1, tx: 0, ty: 0 });
  const aspects = useRef(new Map<number, number>());
  const indexRef = useRef(index);
  const closing = useRef(false);

  const photo = photos[index];
  const many = photos.length > 1;

  /** The photo's box when it is shown whole, inside the screen. */
  const fit = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspect = aspects.current.get(indexRef.current) ?? vw / vh;
    const bw = vw / vh > aspect ? vh * aspect : vw;
    return { vw, vh, bw, bh: bw / aspect };
  }, []);

  /** Keep the photo's edges from coming in past the screen's. */
  const bound = useCallback(
    (next: View): View => {
      const { vw, vh, bw, bh } = fit();
      const maxX = Math.max(0, (bw * next.z - vw) / 2);
      const maxY = Math.max(0, (bh * next.z - vh) / 2);
      return { z: next.z, tx: clamp(next.tx, -maxX, maxX), ty: clamp(next.ty, -maxY, maxY) };
    },
    [fit],
  );

  const paint = useCallback((next: View, ms = 0) => {
    view.current = next;
    const el = frame.current;
    if (!el) return;
    el.style.transition = ms > 0 ? `transform ${ms}ms ${EASE}` : "none";
    el.style.transform = `translate3d(${next.tx.toFixed(2)}px, ${next.ty.toFixed(2)}px, 0) scale(${next.z.toFixed(4)})`;
    setZoomed(next.z > 1.01);
    setAtMax(next.z >= MAX_ZOOM - 0.01);
  }, []);

  /** Zoom to `z`, keeping whatever is under the screen point (x, y) under it. */
  const zoomAt = useCallback(
    (z: number, x: number, y: number, ms = 0) => {
      const { vw, vh } = fit();
      const from = view.current;
      const to = clamp(z, 1, MAX_ZOOM);
      const k = to / from.z;
      const cx = x - vw / 2;
      const cy = y - vh / 2;
      paint(bound({ z: to, tx: cx - (cx - from.tx) * k, ty: cy - (cy - from.ty) * k }), ms);
    },
    [bound, fit, paint],
  );

  /** How the photo is drawn in its place on the page, in the zoom's terms. */
  const placed = useCallback(
    (origin: ZoomOrigin) => {
      const { vw, vh, bw, bh } = fit();
      const { rect, focal } = origin;
      const z = Math.max(rect.width / bw, rect.height / bh);
      const left = rect.left - (bw * z - rect.width) * focal.x;
      const top = rect.top - (bh * z - rect.height) * focal.y;
      return {
        view: { z, tx: left + (bw * z) / 2 - vw / 2, ty: top + (bh * z) / 2 - vh / 2 },
        clip: `inset(${rect.top}px ${vw - rect.left - rect.width}px ${vh - rect.top - rect.height}px ${rect.left}px)`,
      };
    },
    [fit],
  );

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setPhase("closing");
    const origin = originOf(indexRef.current);
    const el = surface.current;
    const done = () => onClose(indexRef.current);
    const onScreen =
      origin &&
      origin.rect.width > 0 &&
      origin.rect.top < window.innerHeight &&
      origin.rect.top + origin.rect.height > 0;
    if (el && origin && onScreen) {
      // Back into its place on the page.
      const home = placed(origin);
      paint(home.view, CLOSE_MS);
      el.style.transition = `clip-path ${CLOSE_MS}ms ${EASE}`;
      el.style.clipPath = home.clip;
    } else if (el) {
      el.style.transition = `opacity ${CLOSE_MS}ms`;
      el.style.opacity = "0";
    }
    window.setTimeout(done, CLOSE_MS);
  }, [onClose, originOf, paint, placed]);

  const go = useCallback(
    (by: number) => {
      const next = indexRef.current + by;
      if (next < 0 || next >= photos.length) {
        paint({ z: 1, tx: 0, ty: 0 }, 260);
        return;
      }
      indexRef.current = next;
      setIndex(next);
      paint({ z: 1, tx: 0, ty: 0 });
    },
    [paint, photos.length],
  );

  // Opening: out of the photo's place on the page, in to where it was tapped.
  useLayoutEffect(() => {
    const el = surface.current;
    const origin = originOf(indexRef.current);
    if (origin?.aspect) aspects.current.set(indexRef.current, origin.aspect);
    const { vw, vh, bw, bh } = fit();

    let target: View = { z: 1, tx: 0, ty: 0 };
    if (origin && start.at) {
      // The spot on the photo that was tapped, as a fraction of the photo.
      const home = placed(origin).view;
      const u = (start.at.x - (vw / 2 + home.tx - (bw * home.z) / 2)) / (bw * home.z);
      const v = (start.at.y - (vh / 2 + home.ty - (bh * home.z) / 2)) / (bh * home.z);
      // Always closer than it was on the page, or it would not be a zoom.
      const z = clamp(Math.max(TAP_ZOOM, home.z * 1.4), 1, MAX_ZOOM);
      target = bound({
        z,
        tx: start.at.x - vw / 2 - (u - 0.5) * bw * z,
        ty: start.at.y - vh / 2 - (v - 0.5) * bh * z,
      });
    }

    if (el && origin) {
      const home = placed(origin);
      paint(home.view);
      el.style.transition = "none";
      el.style.clipPath = home.clip;
      // Read once so the starting place is drawn before the move begins.
      void el.offsetWidth;
      el.style.transition = `clip-path ${OPEN_MS}ms ${EASE}`;
      el.style.clipPath = "inset(0px)";
      paint(target, OPEN_MS);
    } else {
      paint(target);
    }
    const timer = window.setTimeout(() => {
      if (!closing.current) setPhase("open");
    }, OPEN_MS);
    return () => window.clearTimeout(timer);
    // Runs once: the zoom is mounted when it opens and unmounted when it closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The page behind holds still and steps back while the zoom is open.
  useEffect(() => {
    shop.holdPage(true);
    root.current?.focus({ preventScroll: true });
    return () => shop.holdPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gestures. Pointer events cover finger, pen and mouse alike.
  useEffect(() => {
    const el = surface.current;
    if (!el) return;

    const points = new Map<number, { x: number; y: number }>();
    type Drag = {
      kind: "drag";
      x: number;
      y: number;
      from: View;
      moved: boolean;
      axis: "x" | "y" | null;
      at: number;
    };
    type Pinch = { kind: "pinch"; distance: number; mx: number; my: number; from: View };
    let gesture: Drag | Pinch | null = null;
    let lastTap: { x: number; y: number; at: number } | null = null;

    const spread = () => {
      const [a, b] = [...points.values()];
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
    };
    const startDrag = (x: number, y: number): Drag => ({
      kind: "drag",
      x,
      y,
      from: { ...view.current },
      moved: false,
      axis: null,
      at: performance.now(),
    });
    const toggleAt = (x: number, y: number) => {
      if (view.current.z > 1.01) paint({ z: 1, tx: 0, ty: 0 }, 320);
      else zoomAt(TAP_ZOOM, x, y, 320);
    };

    const onDown = (e: PointerEvent) => {
      if (closing.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      el.setPointerCapture(e.pointerId);
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size === 1) gesture = startDrag(e.clientX, e.clientY);
      else if (points.size === 2) gesture = { kind: "pinch", ...spread(), from: { ...view.current } };
    };

    const onMove = (e: PointerEvent) => {
      if (closing.current) return;
      // A mouse that is only passing over moves the zoomed photo: the whole
      // photo can be seen by crossing the screen once.
      if (!points.has(e.pointerId)) {
        if (e.pointerType !== "mouse" || view.current.z <= 1.01) return;
        const { vw, vh, bw, bh } = fit();
        const now = view.current;
        const gx = Math.max(0, bw * now.z - vw) / vw;
        const gy = Math.max(0, bh * now.z - vh) / vh;
        paint(bound({ z: now.z, tx: now.tx - e.movementX * gx, ty: now.ty - e.movementY * gy }));
        return;
      }
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!gesture) return;

      if (gesture.kind === "pinch" && points.size >= 2) {
        const now = spread();
        // A little give below the whole photo, taken back on release.
        const z = clamp((gesture.from.z * now.distance) / gesture.distance, 0.8, MAX_ZOOM);
        const { vw, vh } = fit();
        const k = z / gesture.from.z;
        const next = {
          z,
          tx: now.mx - vw / 2 - (gesture.mx - vw / 2 - gesture.from.tx) * k,
          ty: now.my - vh / 2 - (gesture.my - vh / 2 - gesture.from.ty) * k,
        };
        paint(z >= 1 ? bound(next) : next);
        return;
      }
      if (gesture.kind !== "drag") return;

      const dx = e.clientX - gesture.x;
      const dy = e.clientY - gesture.y;
      if (!gesture.moved && Math.hypot(dx, dy) < 8) return;
      gesture.moved = true;
      if (gesture.from.z > 1.01) {
        paint(bound({ z: gesture.from.z, tx: gesture.from.tx + dx, ty: gesture.from.ty + dy }));
        return;
      }
      if (e.pointerType === "mouse") return;
      // At full view a sideways swipe is the next photo and a pull down closes.
      gesture.axis ??= Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (gesture.axis === "x") paint({ z: 1, tx: photos.length > 1 ? dx : dx * 0.25, ty: 0 });
      else paint({ z: 1, tx: 0, ty: Math.max(0, dy) });
    };

    const onUp = (e: PointerEvent) => {
      if (!points.has(e.pointerId)) return;
      const lifted = points.get(e.pointerId)!;
      points.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (closing.current || !gesture) return;

      if (gesture.kind === "pinch") {
        // One finger still down carries on as a drag.
        const [rest] = [...points.values()];
        gesture = rest ? { ...startDrag(rest.x, rest.y), moved: true } : null;
        if (view.current.z < 1) paint({ z: 1, tx: 0, ty: 0 }, 260);
        return;
      }

      const drag = gesture;
      gesture = null;
      if (!drag.moved) {
        if (e.type === "pointercancel") return;
        if (e.pointerType === "mouse") {
          toggleAt(lifted.x, lifted.y);
          return;
        }
        const now = performance.now();
        const again =
          lastTap && now - lastTap.at < 320 && Math.hypot(lifted.x - lastTap.x, lifted.y - lastTap.y) < 36;
        lastTap = again ? null : { x: lifted.x, y: lifted.y, at: now };
        if (again) toggleAt(lifted.x, lifted.y);
        return;
      }
      if (drag.from.z > 1.01) return;
      const dx = lifted.x - drag.x;
      const dy = lifted.y - drag.y;
      if (drag.axis === "x" && Math.abs(dx) > 56) go(dx < 0 ? 1 : -1);
      else if (drag.axis === "y" && dy > 96) close();
      else paint({ z: 1, tx: 0, ty: 0 }, 260);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (closing.current) return;
      zoomAt(view.current.z * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    const onResize = () => paint(bound(view.current));

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
  }, [bound, close, fit, go, paint, photos.length, zoomAt]);

  function onKeyDown(e: React.KeyboardEvent) {
    const { vw, vh } = fit();
    const now = view.current;
    const wide = now.z > 1.01;
    const step = 90;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAt(now.z * 1.5, vw / 2, vh / 2, 240);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomAt(now.z / 1.5, vw / 2, vh / 2, 240);
    } else if (e.key === "0") {
      e.preventDefault();
      paint({ z: 1, tx: 0, ty: 0 }, 240);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowLeft" ? 1 : -1;
      if (wide) paint(bound({ ...now, tx: now.tx + dir * step }), 160);
      else go(-dir);
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && wide) {
      e.preventDefault();
      paint(bound({ ...now, ty: now.ty + (e.key === "ArrowUp" ? step : -step) }), 160);
    } else if (e.key === "Tab" && root.current) {
      // Keep the keyboard inside while the zoom is open.
      const stops = [...root.current.querySelectorAll<HTMLElement>("button")].filter(
        (el) => el.offsetParent !== null,
      );
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (!first || !last) {
        e.preventDefault();
      } else if (e.shiftKey && (at === first || at === root.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (!photo || typeof document === "undefined") return null;

  const centre = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const label = photo.alt || title;

  return createPortal(
    <div
      ref={root}
      className="zoom"
      role="dialog"
      aria-modal="true"
      aria-label={many ? `${title}: photo ${index + 1} of ${photos.length}, zoomed` : `${title}: photo, zoomed`}
      tabIndex={-1}
      data-phase={phase}
      data-zoomed={zoomed ? "" : undefined}
      onKeyDown={onKeyDown}
    >
      <div ref={surface} className="zoom-surface">
        <div ref={frame} className="zoom-photo">
          {/* The copy already on screen, so there is never a blank moment… */}
          <Image
            key={`soft-${photo.url}`}
            src={photo.url}
            alt={label}
            fill
            sizes="(min-width: 1024px) 53vw, 100vw"
            className="object-contain"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                aspects.current.set(index, img.naturalWidth / img.naturalHeight);
              }
            }}
          />
          {/* …and the largest copy there is, for looking closely. */}
          <Image
            key={`sharp-${photo.url}`}
            src={photo.url}
            alt=""
            fill
            sizes="300vw"
            className="zoom-sharp object-contain"
            data-loaded={sharp[index] ? "" : undefined}
            onLoad={() => setSharp((seen) => (seen[index] ? seen : { ...seen, [index]: true }))}
          />
        </div>
      </div>

      <div className="zoom-bar zoom-bar-top">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] tabular-nums" aria-hidden={!many}>
          {many ? `${index + 1} / ${photos.length}` : ""}
        </p>
        <button type="button" className="round-btn" aria-label="Close zoom" onClick={close}>
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      <div className="zoom-bar zoom-bar-bottom">
        {many ? (
          <button
            type="button"
            className="round-btn"
            aria-label="Previous photo"
            aria-disabled={index === 0}
            onClick={() => index > 0 && go(-1)}
          >
            <svg viewBox="0 0 18 10" width="18" height="10" aria-hidden="true" className="-scale-x-100">
              <path d="M0 5h16.5M12.5 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="round-btn"
            aria-label="Zoom out"
            aria-disabled={!zoomed}
            onClick={() => {
              const c = centre();
              zoomAt(view.current.z / 1.6, c.x, c.y, 260);
            }}
          >
            <svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true">
              <path d="M1 5h8" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <button
            type="button"
            className="round-btn"
            aria-label="Zoom in"
            aria-disabled={atMax}
            onClick={() => {
              const c = centre();
              zoomAt(view.current.z * 1.6, c.x, c.y, 260);
            }}
          >
            <svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true">
              <path d="M1 5h8M5 1v8" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>
        {many ? (
          <button
            type="button"
            className="round-btn"
            aria-label="Next photo"
            aria-disabled={index === photos.length - 1}
            onClick={() => index < photos.length - 1 && go(1)}
          >
            <svg viewBox="0 0 18 10" width="18" height="10" aria-hidden="true">
              <path d="M0 5h16.5M12.5 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The mark in a photo's corner that says it can be zoomed. */
export function ZoomMark() {
  return (
    <span className="round-btn zoom-mark" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <circle cx="6.75" cy="6.75" r="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M10.5 10.5 15 15M4.5 6.75h4.5M6.75 4.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </span>
  );
}
