"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Inspector } from "@/components/studio/inspector";
import { SaveNote } from "@/components/studio/on-page/field-sheet";
import { useSectionAutosave } from "@/components/studio/use-section-autosave";
import { isTrustedMessage, parsePreviewMessage, type EditorToPreview } from "@/lib/cms/edit-messages";
import {
  publishPageAction,
  setSectionEnabledAction,
  startPageContentAction,
} from "@/lib/cms/page-actions";
import { SECTION_REGISTRY } from "@/lib/cms/registry";
import type { Section, SectionType } from "@/lib/cms/sections";
import type { MediaAsset } from "@/lib/studio/media-types";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTH: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};

/**
 * Site Editor — three panes (Master Spec §11.4.1).
 *
 *   left    the page's sections, with visibility toggles
 *   center  the draft, rendered by the real storefront renderers — and
 *           clickable: click any words or photo and the right pane jumps to
 *           that exact field
 *   right   the inspector generated from the selected section's schema
 *
 * The preview is drawn at the true width of the chosen device and scaled to
 * fit, so "Desktop" shows the desktop layout rather than whatever fits the
 * column. After each save the frame re-fetches its server render in place —
 * no reload, so the scroll position stays where the owner was working.
 *
 * Autosave always reports Saving / Saved / Error (Master Spec §11.4.5).
 */
export function SiteEditor({
  pageId,
  pageKey,
  pageTitle,
  liveHref,
  revisionId,
  revisionNumber,
  initialSections,
  initialVersions,
  media,
  hasPublished,
  startable,
}: {
  pageId: string;
  pageKey: string;
  pageTitle: string;
  liveHref: string;
  revisionId: string;
  revisionNumber: number;
  initialSections: Section[];
  /** sectionKey -> version, the optimistic-concurrency token per section. */
  initialVersions: Record<string, number>;
  media: MediaAsset[];
  hasPublished: boolean;
  /** An information page with nothing in it yet: offer to start it. */
  startable: boolean;
}) {
  const router = useRouter();
  const [starting, startStarting] = useTransition();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedKey, setSelectedKey] = useState<string>(initialSections[0]?.sectionId ?? "");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [publishing, startPublish] = useTransition();
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ path: string; at: number } | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);

  const frame = useRef<HTMLIFrameElement>(null);
  const frameBox = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLDivElement>(null);

  const tellPreview = useCallback((message: EditorToPreview) => {
    frame.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const autosave = useSectionAutosave({
    revisionId,
    initialVersions,
    onSaved: () => tellPreview({ type: "be:refresh" }),
  });

  const selected = sections.find((s) => s.sectionId === selectedKey) ?? null;
  const definition = selected ? SECTION_REGISTRY[selected.type] : null;

  // Clicks inside the preview arrive here, from that frame and this origin only.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedMessage(event, { origin: window.location.origin, source: frame.current?.contentWindow })) {
        return;
      }
      const message = parsePreviewMessage(event.data);
      if (message?.type === "be:select") {
        setSelectedKey(message.sectionKey);
        setFocusRequest({ path: message.path, at: event.timeStamp });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Bring the clicked field into view in the inspector, and put the cursor in it.
  useEffect(() => {
    if (!focusRequest || !inspector.current) return;
    const anchor = Array.from(
      inspector.current.querySelectorAll<HTMLElement>("[data-field-path]"),
    ).find((el) => el.getAttribute("data-field-path") === focusRequest.path);
    if (!anchor) return;
    anchor.scrollIntoView({ behavior: "smooth", block: "center" });
    anchor.setAttribute("data-be-flash", "");
    anchor
      .querySelector<HTMLElement>("textarea, input[type=text]")
      ?.focus({ preventScroll: true });
    const timer = setTimeout(() => anchor.removeAttribute("data-be-flash"), 1500);
    return () => clearTimeout(timer);
  }, [focusRequest, selectedKey]);

  // The preview is drawn at the device's real width and scaled to the column.
  useEffect(() => {
    const box = frameBox.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const deviceWidth = VIEWPORT_WIDTH[viewport];
  const scale = frameWidth > 0 ? Math.min(1, frameWidth / deviceWidth) : 1;

  function updateField(path: string, next: unknown) {
    if (!selected) return;
    const updated = { ...selected, [path]: next } as Section;
    setSections((prev) => prev.map((s) => (s.sectionId === updated.sectionId ? updated : s)));
    void autosave.save(updated);
  }

  function selectSection(section: Section) {
    setSelectedKey(section.sectionId);
    tellPreview({ type: "be:highlight", sectionKey: section.sectionId });
  }

  function toggleEnabled(section: Section) {
    const updated = { ...section, enabled: !section.enabled } as Section;
    setSections((prev) => prev.map((s) => (s.sectionId === updated.sectionId ? updated : s)));
    void setSectionEnabledAction({
      revisionId,
      sectionKey: updated.sectionId,
      enabled: updated.enabled,
    }).then((result) => {
      if (result.ok) tellPreview({ type: "be:refresh" });
      else setPublishMessage(result.message);
    });
  }

  function publish() {
    setPublishMessage(null);
    startPublish(async () => {
      if (!(await autosave.flush())) {
        setPublishMessage("A change has not saved yet, so nothing was published.");
        return;
      }
      const result = await publishPageAction({ pageId, revisionId });
      if (!result.ok) {
        setPublishMessage(result.message);
        return;
      }
      // A new draft is opened from what is now live; the editor remounts on it.
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink lg:h-screen">
      {/* Top bar */}
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-raised px-4 py-2 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/studio/site" className="label text-ink-muted transition-colors hover:text-ink">
            ← Site
          </Link>
          <span className="h-4 w-px bg-line-strong" aria-hidden="true" />
          <h1 className="label truncate text-ink">{pageTitle}</h1>
          <span className="label hidden text-ink-subtle sm:inline">Draft {revisionNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-1 hidden sm:block">
            <SaveNote state={autosave.state} error={autosave.error} />
          </div>
          <Link
            href={`/studio/edit/${pageKey}`}
            className="label inline-flex min-h-10 items-center border border-line-strong px-4 text-ink transition-colors hover:border-ink"
          >
            Edit on the page
          </Link>
          <a
            href={liveHref}
            className="label hidden min-h-10 items-center border border-line-strong px-4 text-ink transition-colors hover:border-ink md:inline-flex"
          >
            View live site
          </a>
          <button
            type="button"
            onClick={publish}
            disabled={publishing || autosave.state === "saving"}
            className="label min-h-10 bg-ink px-5 text-inverse-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>

      {autosave.conflict ? (
        <div role="alert" className="border-b border-state-critical/40 bg-surface-overlay px-5 py-4">
          <p className="label text-state-critical">This page changed somewhere else</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Your last edit was not saved, because saving it would have overwritten a newer
            version. Reload to continue from the current draft.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="label mt-3 min-h-10 border border-ink/70 px-5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink"
          >
            Reload the draft
          </button>
        </div>
      ) : null}
      {publishMessage ? (
        <p role="status" className="border-b border-line bg-surface-overlay px-5 py-3 text-sm text-ink-muted">
          {publishMessage}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-px bg-line lg:grid-cols-[15rem_minmax(0,1fr)_24rem]">
        {/* LEFT — sections */}
        <aside className="min-h-0 overflow-y-auto bg-surface-raised">
          <p className="label px-5 pb-3 pt-5 text-ink-subtle">Sections</p>
          <ul className="flex gap-1 overflow-x-auto px-2 pb-3 lg:block lg:space-y-0.5 lg:overflow-visible">
            {sections.map((section) => {
              const def = SECTION_REGISTRY[section.type as SectionType];
              const active = section.sectionId === selectedKey;
              const name = def?.label ?? section.type;
              return (
                <li key={section.sectionId} className="shrink-0">
                  <div
                    className={`flex items-center justify-between gap-2 pl-3 ${
                      active ? "bg-surface-overlay" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectSection(section)}
                      aria-current={active ? "true" : undefined}
                      className={`min-h-11 min-w-0 flex-1 truncate text-left text-sm transition-colors ${
                        active ? "text-ink-strong" : "text-ink-muted hover:text-ink"
                      } ${section.enabled ? "" : "line-through opacity-60"}`}
                    >
                      {name}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(section)}
                      aria-label={section.enabled ? `Hide ${name}` : `Show ${name}`}
                      title={section.enabled ? "Hide on the page" : "Show on the page"}
                      className="flex size-11 shrink-0 items-center justify-center text-ink-subtle transition-colors hover:text-ink"
                    >
                      <EyeIcon off={!section.enabled} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* CENTER — clickable preview */}
        <section className="flex min-h-0 min-w-0 flex-col bg-void">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2">
            <div className="flex items-center gap-1" role="group" aria-label="Preview size">
              {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewport(v)}
                  aria-pressed={viewport === v}
                  className={`label min-h-9 px-3 transition-colors ${
                    viewport === v ? "bg-surface-overlay text-ink" : "text-ink-subtle hover:text-ink"
                  }`}
                >
                  {v === "desktop" ? "Computer" : v === "tablet" ? "Tablet" : "Phone"}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M5 3l14 8-6.5 1.5L10 19z" />
              </svg>
              Click any words or photo in the preview to edit them
            </p>
          </div>
          <div className="min-h-0 flex-1 p-4">
            <div
              ref={frameBox}
              className="relative mx-auto h-[70vh] overflow-hidden border border-line bg-surface lg:h-full"
              style={{ maxWidth: deviceWidth }}
            >
              <iframe
                ref={frame}
                // The DRAFT, through the real storefront renderers, so the
                // preview cannot drift from what publishing will produce.
                src={`/studio/site/${pageKey}/preview`}
                title="Draft preview — click anything to edit it"
                className="absolute left-0 top-0 origin-top-left border-0 bg-surface"
                style={{
                  width: deviceWidth,
                  height: `${100 / scale}%`,
                  transform: `scale(${scale})`,
                }}
              />
            </div>
          </div>
        </section>

        {/* RIGHT — inspector */}
        <aside className="flex min-h-0 flex-col bg-surface-raised">
          <header className="border-b border-line px-5 py-4">
            <p className="label text-ink">{definition?.label ?? "Inspector"}</p>
            {definition ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{definition.description}</p>
            ) : null}
          </header>
          <div ref={inspector} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            {selected && definition ? (
              <Inspector
                fields={definition.fields}
                value={selected as unknown as Record<string, unknown>}
                media={media}
                onChange={updateField}
                onMediaUploaded={() => router.refresh()}
              />
            ) : startable ? (
              <div>
                <p className="text-sm leading-relaxed text-ink-muted">
                  This page is empty. Start it, then write it here or on the page itself. Nothing
                  is filled in for you.
                </p>
                <button
                  type="button"
                  disabled={starting}
                  onClick={() =>
                    startStarting(async () => {
                      const result = await startPageContentAction({ pageId, revisionId });
                      if (result.ok) router.refresh();
                      else setPublishMessage(result.message);
                    })
                  }
                  className="label mt-5 min-h-11 bg-ink px-6 text-inverse-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {starting ? "Starting…" : "Start writing this page"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Select a section, or click something in the preview.</p>
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <span className="label text-ink-subtle">
              {hasPublished ? "Live page · editing a draft" : "Not published yet"}
            </span>
            <div className="sm:hidden">
              <SaveNote state={autosave.state} error={autosave.error} />
            </div>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}
