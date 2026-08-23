"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Inspector } from "@/components/studio/inspector";
import { StatusChip } from "@/components/studio/primitives";
import type { SaveState } from "@/components/studio/editor-types";
import {
  publishPageAction,
  saveSectionAction,
  setSectionEnabledAction,
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
 *   left    page + ordered section tree, with visibility toggles
 *   center  live draft preview at desktop / tablet / mobile
 *   right   inspector generated from the selected section's schema
 *
 * The preview is a real iframe rendering the draft through the same renderers
 * the public site uses. A mock preview would drift from production; this cannot.
 *
 * Autosave is debounced and always reports Saving / Saved / Error, so the owner
 * is never guessing whether an edit persisted (Master Spec §11.4.5).
 */
export function SiteEditor({
  pageId,
  pageKey,
  revisionId,
  initialSections,
  initialVersions,
  media,
  hasPublished,
}: {
  pageId: string;
  pageKey: string;
  revisionId: string;
  initialSections: Section[];
  /** sectionKey -> version, the optimistic-concurrency token per section. */
  initialVersions: Record<string, number>;
  media: MediaAsset[];
  hasPublished: boolean;
}) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedKey, setSelectedKey] = useState<string>(
    initialSections[0]?.sectionId ?? "",
  );
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, startPublish] = useTransition();
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [conflict, setConflict] = useState(false);
  // Version tokens travel with each save so a stale tab is refused rather than
  // silently overwriting newer edits (Master Spec §13.2).
  const versions = useRef<Record<string, number>>({ ...initialVersions });

  const selected = sections.find((s) => s.sectionId === selectedKey) ?? null;
  const definition = selected ? SECTION_REGISTRY[selected.type] : null;

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear pending debounces on unmount so a late save cannot fire against a
  // revision the owner has already published. The ref is read inside the
  // effect, never during render.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending.values()) clearTimeout(t);
      pending.clear();
    };
  }, []);

  const scheduleSave = useCallback(
    (section: Section) => {
      const existing = timers.current.get(section.sectionId);
      if (existing) clearTimeout(existing);

      setSaveState("saving");
      const handle = setTimeout(async () => {
        const result = await saveSectionAction({
          revisionId,
          sectionKey: section.sectionId,
          payload: section,
          expectedVersion: versions.current[section.sectionId],
        });
        if (result.ok) {
          setSaveState("saved");
          setSaveError(null);
          if (result.version !== undefined) {
            versions.current[section.sectionId] = result.version;
          }
          // Refresh the preview only once the draft is actually persisted.
          setPreviewNonce((n) => n + 1);
        } else {
          setSaveState("error");
          setSaveError(result.message);
          // A conflict is not a transient error — editing on is unsafe until
          // the newer version is loaded, so say so unmistakably.
          if (result.conflict) setConflict(true);
        }
      }, 700);

      timers.current.set(section.sectionId, handle);
    },
    [revisionId],
  );

  function updateField(path: string, next: unknown) {
    if (!selected) return;
    const updated = { ...selected, [path]: next } as Section;
    setSections((prev) =>
      prev.map((s) => (s.sectionId === updated.sectionId ? updated : s)),
    );
    scheduleSave(updated);
  }

  function toggleEnabled(section: Section) {
    const updated = { ...section, enabled: !section.enabled } as Section;
    setSections((prev) =>
      prev.map((s) => (s.sectionId === updated.sectionId ? updated : s)),
    );
    setSaveState("saving");
    void setSectionEnabledAction({
      revisionId,
      sectionKey: updated.sectionId,
      enabled: updated.enabled,
    }).then((result) => {
      if (result.ok) {
        setSaveState("saved");
        setPreviewNonce((n) => n + 1);
      } else {
        setSaveState("error");
        setSaveError(result.message);
      }
    });
  }

  function publish() {
    setPublishMessage(null);
    startPublish(async () => {
      const result = await publishPageAction({ pageId, revisionId });
      setPublishMessage(
        result.ok
          ? "Published. The live site now serves this revision."
          : result.message,
      );
    });
  }

  return (
    <div className="grid gap-px border border-line bg-line xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      {conflict ? (
        <div
          role="alert"
          className="border-b border-state-critical/40 bg-surface-overlay px-6 py-4 xl:col-span-3"
        >
          <p className="label text-state-critical">
            This page changed somewhere else
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Your last edit was not saved, because saving it would have
            overwritten a newer version. Reload to continue from the current
            draft.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="label mt-4 border border-ink/70 px-5 py-2 text-ink transition-colors hover:bg-ink hover:text-inverse-ink"
          >
            Reload the draft
          </button>
        </div>
      ) : null}

      {/* LEFT — section tree */}
      <aside className="bg-surface-raised">
        <header className="border-b border-line px-5 py-4">
          <p className="label text-ink-subtle">Sections</p>
        </header>
        <ul className="p-2">
          {sections.map((section) => {
            const def = SECTION_REGISTRY[section.type as SectionType];
            const active = section.sectionId === selectedKey;
            return (
              <li key={section.sectionId}>
                <div
                  className={`flex items-center justify-between gap-2 rounded-sm px-3 py-2 ${
                    active ? "bg-surface-overlay" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedKey(section.sectionId)}
                    className={`min-w-0 flex-1 text-left text-sm transition-colors ${
                      active ? "text-ink" : "text-ink-muted hover:text-ink"
                    } ${section.enabled ? "" : "line-through opacity-60"}`}
                  >
                    {def?.label ?? section.type}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEnabled(section)}
                    aria-label={
                      section.enabled
                        ? `Hide ${def?.label ?? section.type}`
                        : `Show ${def?.label ?? section.type}`
                    }
                    className="label shrink-0 text-ink-subtle transition-colors hover:text-ink"
                  >
                    {section.enabled ? "Hide" : "Show"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* CENTER — live draft preview */}
      <section className="flex min-w-0 flex-col bg-surface-raised">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-3">
          <div className="flex items-center gap-1">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewport(v)}
                aria-pressed={viewport === v}
                className={`label px-3 py-1.5 transition-colors ${
                  viewport === v
                    ? "bg-surface-overlay text-ink"
                    : "text-ink-subtle hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <SaveIndicator state={saveState} error={saveError} />
        </header>

        <div className="flex-1 overflow-auto bg-void p-5">
          <div
            className="mx-auto origin-top border border-line transition-[width] duration-[var(--animate-duration-base)]"
            style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: "100%" }}
          >
            <iframe
              key={previewNonce}
              // Renders the DRAFT through the real storefront renderers, so the
              // preview cannot drift from what publishing will produce.
              src={`/studio/site/${pageKey}/preview?v=${previewNonce}`}
              title="Draft preview"
              className="h-[70vh] w-full bg-surface"
            />
          </div>
        </div>
      </section>

      {/* RIGHT — schema-generated inspector */}
      <aside className="flex flex-col bg-surface-raised">
        <header className="border-b border-line px-5 py-4">
          <p className="label text-ink-subtle">
            {definition?.label ?? "Inspector"}
          </p>
          {definition ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              {definition.description}
            </p>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {selected && definition ? (
            <Inspector
              fields={definition.fields}
              value={selected as unknown as Record<string, unknown>}
              media={media}
              onChange={updateField}
            />
          ) : (
            <p className="text-sm text-ink-muted">Select a section to edit.</p>
          )}
        </div>

        <footer className="space-y-3 border-t border-line px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <StatusChip tone={hasPublished ? "success" : "warning"}>
              {hasPublished ? "Live" : "Never published"}
            </StatusChip>
            <span className="label text-ink-subtle">Draft</span>
          </div>
          <button
            type="button"
            onClick={publish}
            disabled={publishing || saveState === "saving"}
            className="label w-full border border-ink/70 px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
          {publishMessage ? (
            <p aria-live="polite" className="label text-ink-muted">
              {publishMessage}
            </p>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

function SaveIndicator({
  state,
  error,
}: {
  state: SaveState;
  error: string | null;
}) {
  if (state === "saving") {
    return <span className="label text-ink-subtle">Saving…</span>;
  }
  if (state === "saved") {
    return <span className="label text-state-success">Saved</span>;
  }
  if (state === "error") {
    return (
      <span className="label text-state-critical" title={error ?? undefined}>
        {error ?? "Save failed"}
      </span>
    );
  }
  return <span className="label text-ink-disabled">No changes</span>;
}
