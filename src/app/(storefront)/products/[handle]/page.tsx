import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductDetail } from "@/components/storefront/product-detail";
import { getProductByHandle } from "@/lib/catalog/queries";

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
 * (Studio → Products → Photos) and follows the chosen variant.
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

  const isArchive = product.tags.some((t) =>
    t.toLowerCase().includes("archive"),
  );

  return (
    <article className="shell py-14 lg:py-20">
      <ProductDetail
        product={product}
        header={
          <>
            {isArchive ? <p className="label mb-5 text-ink-subtle">Archive 01</p> : null}
            <h1 className="font-display text-display-md text-ink-strong">{product.title}</h1>
            {product.subtitle ? (
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">{product.subtitle}</p>
            ) : null}
          </>
        }
        details={
          <>
            {product.description ? (
              <div className="mt-14 border-t border-line pt-8">
                <h2 className="label text-ink-subtle">Details</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                  {product.description}
                </p>
              </div>
            ) : null}
            {isArchive ? (
              <p className="label mt-10 text-ink-subtle">Limited quantities. Never restocked.</p>
            ) : null}
          </>
        }
      />
    </article>
  );
}
