import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Site Editor drafts and preview.
 *
 * The owner's first Studio session showed "This screen failed to load" inside
 * the preview frame, with Studio's own navigation drawn around it. Two defects:
 *
 *   1. `page_drafts` is one-to-one with `pages`, so PostgREST embeds it as an
 *      OBJECT. The code indexed it as an array (`page_drafts[0]`), always got
 *      undefined, and so every load after the first forked another draft — which
 *      the database refused on `page_drafts_pkey`. The preview, being the second
 *      load, was the first to fail.
 *   2. The preview declared a "bare" nested layout, but a nested layout cannot
 *      remove what its parent draws, so Studio's chrome rendered in the frame.
 *
 * The mock below returns the embed in the shape the live API actually uses.
 */

// --- A minimal PostgREST stand-in ------------------------------------------

type Response = { data: unknown; error: unknown };

const db = vi.hoisted(() => ({
  responses: {} as Record<string, { one?: Response; many?: Response }>,
  writes: [] as string[],
  rpc: vi.fn(),
}));

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of ["select", "eq", "order", "limit"]) chain[method] = self;
  for (const method of ["insert", "update", "upsert", "delete"]) {
    chain[method] = () => {
      db.writes.push(`${method}:${table}`);
      return chain;
    };
  }
  chain.maybeSingle = async () => db.responses[table]?.one ?? { data: null, error: null };
  chain.single = async () => db.responses[table]?.one ?? { data: null, error: null };
  // `await query.order(...)` resolves the many-row response.
  chain.then = (resolve: (r: Response) => unknown) =>
    resolve(db.responses[table]?.many ?? { data: [], error: null });
  return chain;
}

vi.mock("@/lib/db/admin", () => ({
  createAdminClient: () => ({ from: builder, rpc: db.rpc }),
}));

vi.mock("@/lib/auth/studio", () => ({
  getStudioIdentity: async () => ({ userId: "owner-1" }),
}));

const PAGE = {
  id: "page-home",
  page_key: "home",
  title: "Home",
  route: "/",
  published_revision_id: "rev-1",
};

function givenPage(pageDrafts: unknown) {
  db.responses.pages = {
    one: { data: { ...PAGE, page_drafts: pageDrafts }, error: null },
    many: {
      data: [{ ...PAGE, page_drafts: pageDrafts }],
      error: null,
    },
  };
}

beforeEach(() => {
  db.responses = {
    page_revisions: { one: { data: { id: "rev-2", revision_number: 2 }, error: null } },
    page_sections: { many: { data: [], error: null } },
  };
  db.writes = [];
  db.rpc.mockReset();
  db.rpc.mockResolvedValue({ data: "rev-new", error: null });
});

async function pages() {
  return import("@/lib/cms/pages");
}

// --- 1. Reading the draft pointer ------------------------------------------

describe("getOrCreateDraft", () => {
  it("uses the existing draft when PostgREST embeds it as an object", async () => {
    givenPage({ revision_id: "rev-2" });
    const draft = await (await pages()).getOrCreateDraft("home");

    expect(draft?.revisionId).toBe("rev-2");
    // The old code reached ensure/insert here and died on page_drafts_pkey.
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.writes).toEqual([]);
  });

  it("asks the database for a draft when there is none, never inserting itself", async () => {
    givenPage(null);
    const draft = await (await pages()).getOrCreateDraft("home");

    expect(db.rpc).toHaveBeenCalledWith("ensure_page_draft", {
      p_page_id: "page-home",
      p_actor: "owner-1",
    });
    expect(draft?.revisionId).toBe("rev-new");
    // The fork happens inside ensure_page_draft, in one locked transaction.
    expect(db.writes).toEqual([]);
  });

  it("surfaces a database refusal rather than inventing a draft", async () => {
    givenPage(null);
    db.rpc.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect((await pages()).getOrCreateDraft("home")).rejects.toThrow("denied");
  });
});

describe("getExistingDraft (the preview's read)", () => {
  it("returns the draft without writing anything", async () => {
    givenPage({ revision_id: "rev-2" });
    const draft = await (await pages()).getExistingDraft("home");

    expect(draft?.revisionId).toBe("rev-2");
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.writes).toEqual([]);
  });

  it("returns null when there is no draft — it never creates one", async () => {
    givenPage(null);
    expect(await (await pages()).getExistingDraft("home")).toBeNull();
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.writes).toEqual([]);
  });
});

describe("listPages", () => {
  it("reports a draft when the one-to-one embed is present", async () => {
    givenPage({ revision_id: "rev-2", autosaved_at: "2026-10-01T14:37:12Z" });
    const [home] = await (await pages()).listPages();

    // Read as an array this was always false, so the Site list never said
    // "draft in progress".
    expect(home.hasDraft).toBe(true);
    expect(home.draftUpdatedAt).toBe("2026-10-01T14:37:12Z");
  });

  it("reports no draft when the embed is null", async () => {
    givenPage(null);
    const [home] = await (await pages()).listPages();
    expect(home.hasDraft).toBe(false);
    expect(home.draftUpdatedAt).toBeNull();
  });
});

// --- 2. The preview frame's structure ----------------------------------------

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
/** Source with comments removed, so prose explaining a past bug is not code. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const PREVIEW = "src/app/studio/(fullscreen)/site/[page]/preview/page.tsx";

describe("draft preview", () => {
  it("is a read: it never creates a draft", () => {
    const source = code(PREVIEW);
    expect(source).not.toMatch(/getOrCreateDraft|ensure_page_draft|\.insert\(/);
    expect(source).toMatch(/getExistingDraft/);
  });

  it("sits outside the layout that draws Studio's navigation", () => {
    // The gate layout covers every Studio route, the preview included; it must
    // not draw chrome, or the chrome lands inside the preview frame.
    const gate = code("src/app/studio/layout.tsx");
    expect(gate).not.toMatch(/StudioNav|StudioTopBar/);

    // The chrome lives in the workspace group, which the preview is not in.
    expect(read("src/app/studio/(workspace)/layout.tsx")).toMatch(/StudioNav/);
    expect(PREVIEW).not.toContain("(workspace)");
    expect(existsSync(join(ROOT, "src/app/studio/(fullscreen)/layout.tsx"))).toBe(false);
  });

  it("keeps the Studio gate: the preview re-checks identity itself", () => {
    expect(read(PREVIEW)).toMatch(/getStudioIdentityForRender\(\)[\s\S]*notFound\(\)/);
    expect(read("src/app/studio/layout.tsx")).toMatch(/redirect\("\/sign-in/);
    expect(read("src/app/studio/layout.tsx")).toMatch(/MfaChallenge/);
  });

  it("is framed at the same URL the editor points at", () => {
    expect(read("src/components/studio/site-editor.tsx")).toContain(
      "src={`/studio/site/${pageKey}/preview`}",
    );
  });
});
