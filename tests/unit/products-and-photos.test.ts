import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { galleryFor, mainPhoto, photoSlot } from "@/lib/catalog/photos";
import type { CatalogPhoto, CatalogVariant } from "@/lib/catalog/queries";
import { chooseValue, initialVariant, valueStates } from "@/lib/catalog/variant-choice";
import { DEFAULT_HOME_SECTIONS } from "@/lib/cms/default-home";
import {
  ARCHIVE_STARTERS,
  buildCreatePayload,
  checkNewProduct,
  expandSet,
  parsePrice,
  slugify,
  standardOptions,
  type NewProductInput,
  type SetPieceCandidate,
} from "@/lib/studio/new-product-types";

/**
 * Creating products, product photos, and choosing a variant.
 *
 * The database (`studio_create_product`, acceptance case 20) is the real
 * boundary for what a product may be. These tests pin the owner-facing rules
 * that feed it, the Archive 01 starters, the server action's trust boundary,
 * and the product page's option picker, which could not reach most of the
 * Original Era Set's combinations before.
 */

const ROOT = join(__dirname, "..", "..");
const code = (path: string) => readFileSync(join(ROOT, path), "utf8");

const TEE: SetPieceCandidate = {
  productId: "00000000-0000-4000-8000-000000000001",
  title: "BAD ERA Original Tee",
  handle: "bad-era-original-tee",
  productType: "Tee",
  optionNames: ["Size"],
  variants: [
    { id: "tee-s", title: "S", values: ["S"] },
    { id: "tee-m", title: "M", values: ["M"] },
    { id: "tee-l", title: "L", values: ["L"] },
  ],
};

const BAG: SetPieceCandidate = {
  productId: "00000000-0000-4000-8000-000000000002",
  title: "BAD ERA Original Crossbody",
  handle: "bad-era-original-crossbody",
  productType: "Bag",
  optionNames: ["Color"],
  variants: [
    { id: "bag-black", title: "Black", values: ["Black"] },
    { id: "bag-red", title: "Red", values: ["Red"] },
    { id: "bag-blue", title: "Blue", values: ["Blue"] },
  ],
};

function input(patch: Partial<NewProductInput>): NewProductInput {
  return {
    kind: "standard",
    title: "Piece",
    handle: "piece",
    subtitle: "",
    productType: "",
    archive01: false,
    priceCents: 3000,
    sizes: [],
    second: null,
    stock: {},
    pieces: [],
    ...patch,
  };
}

// --- The owner's answers -> options and variants --------------------------------

describe("new product rules", () => {
  it("turns a name into a web address and a typed price into cents", () => {
    expect(slugify("BAD ERA Original Tee")).toBe("bad-era-original-tee");
    expect(slugify("  Café & Co — Set! ")).toBe("cafe-and-co-set");
    expect(parsePrice("$30")).toBe(3000);
    expect(parsePrice("29.5")).toBe(2950);
    expect(parsePrice("1,250.00")).toBe(125000);
    for (const bad of ["", "abc", "30.123", "-5"]) expect(parsePrice(bad)).toBeNull();
  });

  it("orders sizes S-M-L-XL whatever order they were tapped in", () => {
    expect(standardOptions(["XL", "S", "M"], null)).toEqual([
      { name: "Size", values: ["S", "M", "XL"] },
    ]);
  });

  it("builds one variant per combination, with the starting stock typed for each", () => {
    const payload = buildCreatePayload(
      input({
        sizes: ["S", "M"],
        second: { name: "Color", values: ["Black", " Red ", "black", ""] },
        stock: { "S|Black": 4, "M|Red": 2 },
      }),
      [],
    );
    expect(payload.options).toEqual([
      { name: "Size", values: ["S", "M"] },
      // Trimmed, blanks dropped, case-insensitive duplicates removed.
      { name: "Color", values: ["Black", "Red"] },
    ]);
    expect(payload.variants.map((v) => [v.title, v.starting_stock])).toEqual([
      ["S / Black", 4],
      ["S / Red", 0],
      ["M / Black", 0],
      ["M / Red", 2],
    ]);
  });

  it("a product with no choices is one variant", () => {
    const payload = buildCreatePayload(input({}), []);
    expect(payload.options).toEqual([]);
    expect(payload.variants).toEqual([
      { option_values: [], title: "Default", price_cents: 3000, starting_stock: 0 },
    ]);
  });

  it("refuses what a person can fix, in words they can act on", () => {
    expect(checkNewProduct(input({ title: " " }), [])).toContain("Give the product a name.");
    expect(checkNewProduct(input({ handle: "Bad Era" }), [])[0]).toMatch(/web address/);
    expect(checkNewProduct(input({ stock: { "": -1 } }), [])[0]).toMatch(/whole numbers/);
    expect(checkNewProduct(input({ kind: "bundle", pieces: [{ productId: TEE.productId, label: "Tee" }] }), [TEE]))
      .toContain("A set is made of at least two products.");
    expect(
      checkNewProduct(
        input({
          kind: "bundle",
          pieces: [
            { productId: TEE.productId, label: "Piece" },
            { productId: BAG.productId, label: "Piece" },
          ],
        }),
        [TEE, { ...BAG, optionNames: ["Size"] }],
      ),
    ).toContain("Two pieces share a label. Give each piece its own, like Tee and Bag.");
  });
});

describe("a set (bundle)", () => {
  const set = expandSet([
    { label: "Tee", candidate: TEE },
    { label: "Bag", candidate: BAG },
  ]);

  it("offers every tee size with every bag colour", () => {
    expect(set.options).toEqual([
      { name: "Tee Size", values: ["S", "M", "L"] },
      { name: "Bag Color", values: ["Black", "Red", "Blue"] },
    ]);
    expect(set.variants).toHaveLength(9);
  });

  it("records exactly which tee and which bag each choice is made of", () => {
    const mBlue = set.variants.find((v) => v.values.join("/") === "M/Blue");
    expect(mBlue?.componentIds).toEqual(["tee-m", "bag-blue"]);
  });

  it("never gives a set stock of its own", () => {
    const payload = buildCreatePayload(
      input({
        kind: "bundle",
        stock: { "M|Blue": 99 },
        pieces: [
          { productId: TEE.productId, label: "Tee" },
          { productId: BAG.productId, label: "Bag" },
        ],
      }),
      [TEE, BAG],
    );
    expect(payload.kind).toBe("bundle");
    for (const variant of payload.variants) {
      expect(variant.starting_stock).toBeUndefined();
      expect(variant.components).toHaveLength(2);
    }
  });
});

describe("Archive 01 starters", () => {
  it("match the locked contract: names, prices and choices", () => {
    const [tee, bag, set] = ARCHIVE_STARTERS.map((s) => s.input);
    expect([tee.priceCents, bag.priceCents, set.priceCents]).toEqual([3000, 2500, 4500]);
    // The tee is S / M / L only. No starter can ever offer 2XL.
    expect(tee.sizes).toEqual(["S", "M", "L"]);
    expect(bag.second).toEqual({ name: "Color", values: ["Black", "Red", "Blue"] });
    expect(set.kind).toBe("bundle");
    expect(set.pieces.map((p) => p.handle)).toEqual([tee.handle, bag.handle]);
    for (const starter of ARCHIVE_STARTERS) expect(starter.input.archive01).toBe(true);
  });

  it("use the web addresses the homepage's From the Archive section looks for", () => {
    const archive = DEFAULT_HOME_SECTIONS.find((s) => s.type === "archive01.feature");
    expect(archive && "productHandles" in archive ? archive.productHandles : []).toEqual(
      ARCHIVE_STARTERS.map((s) => s.input.handle),
    );
  });

  it("invent no stock counts", () => {
    for (const starter of ARCHIVE_STARTERS) expect("stock" in starter.input).toBe(false);
  });
});

// --- The server action's trust boundary -----------------------------------------

const server = vi.hoisted(() => ({
  identity: { userId: "owner-1" } as { userId: string } | null,
  rpc: vi.fn(),
  AuthError: class StudioAuthorizationError extends Error {},
}));

vi.mock("@/lib/auth/studio", () => ({
  requireStudioOwner: async () => {
    if (!server.identity) throw new server.AuthError();
    return server.identity;
  },
  StudioAuthorizationError: server.AuthError,
}));
vi.mock("@/lib/db/admin", () => ({ createAdminClient: () => ({ rpc: server.rpc }) }));
vi.mock("@/lib/studio/new-product", () => ({ listSetPieceCandidates: async () => [TEE, BAG] }));
vi.mock("@/lib/catalog/invalidate", () => ({ invalidateCatalog: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("createProductAction", () => {
  beforeEach(() => {
    server.identity = { userId: "owner-1" };
    server.rpc.mockReset();
    server.rpc.mockResolvedValue({ data: "new-product-id", error: null });
  });

  it("names the signed-in owner to the database and returns the new id", async () => {
    const { createProductAction } = await import("@/lib/studio/product-actions");
    const result = await createProductAction(input({ title: "Tee", handle: "tee", sizes: ["S"] }));
    expect(result).toEqual({ ok: true, productId: "new-product-id" });
    expect(server.rpc).toHaveBeenCalledWith(
      "studio_create_product",
      expect.objectContaining({ p_actor: "owner-1" }),
    );
  });

  it("reads a set's variant ids on the server; the browser only names products", async () => {
    const { createProductAction } = await import("@/lib/studio/product-actions");
    await createProductAction({
      ...input({
        kind: "bundle",
        title: "Set",
        handle: "set",
        pieces: [
          { productId: TEE.productId, label: "Tee" },
          { productId: BAG.productId, label: "Bag" },
        ],
      }),
      // Anything else a request carries is ignored.
      components: [{ variant_id: "someone-elses-variant" }],
    });
    const payload = server.rpc.mock.calls[0][1].p_product;
    const ids = payload.variants.flatMap((v: { components: { variant_id: string }[] }) =>
      v.components.map((c) => c.variant_id),
    );
    expect(new Set(ids)).toEqual(new Set(["tee-s", "tee-m", "tee-l", "bag-black", "bag-red", "bag-blue"]));
  });

  it("refuses anyone who is not the owner, before touching the database", async () => {
    server.identity = null;
    const { createProductAction } = await import("@/lib/studio/product-actions");
    expect((await createProductAction(input({}))).ok).toBe(false);
    expect(server.rpc).not.toHaveBeenCalled();
  });

  it("explains a taken web address in plain words", async () => {
    server.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "products_handle_key"' },
    });
    const { createProductAction } = await import("@/lib/studio/product-actions");
    expect(await createProductAction(input({}))).toEqual({
      ok: false,
      message: "Another product already uses that web address.",
    });
  });
});

// --- Choosing a variant on the product page -------------------------------------

function variant(id: string, options: Record<string, string>, purchasable = true): CatalogVariant {
  return {
    id,
    title: Object.values(options).join(" / "),
    sku: null,
    priceCents: 4500,
    compareAtPriceCents: null,
    currency: "USD",
    position: 0,
    isDefault: false,
    inventoryMode: "stocked",
    isBundle: true,
    sellableQuantity: purchasable ? 5 : 0,
    stockState: purchasable ? "limited" : "sold_out",
    purchasable,
    options,
  } as CatalogVariant;
}

describe("the option picker", () => {
  const sizes = ["S", "M", "L"];
  const colors = ["Black", "Red", "Blue"];
  const all = sizes.flatMap((size) =>
    colors.map((color) => variant(`${size}-${color}`, { "Tee Size": size, "Bag Color": color })),
  );

  it("reaches every combination of two options (M + Blue was unreachable before)", () => {
    let current = initialVariant(all);
    expect(current?.id).toBe("S-Black");
    current = chooseValue(all, current, "Bag Color", "Blue");
    expect(current?.id).toBe("S-Blue");
    current = chooseValue(all, current, "Tee Size", "M");
    expect(current?.id).toBe("M-Blue");
  });

  it("moves the other choice only when the exact combination is sold out", () => {
    const stock = all.map((v) => (v.id === "M-Blue" ? { ...v, purchasable: false } : v));
    const current = stock.find((v) => v.id === "S-Blue");
    const next = chooseValue(stock, current, "Tee Size", "M");
    expect(next?.options["Tee Size"]).toBe("M");
    expect(next?.purchasable).toBe(true);

    const m = valueStates(stock, current, "Tee Size").find((s) => s.value === "M");
    expect(m).toMatchObject({ available: true, availableWithCurrent: false });
  });

  it("strikes a value through only when it is sold out with everything", () => {
    const stock = all.map((v) => (v.options["Bag Color"] === "Red" ? { ...v, purchasable: false } : v));
    const red = valueStates(stock, stock[0], "Bag Color").find((s) => s.value === "Red");
    expect(red?.available).toBe(false);
  });
});

// --- Product photos on the storefront --------------------------------------------

describe("product photos", () => {
  const shared1: CatalogPhoto = { url: "/a.jpg", alt: "Front", focal: { x: 0.5, y: 0.3 }, variantId: null };
  const blue: CatalogPhoto = { url: "/blue.jpg", alt: "Blue", focal: { x: 0.5, y: 0.5 }, variantId: "blue" };
  const red: CatalogPhoto = { url: "/red.jpg", alt: "Red", focal: { x: 0.5, y: 0.5 }, variantId: "red" };
  const shared2: CatalogPhoto = { url: "/b.jpg", alt: "Back", focal: { x: 0.5, y: 0.5 }, variantId: null };
  const photos = [shared1, red, blue, shared2];

  it("cards show the owner's first photo", () => {
    expect(mainPhoto(photos)).toBe(shared1);
    expect(mainPhoto([])).toBeUndefined();
  });

  it("the gallery leads with the chosen variant's photos and leaves out other variants'", () => {
    expect(galleryFor(photos, "blue")).toEqual([blue, shared1, shared2]);
    expect(galleryFor(photos, undefined)).toEqual([shared1, shared2]);
  });

  it("never shows an empty gallery when every photo belongs to some other variant", () => {
    expect(galleryFor([red], "blue")).toEqual([red]);
  });

  it("a photo keeps its crop point on phone and computer; no photo is the placeholder", () => {
    expect(photoSlot(shared1, "Tee")).toMatchObject({
      url: "/a.jpg",
      alt: "Front",
      focalDesktop: { x: 0.5, y: 0.3 },
      focalMobile: { x: 0.5, y: 0.3 },
    });
    expect(photoSlot(undefined, "Tee")).toMatchObject({ url: null, placeholderLabel: "Tee" });
  });
});

// --- Source guards ---------------------------------------------------------------

describe("guards that live in the source", () => {
  it("every stock change names the owner to the database (it failed for everyone without)", () => {
    for (const file of ["src/lib/studio/inventory-actions.ts", "src/lib/returns/actions.ts"]) {
      const source = code(file);
      const call = source.slice(source.indexOf('rpc("studio_adjust_inventory"'));
      expect(call.slice(0, call.indexOf("});")), file).toMatch(/p_actor:/);
    }
  });

  it("the storefront reads only showable photos, with listed columns", () => {
    const source = code("src/lib/catalog/queries.ts");
    const read = source.slice(source.indexOf("async function resolvePhotos"));
    expect(read).toContain("PUBLIC_BUCKET");
    expect(read).toContain("archived_at");
    expect(read).not.toMatch(/select\("\*"\)/);
  });

  it("a photo still on a product cannot be archived from the Media Library", () => {
    const source = code("src/lib/studio/media-actions.ts");
    const archive = source.slice(source.indexOf("export async function archiveMediaAction"));
    expect(archive).toContain('from("product_media")');
  });

  it("product changes expire the storefront's catalog cache, not just page paths", () => {
    for (const file of ["src/lib/studio/product-actions.ts", "src/lib/studio/product-photo-actions.ts"]) {
      expect(code(file), file).toContain("invalidateCatalog(");
    }
  });
});
