"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SaveState } from "@/components/studio/editor-types";
import { saveSectionAction } from "@/lib/cms/page-actions";
import type { Section } from "@/lib/cms/sections";

/**
 * Debounced, versioned autosave for draft sections — shared by the Site
 * Editor and the on-page editor so both save the same way.
 *
 * Every save carries the section's optimistic-concurrency token (migration
 * 0013); a stale tab is refused rather than overwriting newer work, and the
 * hook raises `conflict` so the UI can say so plainly.
 *
 * A section with an edit not yet confirmed by the server is "dirty". Callers
 * keep their local copy of dirty sections when fresh server data arrives, so
 * a refresh triggered by one save never rolls back what the owner is still
 * typing.
 */
export function useSectionAutosave({
  revisionId,
  initialVersions,
  onSaved,
}: {
  revisionId: string;
  initialVersions: Record<string, number>;
  /** Called after each confirmed save, e.g. to refresh a preview. */
  onSaved?: (sectionKey: string) => void;
}) {
  const versions = useRef<Record<string, number>>({ ...initialVersions });
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, Section>());
  const inFlight = useRef(new Map<string, Promise<boolean>>());
  const dirty = useRef(new Set<string>());
  const onSavedRef = useRef(onSaved);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  // A late save must never fire against a revision that has been published.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending.values()) clearTimeout(t);
      pending.clear();
    };
  }, []);

  const run = useCallback(
    async (sectionKey: string): Promise<boolean> => {
      timers.current.delete(sectionKey);
      // Saves of one section are serialised, so each carries the token the
      // previous one returned.
      await inFlight.current.get(sectionKey);
      const section = latest.current.get(sectionKey);
      if (!section) return true;
      latest.current.delete(sectionKey);

      const attempt = (async () => {
        const result = await saveSectionAction({
          revisionId,
          sectionKey,
          payload: section,
          expectedVersion: versions.current[sectionKey],
        });
        if (result.ok) {
          if (result.version !== undefined) versions.current[sectionKey] = result.version;
          if (!latest.current.has(sectionKey)) dirty.current.delete(sectionKey);
          setError(null);
          setState(dirty.current.size > 0 ? "saving" : "saved");
          onSavedRef.current?.(sectionKey);
          return true;
        }
        setState("error");
        setError(result.message);
        if (result.conflict) setConflict(true);
        return false;
      })();

      inFlight.current.set(sectionKey, attempt);
      const ok = await attempt;
      if (inFlight.current.get(sectionKey) === attempt) inFlight.current.delete(sectionKey);
      return ok;
    },
    [revisionId],
  );

  // Everyone waiting on a section's next save, so a debounce that is
  // superseded by a newer keystroke still resolves its caller.
  const waiters = useRef(new Map<string, ((ok: boolean) => void)[]>());

  const fire = useCallback(
    (key: string): Promise<boolean> => {
      const pending = waiters.current.get(key) ?? [];
      waiters.current.delete(key);
      return run(key).then((ok) => {
        for (const resolve of pending) resolve(ok);
        return ok;
      });
    },
    [run],
  );

  /** Queue a save. `delay` 0 saves now (an inline edit just committed). */
  const save = useCallback(
    (section: Section, delay = 700): Promise<boolean> => {
      const key = section.sectionId;
      latest.current.set(key, section);
      dirty.current.add(key);
      setState("saving");

      const done = new Promise<boolean>((resolve) => {
        waiters.current.set(key, [...(waiters.current.get(key) ?? []), resolve]);
      });
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      if (delay <= 0) {
        timers.current.delete(key);
        void fire(key);
      } else {
        timers.current.set(key, setTimeout(() => void fire(key), delay));
      }
      return done;
    },
    [fire],
  );

  /** Save everything still waiting on its debounce. Used before publishing. */
  const flush = useCallback(async (): Promise<boolean> => {
    const keys = [...timers.current.keys()];
    for (const key of keys) {
      clearTimeout(timers.current.get(key));
      timers.current.delete(key);
    }
    const results = await Promise.all([
      ...keys.map((key) => fire(key)),
      ...inFlight.current.values(),
    ]);
    return results.every(Boolean);
  }, [fire]);

  const isDirty = useCallback((sectionKey: string) => dirty.current.has(sectionKey), []);
  const hasPending = useCallback(() => dirty.current.size > 0, []);

  /** Adopt the server's tokens for sections with nothing pending. */
  const adoptVersions = useCallback((serverVersions: Record<string, number>) => {
    for (const [key, version] of Object.entries(serverVersions)) {
      if (!dirty.current.has(key)) versions.current[key] = version;
    }
  }, []);

  return { save, flush, isDirty, hasPending, adoptVersions, state, error, conflict };
}
