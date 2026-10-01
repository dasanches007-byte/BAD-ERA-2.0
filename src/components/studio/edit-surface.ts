import {
  EDIT_ATTR,
  EDIT_KIND_ATTR,
  SECTION_ATTR,
  decodeEditTarget,
  encodeEditTarget,
  type EditTarget,
} from "@/lib/cms/edit-targets";

/**
 * DOM helpers shared by the on-page editor and the Site Editor's preview frame.
 *
 * Both draw the same page (renderSections with `editing`), so both find what
 * the owner pointed at the same way.
 */

export type Marker = "data-be-hover" | "data-be-selected";

/**
 * The editable element under a point, or null.
 *
 * Uses the full stack of elements at the point, not just the topmost: a hero
 * headline sits in a full-width overlay above the photo, and a click on the
 * empty part of that overlay should still reach the photo underneath.
 *
 * Words count only where the words are. A headline is a full-width block, so
 * without this a click on the empty right half of the hero — plainly aimed at
 * the photo — opened the headline instead (found driving the editor).
 */
export function editableAt(x: number, y: number, root: ParentNode): HTMLElement | null {
  const doc = (root as Node).ownerDocument ?? document;
  const seen = new Set<Element>();
  for (const el of doc.elementsFromPoint(x, y)) {
    const hit = el.closest<HTMLElement>(`[${EDIT_ATTR}]`);
    if (!hit || seen.has(hit) || !(root as Node).contains(hit)) continue;
    seen.add(hit);
    if (hitsContent(hit, x, y)) return hit;
  }
  return null;
}

const TEXT_SLOP = 10;

function hitsContent(el: HTMLElement, x: number, y: number): boolean {
  const kind = el.getAttribute(EDIT_KIND_ATTR);
  // Photos, buttons and product grids are their whole box; so is the faint
  // stand-in for an empty field.
  if ((kind !== "text" && kind !== "textarea") || el.hasAttribute("data-be-empty")) return true;
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  for (const r of range.getClientRects()) {
    if (
      x >= r.left - TEXT_SLOP &&
      x <= r.right + TEXT_SLOP &&
      y >= r.top - TEXT_SLOP &&
      y <= r.bottom + TEXT_SLOP
    ) {
      return true;
    }
  }
  return false;
}

export function targetOf(el: Element | null): EditTarget | null {
  return decodeEditTarget(el?.getAttribute(EDIT_ATTR));
}

export function findEditable(root: ParentNode, target: EditTarget): HTMLElement | null {
  const value = encodeEditTarget(target.sectionKey, target.path);
  for (const el of root.querySelectorAll<HTMLElement>(`[${EDIT_ATTR}]`)) {
    if (el.getAttribute(EDIT_ATTR) === value) return el;
  }
  return null;
}

export function findSection(root: ParentNode, sectionKey: string): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(`[${SECTION_ATTR}]`)) {
    if (el.getAttribute(SECTION_ATTR) === sectionKey) return el;
  }
  return null;
}

/** Put a marker on exactly one element (or none), clearing it elsewhere. */
export function mark(root: ParentNode, marker: Marker, el: Element | null): void {
  for (const other of root.querySelectorAll(`[${marker}]`)) {
    if (other !== el) other.removeAttribute(marker);
  }
  if (el && !el.hasAttribute(marker)) el.setAttribute(marker, "");
}

/** True when the element is, or is inside, a link the browser would follow. */
export function insideLink(el: Element | null): boolean {
  return Boolean(el?.closest("a[href]"));
}
