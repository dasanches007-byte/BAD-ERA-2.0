"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { editableAt, findEditable, insideLink, mark, targetOf } from "@/components/studio/edit-surface";
import { InspectorFieldControl } from "@/components/studio/inspector";
import { MediaField } from "@/components/studio/media-field";
import { FieldSheet, SaveNote, SheetText } from "@/components/studio/on-page/field-sheet";
import { InlineTextEditor } from "@/components/studio/on-page/inline-text-editor";
import { useSectionAutosave } from "@/components/studio/use-section-autosave";
import {
  applyFieldEdit,
  resolveEditTarget,
  sameSectionContent,
  type EditTarget,
  type ResolvedField,
} from "@/lib/cms/edit-targets";
import { publishPageAction, startPageContentAction } from "@/lib/cms/page-actions";
import type { MediaSlot, Section } from "@/lib/cms/sections";
import type { MediaAsset } from "@/lib/studio/media-types";

/**
 * The on-page editor — "edit right on the live site" on a computer, and "tap,
 * then edit in a sheet" on a phone. One component, because it is one idea.
 *
 * The page inside is the real storefront render of the DRAFT (renderSections
 * with `editing`), passed in as server-rendered children. Clicking or tapping
 * anything marked editable opens the control for exactly that registry field:
 *
 *   computer, short text  →  type in place, in the brand style
 *   phone, or any other   →  the sheet: words, a photo, a button, products
 *
 * Every change autosaves to the draft and the page re-renders from the server
 * a moment later, so what the owner sees is always what was saved — never a
 * client-side imitation of the page. Customers see none of it until Publish.
 */

const BAR_HEIGHT = 60;
const REVEAL_MS = 2600;

type Active = {
  target: EditTarget;
  mode: "inline" | "sheet";
  element: HTMLElement;
  /** The clicked element uses the display serif — the sheet mirrors it. */
  displayFace: boolean;
};

type InlineState =
  | { phase: "editing" }
  | { phase: "saving"; value: string };

type Hover = { label: string; top: number; left: number };

export function OnPageEditor({
  pageId,
  pageKey,
  pageTitle,
  liveHref,
  revisionId,
  sections: serverSections,
  versions,
  media,
  changedCount,
  hasPublished,
  startable,
  children,
}: {
  pageId: string;
  pageKey: string;
  pageTitle: string;
  liveHref: string;
  revisionId: string;
  sections: Section[];
  versions: Record<string, number>;
  media: MediaAsset[];
  changedCount: number;
  hasPublished: boolean;
  /** An information page with nothing in it yet: offer to start it. */
  startable: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const canvas = useRef<HTMLDivElement>(null);
  const [refreshing, startRefresh] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [starting, startStarting] = useTransition();

  // Edits not yet reflected by the server render. Shown in the controls until
  // the server catches up, so a refresh never rolls back typing in progress.
  const [overrides, setOverrides] = useState<Record<string, Section>>({});
  const sections = useMemo(
    () =>
      serverSections.map((server) => {
        const local = overrides[server.sectionId];
        return local && !sameSectionContent(local, server) ? local : server;
      }),
    [serverSections, overrides],
  );

  const [active, setActive] = useState<Active | null>(null);
  const [inline, setInline] = useState<InlineState>({ phase: "editing" });
  const [hover, setHover] = useState<Hover | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [history, setHistory] = useState<Section[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(() => consumePublishedNotice());

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverFrame = useRef(0);
  const lastEdit = useRef<{ key: string; at: number } | null>(null);

  const refreshPage = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => startRefresh(() => router.refresh()), 120);
  }, [router]);

  const autosave = useSectionAutosave({
    revisionId,
    initialVersions: versions,
    onSaved: refreshPage,
  });

  const say = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // --- Applying an edit ------------------------------------------------------

  const applyEdit = useCallback(
    (target: EditTarget, value: unknown, delay?: number): Promise<boolean> | null => {
      const current = sections.find((s) => s.sectionId === target.sectionKey);
      if (!current) return null;
      const next = applyFieldEdit(current, target.path, value);
      if (!next) return null;

      // One undo step per field per burst of typing, not one per keystroke.
      const key = `${target.sectionKey}::${target.path}`;
      const now = Date.now();
      if (!lastEdit.current || lastEdit.current.key !== key || now - lastEdit.current.at > 2000) {
        setHistory((h) => [...h.slice(-29), current]);
      }
      lastEdit.current = { key, at: now };

      setOverrides((o) => ({ ...o, [next.sectionId]: next }));
      return autosave.save(next, delay);
    },
    [sections, autosave],
  );

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    lastEdit.current = null;
    setOverrides((o) => ({ ...o, [previous.sectionId]: previous }));
    void autosave.save(previous, 0);
    setActive(null);
    say("Undone.");
  }

  // --- Choosing what to edit -------------------------------------------------

  const open = useCallback(
    (el: HTMLElement) => {
      const target = targetOf(el);
      if (!target) return;
      const section = sections.find((s) => s.sectionId === target.sectionKey);
      const resolved = section ? resolveEditTarget(section, target.path) : null;
      if (!resolved) return;

      const { field } = resolved;
      const typesInPlace =
        (field.kind === "text" || (field.kind === "textarea" && field.maxLength <= 400)) &&
        window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;

      setHover(null);
      setInline({ phase: "editing" });
      setActive({
        target,
        mode: typesInPlace ? "inline" : "sheet",
        element: el,
        displayFace: el.classList.contains("font-display"),
      });

      if (!typesInPlace && window.innerWidth < 768) {
        // Lift what is being edited above the sheet — and below the site's
        // own sticky header, which would otherwise cover it (seen on a phone:
        // the headline scrolled to sit underneath the menu).
        const header = canvas.current?.querySelector<HTMLElement>("header.sticky");
        const covered = BAR_HEIGHT + (header?.offsetHeight ?? 0);
        const top = el.getBoundingClientRect().top + window.scrollY - covered - 16;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    },
    [sections],
  );

  const reveal = useCallback(() => {
    const root = canvas.current;
    if (!root) return;
    root.classList.add("be-reveal");
    setTimeout(() => root.classList.remove("be-reveal"), REVEAL_MS);
  }, []);

  function onClickCapture(event: React.MouseEvent) {
    const root = canvas.current;
    if (!root) return;
    const followingLink = insideLink(event.target as Element);

    if (previewing) {
      if (followingLink) {
        event.preventDefault();
        event.stopPropagation();
        say("Links are paused while you edit. Use Exit to browse the site.");
      }
      return;
    }

    // Nothing on the page navigates or submits while editing.
    event.preventDefault();
    event.stopPropagation();

    const el =
      editableAt(event.clientX, event.clientY, root) ??
      (event.target as Element).closest<HTMLElement>("[data-be-edit]");
    if (el) {
      open(el);
    } else {
      setActive(null);
      reveal();
      if (followingLink) say("Links are paused while you edit. Use Exit to browse the site.");
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (previewing || event.pointerType !== "mouse") return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = requestAnimationFrame(() => {
      const root = canvas.current;
      if (!root) return;
      const el = editableAt(clientX, clientY, root);
      mark(root, "data-be-hover", el);
      setHover(el ? describeHover(el, sections) : null);
    });
  }

  function onPointerLeave() {
    cancelAnimationFrame(hoverFrame.current);
    if (canvas.current) mark(canvas.current, "data-be-hover", null);
    setHover(null);
  }

  // --- Effects: DOM markers, keyboard, page lifecycle -------------------------

  // The selected element keeps its outline across re-renders of the page.
  useEffect(() => {
    const root = canvas.current;
    if (!root) return;
    mark(root, "data-be-selected", active && !previewing ? findEditable(root, active.target) : null);
  }, [active, previewing, serverSections]);

  // On arrival, show what can be edited (touch screens have no hover).
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) reveal();
  }, [reveal]);

  // Scrolling moves the page under a hover label; drop it.
  useEffect(() => {
    const clear = () => setHover(null);
    window.addEventListener("scroll", clear, { passive: true });
    return () => window.removeEventListener("scroll", clear);
  }, []);

  // Ctrl/Cmd+Z undoes the last edit when no text box has focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as Element | null)?.closest("input, textarea, select");
      if (!typing && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        document.getElementById("be-undo")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before leaving with a save still in flight.
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (autosave.hasPending()) event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [autosave]);

  // --- Publishing ------------------------------------------------------------

  function publish() {
    setConfirming(false);
    setActive(null);
    startPublish(async () => {
      const saved = await autosave.flush();
      if (!saved) {
        say("A change has not saved yet, so nothing was published. Try again in a moment.");
        return;
      }
      const result = await publishPageAction({ pageId, revisionId });
      if (!result.ok) {
        say(result.message);
        return;
      }
      rememberPublishedNotice();
      // A new draft is opened from what is now live; the editor remounts on it.
      router.refresh();
    });
  }

  // --- Render ----------------------------------------------------------------

  const activeSection = active ? sections.find((s) => s.sectionId === active.target.sectionKey) : undefined;
  const resolved = active && activeSection ? resolveEditTarget(activeSection, active.target.path) : null;
  const serverSection = active ? serverSections.find((s) => s.sectionId === active.target.sectionKey) : undefined;
  const serverValue =
    active && serverSection ? resolveEditTarget(serverSection, active.target.path)?.value : undefined;
  const inlineLanded = inline.phase === "saving" && serverValue === inline.value;

  const pending = autosave.state === "saving" || publishing;
  const changes = changedCount;

  return (
    <div
      className="min-h-screen bg-surface text-ink"
      style={{ "--be-bar-height": `${BAR_HEIGHT}px` } as React.CSSProperties}
    >
      <EditBar
        pageTitle={pageTitle}
        pageKey={pageKey}
        liveHref={liveHref}
        changes={changes}
        hasPublished={hasPublished}
        saveState={autosave.state}
        saveError={autosave.error}
        canUndo={history.length > 0}
        previewing={previewing}
        publishing={publishing}
        pending={pending}
        onUndo={undo}
        onTogglePreview={() => {
          setActive(null);
          setPreviewing((p) => !p);
        }}
        onPublish={() => setConfirming(true)}
      />

      {startable ? (
        <div className="border-b border-line bg-surface-raised px-5 py-10 text-center">
          <h2 className="font-display text-display-sm text-ink-strong">This page is empty</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            Start it, then tap the text to write it. Nothing is filled in for you — the words
            on a policy page should be yours.
          </p>
          <button
            type="button"
            disabled={starting}
            onClick={() =>
              startStarting(async () => {
                const result = await startPageContentAction({ pageId, revisionId });
                if (!result.ok) say(result.message);
                else router.refresh();
              })
            }
            className="label mt-6 min-h-12 bg-ink px-8 text-inverse-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start writing this page"}
          </button>
        </div>
      ) : null}

      {autosave.conflict ? (
        <div role="alert" className="border-b border-state-critical/40 bg-surface-overlay px-5 py-4">
          <p className="label text-state-critical">This page changed somewhere else</p>
          <p className="mt-2 text-sm text-ink-muted">
            Your last edit was not saved, because it would have overwritten a newer version — perhaps
            from another tab. Reload to carry on from the latest draft.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="label mt-3 min-h-11 border border-ink/70 px-5 text-ink hover:bg-ink hover:text-inverse-ink"
          >
            Reload the draft
          </button>
        </div>
      ) : null}

      <div
        ref={canvas}
        className={`be-canvas ${previewing ? "be-previewing" : "be-editable"}`}
        onClickCapture={onClickCapture}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        aria-busy={refreshing}
      >
        {children}
      </div>

      {hover && !active ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[75] -translate-y-full bg-ink px-2.5 py-1 text-[11px] font-medium tracking-wide text-inverse-ink"
          style={{ top: hover.top, left: hover.left }}
        >
          {hover.label}
        </div>
      ) : null}

      {active?.mode === "inline" && resolved ? (
        <InlineTextEditor
          key={`${active.target.sectionKey}::${active.target.path}`}
          element={active.element}
          label={resolved.label}
          multiline={resolved.field.kind === "textarea"}
          maxLength={"maxLength" in resolved.field ? resolved.field.maxLength : 200}
          initialValue={String(resolved.value ?? "")}
          status={inline.phase}
          error={inline.phase === "saving" ? null : autosave.state === "error" ? autosave.error : null}
          barHeight={BAR_HEIGHT}
          landed={inlineLanded}
          onLanded={() => setActive(null)}
          onCancel={() => setActive(null)}
          onCommit={(value) => {
            if (value === String(resolved.value ?? "")) {
              setActive(null);
              return;
            }
            setInline({ phase: "saving", value });
            const saving = applyEdit(active.target, value, 0);
            void saving?.then((ok) => {
              if (!ok) setInline({ phase: "editing" });
            });
            // If the page never re-renders (offline), do not trap the owner.
            setTimeout(() => setActive((a) => (a === active ? null : a)), 10000);
          }}
        />
      ) : null}

      {active?.mode === "sheet" && resolved && activeSection ? (
        <FieldSheet
          title={resolved.label}
          context={`${resolved.sectionLabel} · ${pageTitle}`}
          saveState={autosave.state}
          saveError={autosave.error}
          onClose={() => setActive(null)}
        >
          <SheetBody
            resolved={resolved}
            path={active.target.path}
            media={media}
            displayFace={active.displayFace}
            onChange={(value) => void applyEdit(active.target, value)}
            onUploaded={refreshPage}
          />
        </FieldSheet>
      ) : null}

      {confirming ? (
        <PublishConfirm
          changes={changes}
          onCancel={() => setConfirming(false)}
          onConfirm={publish}
        />
      ) : null}

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4 transition-opacity duration-300 ${
          toast ? "opacity-100" : "opacity-0"
        }`}
      >
        {toast ? (
          <p className="max-w-md border border-line-strong bg-surface-overlay px-5 py-3 text-sm text-ink shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// --- Pieces ------------------------------------------------------------------

function SheetBody({
  resolved,
  path,
  media,
  displayFace,
  onChange,
  onUploaded,
}: {
  resolved: ResolvedField;
  path: string;
  media: MediaAsset[];
  displayFace: boolean;
  onChange: (value: unknown) => void;
  onUploaded: () => void;
}) {
  const { field } = resolved;
  switch (field.kind) {
    case "text":
    case "textarea":
      return (
        <SheetText
          label="Words"
          value={String(resolved.value ?? "")}
          maxLength={field.maxLength}
          multiline={field.kind === "textarea"}
          hint={field.hint}
          displayFace={displayFace}
          onChange={onChange}
        />
      );
    case "media":
      return (
        <MediaField
          label={resolved.label}
          value={resolved.value as MediaSlot | undefined}
          media={media}
          onChange={onChange}
          onUploaded={onUploaded}
        />
      );
    default:
      return (
        <InspectorFieldControl
          field={field}
          path={path}
          value={resolved.value}
          media={media}
          onChange={onChange}
          onMediaUploaded={onUploaded}
        />
      );
  }
}

function EditBar({
  pageTitle,
  pageKey,
  liveHref,
  changes,
  hasPublished,
  saveState,
  saveError,
  canUndo,
  previewing,
  publishing,
  pending,
  onUndo,
  onTogglePreview,
  onPublish,
}: {
  pageTitle: string;
  pageKey: string;
  liveHref: string;
  changes: number;
  hasPublished: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  canUndo: boolean;
  previewing: boolean;
  publishing: boolean;
  pending: boolean;
  onUndo: () => void;
  onTogglePreview: () => void;
  onPublish: () => void;
}) {
  const status =
    saveState === "saving" || saveState === "error"
      ? null
      : changes > 0
        ? {
            long: `${changes} unpublished change${changes === 1 ? "" : "s"}`,
            short: `${changes} change${changes === 1 ? "" : "s"}`,
          }
        : hasPublished
          ? { long: "Everything here is live", short: "All live" }
          : { long: "Not published yet", short: "Not live" };

  return (
    <div
      className="sticky top-0 z-[70] flex items-center justify-between gap-3 border-b border-line-strong bg-surface-overlay px-3 sm:px-5"
      style={{ height: BAR_HEIGHT }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="size-2 shrink-0 rounded-full bg-state-warning" aria-hidden="true" />
        <div className="min-w-0">
          <p className="label truncate text-ink">
            {previewing ? "Preview" : "Editing"}
            <span className="hidden text-ink-muted sm:inline"> · {pageTitle}</span>
          </p>
          <div className="truncate text-[11px] leading-tight text-ink-muted">
            {status ? (
              <>
                <span className="sm:hidden">{status.short}</span>
                <span className="hidden sm:inline">{status.long}</span>
              </>
            ) : (
              <SaveNote state={saveState} error={saveError} />
            )}
          </div>
        </div>
      </div>

      <p className="hidden min-w-0 flex-1 truncate text-center text-xs text-ink-subtle xl:block">
        {previewing
          ? "This is how customers will see it once published."
          : "Click any words or photo to change them. Customers see nothing until you publish."}
      </p>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          id="be-undo"
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          className="flex size-11 items-center justify-center border border-line-strong text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:border-line-strong"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onTogglePreview}
          aria-pressed={previewing}
          aria-label={previewing ? "Back to editing" : "Preview as a customer"}
          title={previewing ? "Back to editing" : "Preview as a customer"}
          className={`flex size-11 items-center justify-center border transition-colors md:w-auto md:gap-2 md:px-4 ${
            previewing ? "border-ink bg-ink text-inverse-ink" : "border-line-strong text-ink hover:border-ink"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          <span className="label hidden md:inline">{previewing ? "Edit" : "Preview"}</span>
        </button>
        <Link
          href={`/studio/site/${pageKey}`}
          className="label hidden min-h-11 items-center border border-line-strong px-4 text-ink transition-colors hover:border-ink lg:inline-flex"
        >
          All fields
        </Link>
        <a
          href={liveHref}
          className="label inline-flex min-h-11 items-center border border-line-strong px-3 text-ink transition-colors hover:border-ink sm:px-4"
        >
          Exit
        </a>
        <button
          type="button"
          onClick={onPublish}
          disabled={pending || (changes === 0 && hasPublished)}
          className="label min-h-11 bg-ink px-4 text-inverse-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
        >
          {publishing ? "Publishing…" : changes > 0 ? `Publish${changes > 1 ? ` ${changes}` : ""}` : "Publish"}
        </button>
      </div>
    </div>
  );
}

function PublishConfirm({
  changes,
  onCancel,
  onConfirm,
}: {
  changes: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirm.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-void/70 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="be-publish-title"
        aria-describedby="be-publish-body"
        className="w-full max-w-md border border-line-strong bg-surface-overlay p-6"
      >
        <h2 id="be-publish-title" className="font-display text-display-sm text-ink-strong">
          Publish to your live site?
        </h2>
        <p id="be-publish-body" className="mt-3 text-sm leading-relaxed text-ink-muted">
          Customers will see {changes > 0 ? `${changes} change${changes === 1 ? "" : "s"}` : "this page"} right away.
          If you change your mind, Studio → Publishing can put the previous version back.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="label min-h-12 border border-line-strong px-6 text-ink hover:border-ink"
          >
            Not yet
          </button>
          <button
            ref={confirm}
            type="button"
            onClick={onConfirm}
            className="label min-h-12 bg-ink px-6 text-inverse-ink hover:opacity-90"
          >
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}

function describeHover(el: HTMLElement, sections: Section[]): Hover | null {
  const target = targetOf(el);
  const section = target ? sections.find((s) => s.sectionId === target.sectionKey) : undefined;
  const resolved = section && target ? resolveEditTarget(section, target.path) : null;
  if (!resolved) return null;
  const rect = el.getBoundingClientRect();
  const media = resolved.field.kind === "media";
  return {
    label: `${resolved.label} · click to ${media ? "change" : "edit"}`,
    top: Math.max(rect.top + (media ? 18 : -6), BAR_HEIGHT + 26),
    left: Math.max(8, rect.left + (media ? 18 : 0)),
  };
}

const PUBLISHED_FLAG = "be:published";

function rememberPublishedNotice() {
  try {
    sessionStorage.setItem(PUBLISHED_FLAG, "1");
  } catch {
    // Private mode: the notice is a nicety.
  }
}

function consumePublishedNotice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (sessionStorage.getItem(PUBLISHED_FLAG)) {
      sessionStorage.removeItem(PUBLISHED_FLAG);
      return "Published. Your changes are live.";
    }
  } catch {
    // Storage blocked.
  }
  return null;
}
