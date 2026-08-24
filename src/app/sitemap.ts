import type { MetadataRoute } from "next";

import { listActiveProductsCached } from "@/lib/catalog/cache";
import { getPublishedSections } from "@/lib/cms/pages";

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
 *
 * INFORMATION PAGES ARE INCLUDED ONLY ONCE PUBLISHED. Phase 10 QA caught this
 * listing `/about`, `/privacy` and the rest before those routes existed, which
 * pointed crawlers at 404s. The routes exist now, but an unpublished policy
 * page still renders a "not published yet" placeholder, and submitting that to
 * a search engine as canonical content is the same mistake one step later. So
 * each one is listed only when it actually has published sections.
 */
/** Always present, always real content. */
const ALWAYS_INDEXED = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/shop", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/support", priority: 0.4, changeFrequency: "monthly" as const },
];

/** Listed only once the owner has published content for them. */
const CONTENT_PAGES = [
  { pageKey: "about", path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
  { pageKey: "shipping", path: "/shipping", priority: 0.3, changeFrequency: "yearly" as const },
  { pageKey: "returns-policy", path: "/returns-policy", priority: 0.3, changeFrequency: "yearly" as const },
  { pageKey: "privacy", path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
  { pageKey: "terms", path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const now = new Date();

  const entries: MetadataRoute.Sitemap = ALWAYS_INDEXED.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Include an information page only if it has published sections behind it.
  const publishStates = await Promise.all(
    CONTENT_PAGES.map(async (page) => {
      const sections = await getPublishedSections(page.pageKey).catch(() => null);
      return { page, published: Boolean(sections && sections.length > 0) };
    }),
  );

  for (const { page, published } of publishStates) {
    if (!published) continue;
    entries.push({
      url: `${base}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

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
