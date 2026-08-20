import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";
import { stockState, type StockState } from "@/lib/inventory/availability";
import { resolveSellableQuantities } from "@/lib/catalog/availability-lookup";
import { getStockThresholds } from "@/lib/settings/store";

/**
 * Storefront catalog reads.
 *
 * These run through the service-role client because `anon` deliberately holds
 * no public-table grants — the storefront is rendered by trusted server code
 * (Security Contract v0.2). That means RLS is bypassed here, so every function
 * in this file is responsible for exposing only customer-safe fields.
 *
 * NEVER select or return: supplier cost, provider credentials, provider
 * settings, internal notes, audit rows, or `variant_financials`
 * (Master Spec §10.4.14, §14.5.8).
 */

/** Customer-safe variant projection. */
export type CatalogVariant = {
  id: string;
  title: string;
  sku: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  position: number;
  isDefault: boolean;
  inventoryMode: Enums<"inventory_mode">;
  isBundle: boolean;
  /** Null means unbounded, not zero. */
  sellableQuantity: number | null;
  stockState: StockState;
  purchasable: boolean;
  options: Record<string, string>;
};

/** Customer-safe product projection. */
export type CatalogProduct = {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  productType: string | null;
  tags: string[];
  status: Enums<"product_status">;
  kind: Enums<"product_kind">;
  seoTitle: string | null;
  seoDescription: string | null;
  variants: CatalogVariant[];
  /** True when no variant can currently be bought. */
  soldOut: boolean;
};

/**
 * Columns that are safe to send to a storefront render. Kept as an explicit
 * list so a future column cannot leak by being added to `select("*")`.
 */
const PRODUCT_COLUMNS =
  "id, handle, title, subtitle, description, product_type, tags, status, kind, seo_title, seo_description";

const VARIANT_COLUMNS =
  "id, product_id, title, sku, price_cents, compare_at_price_cents, currency, position, is_default, active, inventory_mode, track_inventory, continue_selling_when_out_of_stock, low_stock_threshold";

type VariantRow = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  position: number;
  is_default: boolean;
  active: boolean;
  inventory_mode: Enums<"inventory_mode">;
  track_inventory: boolean;
  continue_selling_when_out_of_stock: boolean;
  low_stock_threshold: number;
};

async function resolveOptions(
  variantIds: string[],
): Promise<Map<string, Record<string, string>>> {
  const db = createAdminClient();
  const byVariant = new Map<string, Record<string, string>>();
  if (variantIds.length === 0) return byVariant;

  // Explicit joins rather than a nested PostgREST embed: variant_option_values
  // carries two foreign keys into the option tables, so an embed would need
  // disambiguation and is easy to get subtly wrong.
  const { data: links, error: linkError } = await db
    .from("variant_option_values")
    .select("variant_id, option_id, option_value_id")
    .in("variant_id", variantIds);
  if (linkError) throw linkError;
  if (!links || links.length === 0) return byVariant;

  const optionIds = [...new Set(links.map((l) => l.option_id))];
  const valueIds = [...new Set(links.map((l) => l.option_value_id))];

  const [{ data: options, error: optionError }, { data: values, error: valueError }] =
    await Promise.all([
      db.from("product_options").select("id, name").in("id", optionIds),
      db.from("product_option_values").select("id, value").in("id", valueIds),
    ]);
  if (optionError) throw optionError;
  if (valueError) throw valueError;

  const optionName = new Map((options ?? []).map((o) => [o.id, o.name]));
  const optionValue = new Map((values ?? []).map((v) => [v.id, v.value]));

  for (const link of links) {
    const name = optionName.get(link.option_id);
    const value = optionValue.get(link.option_value_id);
    if (!name || !value) continue;
    const current = byVariant.get(link.variant_id) ?? {};
    current[name] = value;
    byVariant.set(link.variant_id, current);
  }

  return byVariant;
}

async function buildVariants(rows: VariantRow[]): Promise<CatalogVariant[]> {
  const active = rows.filter((r) => r.active);
  const [availability, options, thresholds] = await Promise.all([
    resolveSellableQuantities(active.map((r) => r.id)),
    resolveOptions(active.map((r) => r.id)),
    getStockThresholds(),
  ]);

  return active
    .map((row): CatalogVariant => {
      const sellable = availability.get(row.id) ?? 0;
      return {
        id: row.id,
        title: row.title,
        sku: row.sku,
        priceCents: row.price_cents,
        compareAtPriceCents: row.compare_at_price_cents,
        currency: row.currency,
        position: row.position,
        isDefault: row.is_default,
        inventoryMode: row.inventory_mode,
        isBundle: false,
        sellableQuantity: sellable,
        stockState: stockState(sellable, thresholds),
        purchasable: sellable === null || sellable > 0,
        options: options.get(row.id) ?? {},
      };
    })
    .sort((a, b) => a.position - b.position);
}

/** Fetch one published product by handle, or null. */
export async function getProductByHandle(
  handle: string,
): Promise<CatalogProduct | null> {
  const db = createAdminClient();

  const { data: product, error } = await db
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("handle", handle)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!product) return null;

  const { data: variantRows, error: variantError } = await db
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .eq("product_id", product.id);
  if (variantError) throw variantError;

  const variants = await buildVariants((variantRows ?? []) as VariantRow[]);
  const isBundle = product.kind === "bundle";

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    productType: product.product_type,
    tags: product.tags ?? [],
    status: product.status,
    kind: product.kind,
    seoTitle: product.seo_title,
    seoDescription: product.seo_description,
    variants: variants.map((v) => ({ ...v, isBundle })),
    soldOut: variants.length > 0 && variants.every((v) => !v.purchasable),
  };
}

/** Fetch active products for the Shop All grid. */
export async function listActiveProducts(): Promise<CatalogProduct[]> {
  const db = createAdminClient();

  const { data: products, error } = await db
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "active")
    .order("title");
  if (error) throw error;
  if (!products || products.length === 0) return [];

  const { data: variantRows, error: variantError } = await db
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .in(
      "product_id",
      products.map((p) => p.id),
    );
  if (variantError) throw variantError;

  const allVariants = await buildVariants((variantRows ?? []) as VariantRow[]);
  const byProduct = new Map<string, CatalogVariant[]>();
  for (const row of (variantRows ?? []) as VariantRow[]) {
    const built = allVariants.find((v) => v.id === row.id);
    if (!built) continue;
    const list = byProduct.get(row.product_id) ?? [];
    list.push(built);
    byProduct.set(row.product_id, list);
  }

  return products.map((product): CatalogProduct => {
    const variants = (byProduct.get(product.id) ?? []).map((v) => ({
      ...v,
      isBundle: product.kind === "bundle",
    }));
    return {
      id: product.id,
      handle: product.handle,
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      productType: product.product_type,
      tags: product.tags ?? [],
      status: product.status,
      kind: product.kind,
      seoTitle: product.seo_title,
      seoDescription: product.seo_description,
      variants,
      soldOut: variants.length > 0 && variants.every((v) => !v.purchasable),
    };
  });
}
