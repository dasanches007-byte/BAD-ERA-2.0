import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTION_LABEL,
  PUBLISH_SET_LABEL,
  PUBLISH_SET_TONE,
  REVISION_LABEL,
  REVISION_TONE,
  auditActionLabel,
  hasPendingChanges,
} from "@/lib/cms/publishing-types";
import type { PublishingPage } from "@/lib/cms/publishing-types";

/**
 * Phase 8 — publishing and version control invariants (Master Spec §13).
 *
 * Two kinds of assertion here:
 *
 *   - static, on the source of the publishing modules, because the boundaries
 *     that matter (what a Server Action exposes, what a query selects, what
 *     never gets deleted) are properties of the code and can be checked the day
 *     they break, with no database
 *   - pure, on the label and pending-change helpers
 */

function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const SOURCE_FILES = walk("src");

/** Files carrying the "use server" directive: every export is a network endpoint. */
const SERVER_ACTION_FILES = SOURCE_FILES.filter((file) =>
  /^\s*["']use server["']/.test(readFileSync(file, "utf8")),
);

/**
 * The guard vocabulary actually in use across the codebase.
 *
 * `requireStudioOwner` / `getAccountIdentity` are the two real boundaries;
 * `assertOwner` / `owner` / `studioOwner` are the local wrappers each action
 * module defines around the first of them.
 */
const GUARD =
  /\b(requireStudioOwner|getAccountIdentity|assertOwner|studioOwner|owner)\(/;

/**
 * Action modules whose exports are reachable without a signed-in identity, by
 * design. Both are deliberate and neither touches Studio data:
 *
 *   auth/actions   sign-in IS the thing that establishes identity
 *   cart/actions   guest carts are anonymous until checkout; prices are
 *                  server-derived and `cart_items` stores only variant and
 *                  quantity, so there is nothing here to authorize against
 *
 * Adding to this list is a security decision. The test names the reason so it
 * cannot be extended silently.
 */
const INTENTIONALLY_PUBLIC = new Set([
  "src/lib/auth/actions.ts",
  "src/lib/cart/actions.ts",
]);

/** Split a module into its exported async functions, name -> body. */
function exportedActions(source: string): Map<string, string> {
  const starts = [...source.matchAll(/export\s+async\s+function\s+(\w+)/g)].map(
    (m) => ({ name: m[1], index: m.index ?? 0 }),
  );

  const bodies = new Map<string, string>();
  for (const [i, entry] of starts.entries()) {
    const end = starts[i + 1]?.index;
    bodies.set(entry.name, source.slice(entry.index, end));
  }
  return bodies;
}

describe("server action surface", () => {
  it("finds the action modules it is meant to be guarding", () => {
    // A regex that silently matched nothing would make every assertion below
    // vacuously pass.
    expect(SERVER_ACTION_FILES.length).toBeGreaterThan(0);
    expect(SERVER_ACTION_FILES).toContain("src/lib/cms/page-actions.ts");
    expect(SERVER_ACTION_FILES).toContain("src/lib/cms/publish-set-actions.ts");
  });

  /**
   * Every exported async function in a "use server" module is callable by any
   * browser that can reach the app. An exported helper without an authorization
   * check is therefore a hole in the boundary, not a private function — which
   * is why `commitPagePublish` and friends live in `publish-core.ts` behind
   * `server-only` instead of being exported from the action module.
   */
  it.each(SERVER_ACTION_FILES.filter((f) => !INTENTIONALLY_PUBLIC.has(f)))(
    "%s authorizes every exported action",
    (file) => {
      const actions = exportedActions(code(file));
      expect(actions.size).toBeGreaterThan(0);

      for (const [name, body] of actions) {
        // An action may authorize directly, or delegate to a sibling action in
        // the same module that does — `setInventoryAction` is a thin wrapper
        // over `adjustInventoryAction`, which holds the guard.
        const delegates = [...actions.keys()].some(
          (other) => other !== name && body.includes(`${other}(`),
        );

        expect(
          GUARD.test(body) || delegates,
          `${file}: exported action ${name} must check authorization`,
        ).toBe(true);
      }
    },
  );

  it("keeps the shared publish internals off the action surface", () => {
    const core = code("src/lib/cms/publish-core.ts");
    expect(readFileSync("src/lib/cms/publish-core.ts", "utf8")).toMatch(
      /^import "server-only";/,
    );
    // Checked against comment-stripped source: this module's own doc comment
    // legitimately explains why it is NOT a "use server" file.
    expect(core).not.toMatch(/["']use server["']/);
  });
});

describe("publishing reads", () => {
  const READS = ["src/lib/cms/publishing.ts", "src/lib/cms/pages.ts"];

  it.each(READS)("%s never uses select(*)", (file) => {
    expect(code(file)).not.toMatch(/\.select\(\s*["'`]\*/);
  });

  /**
   * `audit_events` carries before/after blobs written by every subsystem —
   * inventory adjustments, refunds, fulfillment. The publishing console shows
   * who did what, and has no business reading those payloads into a page.
   */
  it("never reads raw audit state blobs", () => {
    const source = code("src/lib/cms/publishing.ts");
    expect(source).not.toContain("before_state");
    expect(source).not.toContain("after_state");
  });
});

describe("history is append-only", () => {
  const CMS_FILES = SOURCE_FILES.filter((f) => f.startsWith("src/lib/cms/"));

  /**
   * Master Spec §13.1: rollback republishes an older revision as a NEW one, and
   * history is never erased. A delete against `page_revisions` or
   * `page_sections` would break that, so no CMS module is allowed to issue one.
   *
   * `page_drafts` deletes are fine and expected — that table is a POINTER to
   * the working revision, not the content. Clearing it is what makes the next
   * edit start a fresh revision instead of mutating live.
   */
  it.each(CMS_FILES)("%s deletes no revision or section", (file) => {
    const source = code(file);
    expect(source).not.toMatch(/\.from\(\s*["'`]page_revisions["'`]\s*\)\s*\.delete\(/);
    expect(source).not.toMatch(/\.from\(\s*["'`]page_sections["'`]\s*\)\s*\.delete\(/);
  });

  it("rollback forks a new revision rather than moving the pointer back", () => {
    const source = code("src/lib/cms/page-actions.ts");
    const start = source.indexOf("export async function rollbackPageAction");
    const body = source.slice(start);
    expect(body).toContain("forkRevisionToDraft");
    // The restored content is published as the forked revision, never the
    // historical one.
    expect(body).toMatch(/revisionId:\s*forked\.revisionId/);
  });
});

describe("publish sets", () => {
  const source = code("src/lib/cms/publish-set-actions.ts");

  /**
   * A set is only reversible because it records where each page pointed before
   * it. Without `previous_revision_id`, rollback would have nothing to restore.
   */
  it("records the previous revision for every page it moves", () => {
    const core = code("src/lib/cms/publish-core.ts");
    expect(core).toContain("previous_revision_id: item.previousRevisionId");
  });

  /**
   * Every change to live goes through `recordPublishSet` — a single-page
   * publish from the Site Editor, a multi-page publish, and a rollback alike.
   * A path that moved the live pointer without recording a set would be a
   * change the owner cannot see in publish history or undo.
   */
  it.each([
    ["src/lib/cms/page-actions.ts", "publishPageAction"],
    ["src/lib/cms/page-actions.ts", "rollbackPageAction"],
    ["src/lib/cms/publish-set-actions.ts", "publishPagesAction"],
    ["src/lib/cms/publish-set-actions.ts", "rollbackPublishSetAction"],
  ])("%s: %s records a publish set", (file, action) => {
    const source = code(file);
    const start = source.indexOf(`export async function ${action}`);
    expect(start).toBeGreaterThan(-1);

    const next = [...source.matchAll(/export\s+async\s+function\s+\w+/g)]
      .map((m) => m.index ?? 0)
      .find((i) => i > start);
    const body = source.slice(start, next);

    expect(body).toContain("recordPublishSet(");
    expect(body).toMatch(/previousRevisionId/);
  });

  /**
   * Master Spec §11.4.5 / §13.3: a set that would put an invalid page live
   * publishes nothing. Validation of the whole set therefore has to complete
   * before the first pointer moves.
   */
  it("validates the whole set before the first page goes live", () => {
    const validateAt = source.indexOf("validateRevisionForPublish");
    const commitAt = source.indexOf("commitPagePublish({");
    expect(validateAt).toBeGreaterThan(-1);
    expect(commitAt).toBeGreaterThan(-1);
    expect(validateAt).toBeLessThan(commitAt);
  });

  /**
   * A rollback that overwrote a page published AFTER the set would silently
   * destroy newer work. Those pages are skipped and named instead.
   */
  it("skips pages that have moved on since the set", () => {
    const start = source.indexOf("export async function rollbackPublishSetAction");
    const body = source.slice(start);
    expect(body).toContain("page.published_revision_id !== item.revision_id");
    expect(body).toContain("skippedPageKeys");
  });
});

describe("pending changes", () => {
  const base: PublishingPage = {
    pageId: "p1",
    pageKey: "home",
    title: "Home",
    route: "/",
    live: null,
    draft: null,
  };

  it("is false with no draft", () => {
    expect(hasPendingChanges(base)).toBe(false);
  });

  it("is true for a first publish", () => {
    expect(
      hasPendingChanges({
        ...base,
        draft: {
          revisionId: "r1",
          revisionNumber: 1,
          autosavedAt: "2026-01-01T00:00:00Z",
          sectionCount: 3,
        },
      }),
    ).toBe(true);
  });

  /**
   * An empty draft cannot be published — `validateRevisionForPublish` refuses a
   * revision with no sections. Queuing it would offer the owner a button that
   * can only fail.
   */
  it("is false for an empty draft", () => {
    expect(
      hasPendingChanges({
        ...base,
        draft: {
          revisionId: "r1",
          revisionNumber: 1,
          autosavedAt: "2026-01-01T00:00:00Z",
          sectionCount: 0,
        },
      }),
    ).toBe(false);
  });
});

describe("status labels", () => {
  /**
   * Semantic colour is never used alone (Master Spec §10.4.19), so every tone
   * must have a label beside it.
   */
  it("pairs every publish-set tone with a label", () => {
    expect(Object.keys(PUBLISH_SET_TONE).sort()).toEqual(
      Object.keys(PUBLISH_SET_LABEL).sort(),
    );
    for (const label of Object.values(PUBLISH_SET_LABEL)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("pairs every revision tone with a label", () => {
    expect(Object.keys(REVISION_TONE).sort()).toEqual(
      Object.keys(REVISION_LABEL).sort(),
    );
  });

  it("covers every audited publishing action", () => {
    const emitted = [
      ...code("src/lib/cms/page-actions.ts").matchAll(/action:\s*"([\w.]+)"/g),
      ...code("src/lib/cms/publish-set-actions.ts").matchAll(/action:\s*"([\w.]+)"/g),
    ].map((m) => m[1]);

    expect(emitted.length).toBeGreaterThan(0);
    for (const action of emitted) {
      expect(
        AUDIT_ACTION_LABEL[action],
        `audit action ${action} has no human label`,
      ).toBeDefined();
    }
  });

  it("degrades unknown actions to the raw key rather than throwing", () => {
    expect(auditActionLabel("something.unmapped")).toBe("something.unmapped");
  });
});
