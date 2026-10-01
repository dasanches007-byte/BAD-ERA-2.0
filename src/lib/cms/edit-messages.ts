import { decodeEditTarget } from "@/lib/cms/edit-targets";

/**
 * Messages between the Site Editor and its preview frame.
 *
 * The preview is a same-origin iframe. `postMessage` still crosses a trust
 * boundary in principle — any window holding a reference to either side can
 * post — so both ends accept a message only when it comes from the expected
 * window AND the expected origin, and only in one of these exact shapes.
 * Nothing in a message is ever executed or rendered as markup; the most a
 * message can do is select a section field the registry already declares, or
 * ask the preview to re-fetch its own server render.
 */

export type PreviewToEditor =
  | { type: "be:select"; sectionKey: string; path: string }
  | { type: "be:ready" };

export type EditorToPreview =
  | { type: "be:refresh" }
  | { type: "be:highlight"; sectionKey: string; path?: string };

function record(data: unknown): Record<string, unknown> | null {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : null;
}

export function parsePreviewMessage(data: unknown): PreviewToEditor | null {
  const m = record(data);
  if (!m) return null;
  if (m.type === "be:ready") return { type: "be:ready" };
  if (m.type === "be:select" && typeof m.sectionKey === "string" && typeof m.path === "string") {
    const target = decodeEditTarget(`${m.sectionKey}::${m.path}`);
    return target ? { type: "be:select", ...target } : null;
  }
  return null;
}

export function parseEditorMessage(data: unknown): EditorToPreview | null {
  const m = record(data);
  if (!m) return null;
  if (m.type === "be:refresh") return { type: "be:refresh" };
  if (m.type === "be:highlight" && typeof m.sectionKey === "string") {
    const path = typeof m.path === "string" ? m.path : "headline";
    const target = decodeEditTarget(`${m.sectionKey}::${path}`);
    if (!target) return null;
    return typeof m.path === "string"
      ? { type: "be:highlight", sectionKey: target.sectionKey, path: target.path }
      : { type: "be:highlight", sectionKey: target.sectionKey };
  }
  return null;
}

/** Same window, same origin — or the message is ignored. */
export function isTrustedMessage(
  event: { origin: string; source: unknown },
  expected: { origin: string; source: unknown },
): boolean {
  return (
    expected.source != null &&
    event.source === expected.source &&
    event.origin === expected.origin
  );
}
