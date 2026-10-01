import Link from "next/link";

import { NewProductForm } from "@/components/studio/new-product-form";
import { LoadError, PageHeader, Panel } from "@/components/studio/primitives";
import { listProductHandles, listSetPieceCandidates } from "@/lib/studio/new-product";
import type { SetPieceCandidate } from "@/lib/studio/new-product-types";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  let candidates: SetPieceCandidate[];
  let handles: string[];
  try {
    [candidates, handles] = await Promise.all([listSetPieceCandidates(), listProductHandles()]);
  } catch (error) {
    console.error("[bad-era] new product reads failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Catalog" title="New product" />
        <Panel>
          <LoadError what="the product list" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Catalog"
        title="New product"
        description="It starts hidden from the store. Add its photos, check it, then make it live."
        actions={
          <Link
            href="/studio/products"
            className="label border border-line-strong px-4 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            Cancel
          </Link>
        }
      />
      <div className="max-w-3xl">
        <NewProductForm candidates={candidates} existingHandles={handles} />
      </div>
    </div>
  );
}
