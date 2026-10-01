"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Type straight onto the page (desktop).
 *
 * A text box is laid exactly over the element being edited, wearing that
 * element's computed typography — family, size, weight, tracking, case,
 * colour — so the owner types in the live brand style. The style is copied,
 * never chosen: there is no control here that could change it.
 *
 * The page's own element is never made editable. React owns that DOM, and
 * letting the browser rewrite it under contentEditable is how a refresh throws
 * "removeChild" errors. It is hidden instead (data-be-hidden) and the box sits
 * on top until the saved text has been re-rendered beneath it.
 */

const COPIED_STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontFeatureSettings",
  "fontVariantNumeric",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textAlign",
  "color",
] as const;

type Geometry = {
  top: number;
  left: number;
  width: number;
  height: number;
  style: React.CSSProperties;
  toolbarBelow: boolean;
};

export function InlineTextEditor({
  element,
  label,
  multiline,
  maxLength,
  initialValue,
  status,
  error,
  barHeight,
  landed,
  onLanded,
  onCommit,
  onCancel,
}: {
  element: HTMLElement;
  label: string;
  multiline: boolean;
  maxLength: number;
  initialValue: string;
  /** "saving": committed and waiting for the page to show it. */
  status: "editing" | "saving";
  error: string | null;
  barHeight: number;
  /** The saved text is now in the page render underneath. */
  landed: boolean;
  onLanded: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const committed = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const style: Record<string, string> = {};
      for (const key of COPIED_STYLES) style[key] = computed[key];
      const top = rect.top + window.scrollY;
      setGeometry({
        top,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160),
        height: rect.height,
        style: style as React.CSSProperties,
        toolbarBelow: rect.top < barHeight + 64,
      });
    };
    measure();
    element.setAttribute("data-be-hidden", "");
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      element.removeAttribute("data-be-hidden");
    };
  }, [element, barHeight]);

  // Grow with the text so nothing scrolls inside the box.
  useLayoutEffect(() => {
    const box = area.current;
    if (!box || !geometry) return;
    box.style.height = "auto";
    box.style.height = `${Math.max(box.scrollHeight, geometry.height)}px`;
  }, [value, geometry]);

  useLayoutEffect(() => {
    const box = area.current;
    if (!box || !geometry) return;
    box.focus({ preventScroll: true });
    box.setSelectionRange(box.value.length, box.value.length);
  }, [geometry !== null]); // eslint-disable-line react-hooks/exhaustive-deps -- focus once, when first placed

  // Leave only once the page itself shows the saved words, so the swap from
  // this box to the real element is invisible.
  useEffect(() => {
    if (landed) onLanded();
  }, [landed, onLanded]);

  if (!geometry) return null;

  const commit = () => {
    if (committed.current || status === "saving") return;
    committed.current = true;
    onCommit(value);
  };

  const remaining = maxLength - value.length;
  const near = remaining <= Math.max(5, Math.round(maxLength * 0.1));

  return createPortal(
    <div
      className="absolute z-[80]"
      style={{ top: geometry.top, left: geometry.left, width: geometry.width }}
    >
      <div
        className={`absolute left-0 flex items-center gap-3 whitespace-nowrap border border-line-strong bg-surface-overlay px-3 py-2 shadow-[0_8px_24px_rgb(0_0_0/0.45)] ${
          geometry.toolbarBelow ? "top-full mt-4" : "bottom-full mb-4"
        }`}
        // Keep focus in the text box when the toolbar is pressed.
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className="label text-accent">{label}</span>
        <span
          className={`text-xs tabular-nums ${near ? "text-state-warning" : "text-ink-muted"}`}
          aria-live="polite"
        >
          {value.length} / {maxLength}
        </span>
        <span className="h-4 w-px bg-line-strong" aria-hidden="true" />
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <LockIcon />
          Typeface locked to the brand
        </span>
        <span className="h-4 w-px bg-line-strong" aria-hidden="true" />
        {error ? (
          <span role="alert" className="max-w-xs truncate text-xs text-state-critical" title={error}>
            Not saved — {error}
          </span>
        ) : status === "saving" ? (
          <span className="text-xs text-ink-muted">Saving…</span>
        ) : (
          <span className="text-xs text-ink-subtle">
            {multiline ? "Ctrl + Enter to save · Esc to cancel" : "Enter to save · Esc to cancel"}
          </span>
        )}
        <button
          type="button"
          onClick={commit}
          disabled={status === "saving"}
          className="label ml-1 min-h-9 bg-ink px-3 text-inverse-ink transition-opacity disabled:opacity-60"
        >
          Done
        </button>
      </div>

      <label className="sr-only" htmlFor="be-inline-text">
        {label}
      </label>
      <textarea
        id="be-inline-text"
        ref={area}
        rows={1}
        value={value}
        maxLength={maxLength}
        readOnly={status === "saving"}
        spellCheck
        onChange={(e) => {
          committed.current = false;
          setValue(multiline ? e.target.value : e.target.value.replace(/\n/g, " "));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline outline-1 outline-offset-8 outline-accent-strong focus:outline-accent-strong"
        style={{
          ...geometry.style,
          whiteSpace: multiline ? "pre-wrap" : "normal",
          caretColor: "var(--color-accent-strong)",
        }}
      />
    </div>,
    document.body,
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
