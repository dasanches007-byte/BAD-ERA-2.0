"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import {
  editableAt,
  findEditable,
  findSection,
  insideLink,
  mark,
  targetOf,
} from "@/components/studio/edit-surface";
import { isTrustedMessage, parseEditorMessage, type PreviewToEditor } from "@/lib/cms/edit-messages";

/**
 * The preview frame's half of click-to-select (Site Editor, option B).
 *
 * Inside the frame: hovering outlines what can be edited, a click tells the
 * Site Editor which field was clicked, and links are held so the preview
 * cannot wander off to another page. From the editor it accepts two
 * requests: re-fetch the draft render (after a save — no full reload, so the
 * scroll position survives) and outline a section the owner picked from the
 * list.
 *
 * Both directions are checked: messages go only to this window's parent at
 * this origin, and only messages from that parent at that origin are heard.
 */
export function PreviewBridge({ rootId }: { rootId: string }) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const frame = useRef(0);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || window.parent === window) return;
    const origin = window.location.origin;
    const post = (message: PreviewToEditor) => window.parent.postMessage(message, origin);

    const onClick = (event: MouseEvent) => {
      const el = editableAt(event.clientX, event.clientY, root);
      if (el || insideLink(event.target as Element)) {
        event.preventDefault();
        event.stopPropagation();
      }
      const target = targetOf(el);
      if (!target) return;
      mark(root, "data-be-selected", el);
      post({ type: "be:select", ...target });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() =>
        mark(root, "data-be-hover", editableAt(event.clientX, event.clientY, root)),
      );
    };
    const onLeave = () => mark(root, "data-be-hover", null);

    const onMessage = (event: MessageEvent) => {
      if (!isTrustedMessage(event, { origin, source: window.parent })) return;
      const message = parseEditorMessage(event.data);
      if (!message) return;
      if (message.type === "be:refresh") {
        startRefresh(() => router.refresh());
      } else if (message.type === "be:highlight") {
        const el = message.path
          ? findEditable(root, { sectionKey: message.sectionKey, path: message.path })
          : null;
        const section = findSection(root, message.sectionKey);
        mark(root, "data-be-selected", el);
        (el ?? section)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // Capture phase, so a link's own handler never sees the click.
    root.addEventListener("click", onClick, true);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("message", onMessage);
    post({ type: "be:ready" });

    return () => {
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("message", onMessage);
    };
  }, [rootId, router]);

  return null;
}
