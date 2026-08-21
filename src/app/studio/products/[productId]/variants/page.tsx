import { notFound } from "next/navigation";

import { PageHeader } from "@/components/studio/primitives";
import { ProductTabs } from "@/components/studio/product-tabs";
import { VariantEditor } from "@/components/studio/variant-editor";
import { getStudioProduct } from "@/lib/studio/products";

export const metadata = { title: "Variants" };

/**
 * Variant matrix (Master Spec §10.3.3).
 *
 * Archive 01 constraints live in the data, not in this screen: the Tee carries
 * S / M / L only and the Crossbody Black / Red / Blue. Nothing here seeds or
 * infers an XL or 2XL.
 */
export default async function StudioVariantsPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getStudioProduct(productId);
  if (!product) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Product"
        title={product.title}
        description="Renaming a variant never changes its stable id, so order history and provider mappings survive the edit."
      />
      <ProductTabs productId={product.id} active="variants" />
      <VariantEditor
        productId={product.id}
        variants={product.variants}
        isBundle={product.kind === "bundle"}
      />
    </div>
  );
}
