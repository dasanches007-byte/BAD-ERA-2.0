import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { renderSections } from "@/components/sections/render";
import { OwnerEditLink } from "@/components/storefront/owner-edit-link";
import { getProductByHandle } from "@/lib/catalog/queries";
import { DEFAULT_PRODUCT_WORDING, pickSection } from "@/lib/cms/default-pages";
import { readPublishedForStorefront } from "@/lib/cms/pages";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  try {
    const product = await getProductByHandle(handle);
    if (!product) return { title: "Not found" };
    return {
      title: product.seoTitle ?? product.title,
      description: product.seoDescription ?? product.subtitle ?? undefined,
    };
  } catch {
    // Metadata must never take the page down.
    return {};
  }
}

/**
 * Product detail — the shared Editorial Commerce template (Master Spec §5).
 *
 * ONE template renders every product from structured data. Never create a
 * bespoke page per product (Master Spec §10.3.2).
 *
 * Desktop composes gallery and purchase controls as an editorial layout;
 * mobile stacks them naturally. The gallery shows the owner's product photos
 * (Studio → Products → Photos) and follows the chosen variant. The words the
 * pages share ("Details", the Archive 01 lines) are the owner's, from
 * Studio → Site → Product pages; see `ProductPage`.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  // A catalog outage here must NOT render a misleading "not found" — that would
  // tell a customer the product does not exist when it does.
  let product;
  try {
    product = await getProductByHandle(handle);
  } catch (error) {
    console.error("[bad-era] product read failed", { handle, error });
    throw error;
  }

  if (!product) notFound();

  // The shared wording degrades to the shipped words; the product does not.
  const wording = pickSection(
    await readPublishedForStorefront("product"),
    "product.wording",
    DEFAULT_PRODUCT_WORDING,
  );

  return (
    <>
      {renderSections([wording], [], { product })}
      <OwnerEditLink
        pageKey="product"
        label="Edit page wording"
        also={{ href: `/studio/products/${product.id}`, label: "Edit this product" }}
      />
    </>
  );
}
