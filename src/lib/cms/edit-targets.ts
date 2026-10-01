import { SECTION_REGISTRY, type InspectorField } from "@/lib/cms/registry";
import type { Section } from "@/lib/cms/sections";

/**
 * Edit targets: how a click on the page becomes a field in the registry.
 *
 * When a page is rendered for editing, each editable element carries
 * `data-be-edit="<sectionKey>::<path>"`, where `path` names a field the
 * section's REGISTRY definition declares — `headline`, `cta`, `media`, or a
 * repeater item such as `tiles.1.headline`. Nothing else is addressable.
 *
 * That is the guardrail for click-to-edit. A click can only ever open one of
 * the six inspector field kinds the registry already defines (text, textarea,
 * media, cta, productList, repeater); there is no path to a colour, a font, a
 * size, a position, CSS or markup, because no such field exists to resolve to.
 * The server re-validates every save against the Zod schema regardless.
 *
 * The public site never carries these attributes: renderers emit them only
 * when told they are editing, and only owner-gated Studio routes say so.
 *
 * Pure and client-safe: used by the renderers, the on-page editor, the
 * Site Editor and its preview frame alike.
 */

/** Information pages (About, Privacy…): one prose section, started by the owner. */
export const CONTENT_TEMPLATE = "storefront.content";

export const EDIT_ATTR = "data-be-edit";
export const EDIT_KIND_ATTR = "data-be-kind";
export const SECTION_ATTR = "data-be-section";

const SEPARATOR = "::";
const SECTION_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SEGMENT = /^(?:[A-Za-z][A-Za-z0-9]{0,39}|\d{1,2})$/;

export type EditTarget = { sectionKey: string; path: string };

export type ResolvedField = {
  /** The leaf field definition — always one of the registry's six kinds. */
  field: InspectorField;
  /** Owner-facing name of the thing clicked, e.g. "Tile 2 · Headline". */
  label: string;
  /** Owner-facing section name, e.g. "Story grid". */
  sectionLabel: string;
  /** The top-level registry field the Site Editor inspector shows for it. */
  inspectorPath: string;
  value: unknown;
};

export function encodeEditTarget(sectionKey: string, path: string): string {
  return `${sectionKey}${SEPARATOR}${path}`;
}

/** Parse an attribute value, refusing anything that is not a plain target. */
export function decodeEditTarget(raw: string | null | undefined): EditTarget | null {
  if (!raw || raw.length > 200) return null;
  const at = raw.indexOf(SEPARATOR);
  if (at <= 0) return null;
  const sectionKey = raw.slice(0, at);
  const path = raw.slice(at + SEPARATOR.length);
  if (!SECTION_KEY.test(sectionKey)) return null;
  const segments = path.split(".");
  if (segments.length === 0 || segments.length > 3 || !segments.every((s) => SEGMENT.test(s))) {
    return null;
  }
  return { sectionKey, path };
}

const isIndex = (segment: string) => /^\d{1,2}$/.test(segment);

function singular(label: string): string {
  return label.endsWith("s") ? label.slice(0, -1) : label;
}

/**
 * Resolve a path against the section's registry definition.
 *
 * Accepts `field` or `repeater.<index>.<itemField>` and nothing else. Returns
 * null for any path the registry does not declare, so a crafted attribute
 * cannot reach a key the inspector would never offer.
 */
export function resolveEditTarget(section: Section, path: string): ResolvedField | null {
  const definition = SECTION_REGISTRY[section.type];
  if (!definition) return null;

  const segments = path.split(".");
  const top = definition.fields.find((f) => f.path === segments[0]);
  if (!top) return null;
  const record = section as unknown as Record<string, unknown>;

  if (segments.length === 1) {
    if (top.kind === "repeater") return null; // a whole list is not one thing to click
    return {
      field: top,
      label: top.label,
      sectionLabel: definition.label,
      inspectorPath: top.path,
      value: record[top.path],
    };
  }

  if (segments.length === 3 && top.kind === "repeater" && isIndex(segments[1])) {
    const index = Number(segments[1]);
    const items = record[top.path];
    if (!Array.isArray(items) || index >= items.length) return null;
    const leaf = top.fields.find((f) => f.path === segments[2]);
    if (!leaf || leaf.kind === "repeater") return null;
    const item = items[index] as Record<string, unknown>;
    return {
      field: leaf,
      label: `${singular(top.label)} ${index + 1} · ${leaf.label}`,
      sectionLabel: definition.label,
      inspectorPath: top.path,
      value: item?.[leaf.path],
    };
  }

  return null;
}

/**
 * Return a copy of `section` with the field at `path` replaced.
 *
 * Only paths `resolveEditTarget` accepts are applied; anything else returns
 * null and the caller saves nothing. Arrays and objects on the way down are
 * copied, never mutated, so React sees a new value.
 */
export function applyFieldEdit(section: Section, path: string, value: unknown): Section | null {
  if (!resolveEditTarget(section, path)) return null;
  const segments = path.split(".");
  const record = section as unknown as Record<string, unknown>;

  if (segments.length === 1) {
    return { ...record, [segments[0]]: value } as unknown as Section;
  }

  const [listKey, indexText, leafKey] = segments;
  const items = [...(record[listKey] as Record<string, unknown>[])];
  const index = Number(indexText);
  items[index] = { ...items[index], [leafKey]: value };
  return { ...record, [listKey]: items } as unknown as Section;
}

/**
 * Attributes for an element a renderer draws, or nothing when not editing.
 *
 * The path is checked against the registry at render time. A renderer that
 * marks a field the registry does not declare gets no attribute (and a unit
 * test fails), rather than a click that silently does nothing.
 */
export function editAttrs(
  editing: boolean | undefined,
  section: Section,
  path: string,
): Record<string, string> {
  if (!editing) return {};
  const resolved = resolveEditTarget(section, path);
  if (!resolved) return {};
  return {
    [EDIT_ATTR]: encodeEditTarget(section.sectionId, path),
    [EDIT_KIND_ATTR]: resolved.field.kind,
  };
}

// --- Change counting ---------------------------------------------------------

/** JSON with sorted keys and resolved media URLs dropped: content only. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (key, v) => {
    if (key === "url") return undefined;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, (v as Record<string, unknown>)[k]]),
      );
    }
    return v;
  });
}

/** Same content, ignoring key order and resolved media URLs. */
export function sameSectionContent(a: Section, b: Section): boolean {
  return canonical(a) === canonical(b);
}

/**
 * How many sections differ between the draft and what is live.
 *
 * Drives the "Publish 2 changes" button. A never-published page counts every
 * section, because all of it would be new to customers.
 */
export function countChangedSections(draft: Section[], live: Section[] | null): number {
  if (!live) return draft.length;
  const liveById = new Map(live.map((s) => [s.sectionId, canonical(s)]));
  let changed = 0;
  for (const section of draft) {
    if (liveById.get(section.sectionId) !== canonical(section)) changed += 1;
    liveById.delete(section.sectionId);
  }
  return changed + liveById.size;
}
