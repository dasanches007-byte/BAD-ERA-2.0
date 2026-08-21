import { ProductCard } from "@/components/storefront/product-card";
import { listActiveProducts } from "@/lib/catalog/queries";
import { safeCatalogRead } from "@/lib/catalog/safe";

export const metadata = {
  title: "Shop All",
  description: "Every BAD ERA piece, current and archive.",
};

export const revalidate = 60;

/**
 * Shop All (Master Spec §4).
 *
 * Editorial header, then a product grid that must accommodate apparel,
 * accessories and future eyewear without redesign. Filtering and sorting stay
 * deliberately minimal — this should read as a campaign, not a marketplace.
 * Those controls arrive with real catalog breadth; shipping empty filter
 * chrome now would be noise.
 */
export default async function ShopPage() {
  const products = await safeCatalogRead("shop", listActiveProducts);

  return (
    <>
      <header className="shell pt-20 pb-14 lg:pt-28 lg:pb-20">
        <p className="label text-ink-subtle">Shop</p>
        <h1 className="mt-6 font-display text-display-lg text-ink-strong">
          All products
        </h1>
      </header>

      <div className="shell pb-section">
        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Zero-result state (Master Spec §20.1). Calm, not an error page. */
function EmptyState() {
  return (
    <div className="hairline flex min-h-[40vh] flex-col items-center justify-center gap-4 bg-surface-raised px-6 text-center">
      <p className="label text-ink-subtle">Nothing here yet</p>
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
        Products appear here as soon as they are published from BAD ERA Studio.
      </p>
    </div>
  );
}
