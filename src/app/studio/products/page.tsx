import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatMoney,
} from "@/components/studio/primitives";
import { listStudioProducts } from "@/lib/studio/products";
import type { StudioProductRow } from "@/lib/studio/products";

export const metadata = { title: "Products" };

export default async function StudioProductsPage() {
  let products: StudioProductRow[];
  try {
    products = await listStudioProducts();
  } catch (error) {
    console.error("[bad-era] studio products read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Catalog" title="Products" />
        <Panel>
          <LoadError what="products" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Products render from the shared editorial template. Editing one never requires a deploy."
      />

      <Panel>
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            body="Create your first product to start building the catalog. Archive 01 lives here too — the Tee, the Crossbody and the Original Era Set."
          />
        ) : (
          <ul className="divide-y divide-line">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/studio/products/${product.id}`}
                  className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{product.title}</p>
                    <p className="mt-1 truncate text-xs text-ink-subtle">
                      /{product.handle} · {product.variantCount}{" "}
                      {product.variantCount === 1 ? "variant" : "variants"}
                      {product.kind === "bundle" ? " · bundle" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                    <StatusChip tone={statusTone(product.status)}>
                      {product.status}
                    </StatusChip>
                    <span className="text-sm text-ink sm:w-20 sm:text-right">
                      {product.priceFromCents !== null
                        ? formatMoney(product.priceFromCents, product.currency)
                        : "—"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "archived") return "neutral" as const;
  return "warning" as const;
}
