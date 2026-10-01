import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductLiveBar } from "@/components/studio/product-live-bar";
import { ProductPhotosEditor } from "@/components/studio/product-photos-editor";
import { ProductTabs } from "@/components/studio/product-tabs";
import { LoadError, PageHeader, Panel } from "@/components/studio/primitives";
import { listMedia } from "@/lib/studio/media";
import type { MediaAsset } from "@/lib/studio/media";
import { getProductPhotos } from "@/lib/studio/product-photos";
import type { StudioProductPhoto } from "@/lib/studio/product-photos";
import { getStudioProduct } from "@/lib/studio/products";

export const metadata = { title: "Product photos" };

/**
 * Product editor — Photos.
 *
 * Product photography arrives after the site is built (Master Spec §0.1), so
 * this is where it lands: upload or pick from the Media Library, order, crop
 * point, description, and which choice a photo belongs to. No code change or
 * redeploy, ever.
 */
export default async function ProductPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ productId }, { created }] = await Promise.all([params, searchParams]);
  const product = await getStudioProduct(productId);
  if (!product) notFound();

  let photos: StudioProductPhoto[];
  let library: MediaAsset[];
  try {
    [photos, library] = await Promise.all([getProductPhotos(product.id), listMedia()]);
  } catch (error) {
    console.error("[bad-era] product photos read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Product" title={product.title} />
        <ProductTabs productId={product.id} active="photos" />
        <Panel>
          <LoadError what="this product's photos" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Product"
        title={product.title}
        description={product.subtitle ?? undefined}
        actions={
          product.status === "active" ? (
            <Link
              href={`/products/${product.handle}`}
              target="_blank"
              rel="noreferrer"
              className="label border border-line-strong px-4 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink"
            >
              View
            </Link>
          ) : null
        }
      />

      <ProductTabs productId={product.id} active="photos" />

      {created ? (
        <p role="status" className="border border-state-success/40 bg-surface-raised px-6 py-4 text-sm text-ink">
          Created, with {product.variants.length}{" "}
          {product.variants.length === 1 ? "variant" : "variants"}. Now add its photos.
        </p>
      ) : null}

      <ProductLiveBar
        productId={product.id}
        status={product.status}
        photoCount={photos.length}
        handle={product.handle}
      />

      <div className="max-w-4xl">
        <ProductPhotosEditor
          productId={product.id}
          photos={photos}
          library={library}
          variants={product.variants
            .filter((variant) => variant.active)
            .map((variant) => ({ id: variant.id, title: variant.title }))}
        />
      </div>
    </div>
  );
}
