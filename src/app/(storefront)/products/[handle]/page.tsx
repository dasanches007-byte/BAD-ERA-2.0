import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MediaSlot } from "@/components/ui/media-slot";
import { VariantPicker } from "@/components/storefront/variant-picker";
import { emptyMedia } from "@/lib/cms/sections";
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
 * mobile stacks them naturally.
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
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        {/* Gallery. Multiple images, ordering, alt text and focal metadata all
            arrive from the Media Library in Phase 3. */}
        <div className="grid gap-4">
          <MediaSlot
            media={emptyMedia(product.title, product.title)}
            sizes="(min-width: 1024px) 55vw, 100vw"
            priority
            className="aspect-[4/5] w-full"
          />
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          {isArchive ? (
            <p className="label mb-5 text-ink-subtle">Archive 01</p>
          ) : null}

          <h1 className="font-display text-display-md text-ink-strong">
            {product.title}
          </h1>

          {product.subtitle ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              {product.subtitle}
            </p>
          ) : null}

          <div className="mt-10">
            <VariantPicker product={product} />
          </div>

          {product.description ? (
            <div className="mt-14 border-t border-line pt-8">
              <h2 className="label text-ink-subtle">Details</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                {product.description}
              </p>
            </div>
          ) : null}

          {isArchive ? (
            <p className="label mt-10 text-ink-subtle">
              Limited quantities. Never restocked.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
