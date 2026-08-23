import type { MetadataRoute } from "next";

import { listActiveProductsCached } from "@/lib/catalog/cache";

/**
 * sitemap.xml (Master Spec §19).
 *
 * Public, indexable pages only — Studio, account and checkout are excluded by
 * construction rather than by filtering, so a new Studio route can never leak
 * into the sitemap by being forgotten here.
 *
 * A catalog failure yields the static routes rather than throwing: a sitemap
 * missing its products is a degraded sitemap, but a 500 tells crawlers the
 * whole site is broken.
 */
const STATIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/shop", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/support", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/shipping", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/returns-policy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const products = await listActiveProductsCached();
    for (const product of products) {
      entries.push({
        url: `${base}/products/${product.handle}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("[bad-era] sitemap catalog read failed; serving static routes", error);
  }

  return entries;
}
