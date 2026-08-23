import "server-only";

import { unstable_cache } from "next/cache";

import { listActiveProducts } from "@/lib/catalog/queries";
import type { CatalogProduct } from "@/lib/catalog/queries";

/**
 * Cached catalog reads (Master Spec §17 performance, §20).
 *
 * WHY THE CACHE MOVED FROM THE PAGE TO THE DATA (Phase 9):
 *
 * `/` and `/shop` used to be prerendered with `revalidate = 60`. That is
 * incompatible with the nonce-based CSP added in this phase — a page baked at
 * build time cannot carry a per-request nonce, so every one of its script tags
 * would be blocked and the page would serve unhydrated. Verified directly:
 * before this change the homepage rendered 13 script tags with 0 nonces, while
 * a dynamic route rendered 11 of 11 nonced.
 *
 * So the pages render dynamically and the DATABASE READ is cached instead. The
 * database sees the same once-per-minute load it saw under ISR; what is given
 * up is the full-page CDN cache, and what is bought is a CSP that actually
 * constrains script execution on the two most-visited public pages.
 *
 * The `catalog` tag lets a Studio publish drop this immediately rather than
 * waiting out the window.
 */
export const CATALOG_CACHE_TAG = "catalog";
const CATALOG_TTL_SECONDS = 60;

export const listActiveProductsCached = unstable_cache(
  async (): Promise<CatalogProduct[]> => listActiveProducts(),
  ["catalog:active-products"],
  { revalidate: CATALOG_TTL_SECONDS, tags: [CATALOG_CACHE_TAG] },
);
