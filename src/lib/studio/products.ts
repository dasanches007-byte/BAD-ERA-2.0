import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { Enums } from "@/lib/db/generated.types";
import type {
  StudioProduct,
  StudioProductRow,
  StudioVariant,
} from "@/lib/studio/product-types";

/**
 * Studio product reads (Master Spec §10.3.2, §10.3.3).
 *
 * Studio sees more than the storefront — draft products, archived products,
 * internal cost — so these queries are separate from `src/lib/catalog/queries`
 * rather than a widened version of them. Cost is only ever read where the
 * screen genuinely shows it, and never leaves the server.
 */

export type {
  StudioProduct,
  StudioProductRow,
  StudioVariant,
} from "@/lib/studio/product-types";
export { INVENTORY_MODE_LABEL } from "@/lib/studio/product-types";

export async function listStudioProducts(): Promise<StudioProductRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("products")
    .select(
      "id, handle, title, status, kind, updated_at, product_variants(id, price_cents, currency, active)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p) => {
    const variants = (p.product_variants ?? []) as {
      id: string;
      price_cents: number;
      currency: string;
      active: boolean;
    }[];
    const active = variants.filter((v) => v.active);
    const prices = active.map((v) => Number(v.price_cents));

    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      status: p.status,
      kind: p.kind,
      variantCount: variants.length,
      priceFromCents: prices.length > 0 ? Math.min(...prices) : null,
      currency: active[0]?.currency ?? "USD",
      updatedAt: p.updated_at,
    };
  });
}

export async function getStudioProduct(
  productId: string,
): Promise<StudioProduct | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("products")
    .select(
      `id, handle, title, subtitle, description, product_type, tags, status, kind,
       seo_title, seo_description, created_at, updated_at,
       product_variants(
         id, title, sku, price_cents, currency, inventory_mode, track_inventory,
         continue_selling_when_out_of_stock, low_stock_threshold, active, position,
         variant_option_values(
           product_options(name),
           product_option_values(value)
         ),
         inventory_levels(available)
       )`,
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const variants: StudioVariant[] = (
    (data.product_variants ?? []) as unknown as RawVariant[]
  )
    .map(toStudioVariant)
    .sort((a, b) => a.position - b.position);

  return {
    id: data.id,
    handle: data.handle,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    productType: data.product_type,
    tags: data.tags ?? [],
    status: data.status,
    kind: data.kind,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    variants,
  };
}

type RawVariant = {
  id: string;
  title: string;
  sku: string | null;
  price_cents: number;
  currency: string;
  inventory_mode: Enums<"inventory_mode">;
  track_inventory: boolean;
  continue_selling_when_out_of_stock: boolean;
  low_stock_threshold: number;
  active: boolean;
  position: number;
  variant_option_values: {
    product_options: { name: string } | null;
    product_option_values: { value: string } | null;
  }[];
  inventory_levels: { available: number | null }[];
};

function toStudioVariant(v: RawVariant): StudioVariant {
  const options: Record<string, string> = {};
  for (const link of v.variant_option_values ?? []) {
    const name = link.product_options?.name;
    const value = link.product_option_values?.value;
    if (name && value) options[name] = value;
  }

  // An untracked variant has no meaningful quantity — report null rather than
  // 0, which would read as "sold out" (Master Spec §10.4.11).
  const available = v.track_inventory
    ? (v.inventory_levels ?? []).reduce((sum, l) => sum + (l.available ?? 0), 0)
    : null;

  return {
    id: v.id,
    title: v.title,
    sku: v.sku,
    priceCents: Number(v.price_cents),
    currency: v.currency,
    inventoryMode: v.inventory_mode,
    trackInventory: v.track_inventory,
    continueSellingWhenOutOfStock: v.continue_selling_when_out_of_stock,
    lowStockThreshold: v.low_stock_threshold,
    active: v.active,
    position: v.position,
    options,
    available,
  };
}
