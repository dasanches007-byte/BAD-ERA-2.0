import type { MetadataRoute } from "next";

/**
 * robots.txt (Master Spec §19).
 *
 * Studio, the account area, the API and checkout are disallowed. None of them
 * are useful in an index, and account and checkout URLs can carry order
 * identifiers. Studio is additionally served with `X-Robots-Tag: noindex` from
 * middleware — robots.txt is a request, that header is an instruction.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/studio/", "/account", "/api/", "/checkout/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
