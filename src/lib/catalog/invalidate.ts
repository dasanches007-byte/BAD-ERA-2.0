import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { CATALOG_CACHE_TAG } from "@/lib/catalog/cache";

/**
 * Make a catalog change visible on the storefront now.
 *
 * The homepage and Shop All read products through a 60-second cache
 * (`catalog/cache.ts`). Revalidating the page paths alone left that cache in
 * place, so a product made live, re-priced or given photos could take a
 * minute to appear — long enough for the owner to think it had not worked.
 * `updateTag` expires it immediately. Server Actions only.
 */
export function invalidateCatalog(handle?: string | null): void {
  updateTag(CATALOG_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/shop");
  if (handle) revalidatePath(`/products/${handle}`);
}
