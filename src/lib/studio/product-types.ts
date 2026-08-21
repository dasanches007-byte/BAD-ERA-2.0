import type { Enums } from "@/lib/db/generated.types";

/**
 * Client-safe product types.
 *
 * Separate from `products.ts`, which is `server-only` because it builds the
 * service-role client. Client Components import shapes and label maps from
 * here so the server-only poison pill never reaches a browser bundle.
 */

export type StudioProductRow = {
  id: string;
  handle: string;
  title: string;
  status: Enums<"product_status">;
  kind: Enums<"product_kind">;
  variantCount: number;
  priceFromCents: number | null;
  currency: string;
  updatedAt: string;
};

export type StudioVariant = {
  id: string;
  title: string;
  sku: string | null;
  priceCents: number;
  currency: string;
  inventoryMode: Enums<"inventory_mode">;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  lowStockThreshold: number;
  active: boolean;
  position: number;
  options: Record<string, string>;
  /** Sum of available across locations. Null when the variant is untracked. */
  available: number | null;
};

export type StudioProduct = {
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
  createdAt: string;
  updatedAt: string;
  variants: StudioVariant[];
};

/** Owner-facing inventory mode labels (Master Spec §10.4.10). */
export const INVENTORY_MODE_LABEL: Record<Enums<"inventory_mode">, string> = {
  stocked: "I stock this",
  supplier_stocked: "Supplier stocks this",
  made_to_order: "Made when ordered",
  manual_supplier: "I send orders manually",
  untracked: "Don't track quantity",
  preorder: "Preorder",
};
