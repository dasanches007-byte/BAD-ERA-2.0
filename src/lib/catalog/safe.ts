import "server-only";

import type { CatalogProduct } from "@/lib/catalog/queries";

/**
 * Degrade a catalog read instead of blanking the storefront.
 *
 * The editorial parts of the homepage are static content and should still
 * render if the catalog is unreachable. A product rail with no data renders
 * nothing; the brand page survives.
 *
 * This is deliberately narrow: it is for OPTIONAL product surfaces only. Never
 * wrap a checkout, cart, inventory or order read in it — those must fail loudly
 * rather than quietly proceed on partial data.
 */
export async function safeCatalogRead(
  label: string,
  read: () => Promise<CatalogProduct[]>,
): Promise<CatalogProduct[]> {
  try {
    return await read();
  } catch (error) {
    console.error(`[bad-era] catalog read failed (${label}); rendering without it`, error);
    return [];
  }
}
