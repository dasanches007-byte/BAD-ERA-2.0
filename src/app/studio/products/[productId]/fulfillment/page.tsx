import { notFound } from "next/navigation";

import { InventoryFulfillmentPanel } from "@/components/studio/inventory-fulfillment-panel";
import { PageHeader } from "@/components/studio/primitives";
import { ProductTabs } from "@/components/studio/product-tabs";
import { getProductFulfillment } from "@/lib/fulfillment/product-fulfillment";

export const metadata = { title: "Inventory & Fulfillment" };

/**
 * Inventory & Fulfillment (Master Spec §10.4.9).
 *
 * A dedicated product workspace, not a hidden accordion inside General.
 */
export default async function ProductFulfillmentPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProductFulfillment(productId);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Product"
        title={product.title}
        description="How each variant is stocked and fulfilled. Changing a mode hides the fields that no longer apply rather than leaving them contradictory."
      />
      <ProductTabs productId={product.productId} active="fulfillment" />
      <InventoryFulfillmentPanel product={product} />
    </div>
  );
}
