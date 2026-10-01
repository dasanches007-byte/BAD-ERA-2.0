import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server halves of the editors: photos that actually appear, starting an empty
 * information page, and the owner-only "Edit this page" button.
 *
 * A small PostgREST stand-in records every call, so the tests can assert not
 * only what came back but what was asked — e.g. that photo lookups never reach
 * the private bucket or an archived asset.
 */

type Call = { table: string; op: string; args: unknown[] };
type Response = { data: unknown; error: unknown; count?: number };

const db = vi.hoisted(() => ({
  calls: [] as { table: string; op: string; args: unknown[] }[],
  responses: {} as Record<string, Response | ((calls: Call[]) => Response)>,
  identity: { userId: "owner-1" } as { userId: string } | null,
  getUserCalls: 0,
  cookies: [] as { name: string }[],
  AuthError: class StudioAuthorizationError extends Error {},
}));

function builder(table: string) {
  const record = (op: string) => (...args: unknown[]) => {
    db.calls.push({ table, op, args });
    return chain;
  };
  const resolve = () => {
    const r = db.responses[table];
    const mine = db.calls.filter((c) => c.table === table);
    return Promise.resolve(typeof r === "function" ? r(mine) : (r ?? { data: null, error: null }));
  };
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "eq", "in", "is", "order", "limit", "insert", "update"]) chain[op] = record(op);
  chain.maybeSingle = resolve;
  chain.single = resolve;
  chain.then = (ok: (r: Response) => unknown, fail?: (e: unknown) => unknown) => resolve().then(ok, fail);
  return chain;
}

vi.mock("@/lib/db/admin", () => ({
  createAdminClient: () => ({
    from: builder,
    rpc: vi.fn(),
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
      }),
    },
  }),
}));

vi.mock("@/lib/auth/studio", () => ({
  getStudioIdentity: async () => db.identity,
  getStudioIdentityForRender: async () => {
    db.getUserCalls += 1;
    return db.identity;
  },
  requireStudioOwner: async () => {
    if (!db.identity) throw new db.AuthError();
    return db.identity;
  },
  StudioAuthorizationError: db.AuthError,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => db.cookies }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  db.calls = [];
  db.responses = {};
  db.identity = { userId: "owner-1" };
  db.getUserCalls = 0;
  db.cookies = [];
});

// --- Photos that actually appear -----------------------------------------------

const HERO_PAYLOAD = {
  headline: "BAD ERA",
  supportingLine: "",
  cta: { label: "Shop now", href: "/shop", enabled: true },
  media: {
    mediaAssetId: "11111111-1111-4111-8111-111111111111",
    alt: "Campaign",
    focalDesktop: { x: 0.5, y: 0.4 },
    focalMobile: { x: 0.3, y: 0.4 },
    placeholderLabel: "Home hero",
  },
};

describe("published photos", () => {
  it("resolve to the public URL of their Media Library asset", async () => {
    db.responses.pages = { data: { published_revision_id: "rev-1" }, error: null };
    db.responses.page_sections = {
      data: [
        {
          id: "row-1",
          section_key: "home-hero",
          section_type: "hero.editorial",
          schema_version: 1,
          position: 0,
          enabled: true,
          payload: HERO_PAYLOAD,
          version: 1,
        },
      ],
      error: null,
    };
    db.responses.media_assets = {
      data: [{ id: HERO_PAYLOAD.media.mediaAssetId, bucket: "media-public", storage_path: "2026/a.jpg" }],
      error: null,
    };

    const { getPublishedSections } = await import("@/lib/cms/pages");
    const [hero] = (await getPublishedSections("home"))!;
    expect(hero.type).toBe("hero.editorial");
    expect((hero as { media: { url?: string } }).media.url).toBe(
      "https://project.supabase.co/storage/v1/object/public/media-public/2026/a.jpg",
    );

    // Asked for exactly the referenced asset, public bucket only, not archived.
    const lookups = db.calls.filter((c) => c.table === "media_assets");
    expect(lookups).toContainEqual({ table: "media_assets", op: "in", args: ["id", [HERO_PAYLOAD.media.mediaAssetId]] });
    expect(lookups).toContainEqual({ table: "media_assets", op: "eq", args: ["bucket", "media-public"] });
    expect(lookups).toContainEqual({ table: "media_assets", op: "is", args: ["archived_at", null] });
  });

  it("fall back to the placeholder when the asset is gone or the lookup fails", async () => {
    db.responses.pages = { data: { published_revision_id: "rev-1" }, error: null };
    db.responses.page_sections = {
      data: [{ id: "r", section_key: "home-hero", section_type: "hero.editorial", schema_version: 1, position: 0, enabled: true, payload: HERO_PAYLOAD, version: 1 }],
      error: null,
    };
    db.responses.media_assets = { data: null, error: { message: "down" } };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getPublishedSections } = await import("@/lib/cms/pages");
    const [hero] = (await getPublishedSections("home"))!;
    expect((hero as { media: { url?: string } }).media.url).toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("make no lookup at all when no slot has a photo", async () => {
    db.responses.pages = { data: { published_revision_id: "rev-1" }, error: null };
    db.responses.page_sections = {
      data: [{ id: "r", section_key: "home-hero", section_type: "hero.editorial", schema_version: 1, position: 0, enabled: true, payload: { ...HERO_PAYLOAD, media: { ...HERO_PAYLOAD.media, mediaAssetId: null } }, version: 1 }],
      error: null,
    };
    const { getPublishedSections } = await import("@/lib/cms/pages");
    await getPublishedSections("home");
    expect(db.calls.some((c) => c.table === "media_assets")).toBe(false);
  });
});

// --- Starting an empty information page ----------------------------------------

describe("startPageContentAction", () => {
  const PAGE = { id: "page-privacy", page_key: "privacy", title: "Privacy", template_key: "storefront.content" };
  const DRAFT = { id: "rev-2", page_id: "page-privacy", state: "draft" };

  it("adds one prose section headed with the page title and an EMPTY body", async () => {
    db.responses.pages = { data: PAGE, error: null };
    db.responses.page_revisions = { data: DRAFT, error: null };
    db.responses.page_sections = (calls) =>
      calls.some((c) => c.op === "insert") ? { data: null, error: null } : { data: null, error: null, count: 0 };

    const { startPageContentAction } = await import("@/lib/cms/page-actions");
    expect(await startPageContentAction({ pageId: PAGE.id, revisionId: DRAFT.id })).toEqual({ ok: true });

    const insert = db.calls.find((c) => c.table === "page_sections" && c.op === "insert");
    expect(insert?.args[0]).toEqual({
      revision_id: "rev-2",
      section_key: "privacy-content",
      section_type: "legal.prose",
      schema_version: 1,
      position: 0,
      enabled: true,
      // No placeholder policy wording, ever.
      payload: { heading: "Privacy", meta: "", body: "" },
    });
  });

  it("leaves a page that already has content alone", async () => {
    db.responses.pages = { data: PAGE, error: null };
    db.responses.page_revisions = { data: DRAFT, error: null };
    db.responses.page_sections = { data: null, error: null, count: 1 };
    const { startPageContentAction } = await import("@/lib/cms/page-actions");
    expect(await startPageContentAction({ pageId: PAGE.id, revisionId: DRAFT.id })).toEqual({ ok: true });
    expect(db.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("refuses pages whose sections are fixed by design, like the homepage", async () => {
    db.responses.pages = { data: { ...PAGE, template_key: "storefront.home" }, error: null };
    const { startPageContentAction } = await import("@/lib/cms/page-actions");
    const result = await startPageContentAction({ pageId: PAGE.id, revisionId: DRAFT.id });
    expect(result.ok).toBe(false);
    expect(db.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("refuses a published revision, or a draft of another page", async () => {
    db.responses.pages = { data: PAGE, error: null };
    const { startPageContentAction } = await import("@/lib/cms/page-actions");
    for (const revision of [
      { ...DRAFT, state: "published" },
      { ...DRAFT, page_id: "page-home" },
    ]) {
      db.calls = [];
      db.responses.page_revisions = { data: revision, error: null };
      expect((await startPageContentAction({ pageId: PAGE.id, revisionId: DRAFT.id })).ok).toBe(false);
      expect(db.calls.some((c) => c.op === "insert")).toBe(false);
    }
  });

  it("refuses anyone who is not the Studio owner", async () => {
    db.identity = null;
    const { startPageContentAction } = await import("@/lib/cms/page-actions");
    expect((await startPageContentAction({ pageId: PAGE.id, revisionId: DRAFT.id })).ok).toBe(false);
    expect(db.calls).toEqual([]);
  });
});

// --- "Edit this page" on the live site ------------------------------------------

describe("OwnerEditLink", () => {
  it("costs a visitor without a session nothing — no session lookup at all", async () => {
    db.cookies = [{ name: "_ga" }];
    const { OwnerEditLink } = await import("@/components/storefront/owner-edit-link");
    expect(await OwnerEditLink({ pageKey: "home" })).toBeNull();
    expect(db.getUserCalls).toBe(0);
  });

  it("shows nothing to a signed-in customer who is not the owner", async () => {
    db.cookies = [{ name: "sb-project-auth-token" }];
    db.identity = null;
    const { OwnerEditLink } = await import("@/components/storefront/owner-edit-link");
    expect(await OwnerEditLink({ pageKey: "home" })).toBeNull();
    expect(db.getUserCalls).toBe(1);
  });

  it("links the owner to the on-page editor for this page", async () => {
    db.cookies = [{ name: "sb-project-auth-token.0" }];
    const { OwnerEditLink } = await import("@/components/storefront/owner-edit-link");
    const element = (await OwnerEditLink({ pageKey: "returns-policy" })) as { props: { href: string } };
    expect(element.props.href).toBe("/studio/edit/returns-policy");
  });
});
