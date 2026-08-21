import Link from "next/link";

import { CartLines } from "@/components/storefront/cart-lines";
import { formatPrice } from "@/components/storefront/product-card";
import { getCart } from "@/lib/cart/service";
import { resolveExistingCartId } from "@/lib/cart/session";

export const metadata = { title: "Cart", robots: { index: false } };

/** A cart is per-visitor state and must never be cached or prerendered. */
export const dynamic = "force-dynamic";

/**
 * Cart (Master Spec §6.1).
 *
 * Prices are re-derived on every render from current variant records, so a
 * Studio price change is reflected immediately. Nothing here is reserved:
 * inventory is only committed at checkout snapshot time.
 */
export default async function CartPage() {
  const cartId = await resolveExistingCartId().catch((error) => {
    console.error("[bad-era] cart session read failed", error);
    return null;
  });

  const cart = cartId
    ? await getCart(cartId).catch((error) => {
        console.error("[bad-era] cart read failed", error);
        return null;
      })
    : null;

  if (!cart || cart.lines.length === 0) return <EmptyCart />;

  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="font-display text-display-md text-ink-strong">Cart</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20">
        <CartLines lines={cart.lines} />

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="hairline bg-surface-raised p-8">
            <h2 className="label text-ink-subtle">Summary</h2>

            <div className="mt-7 flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <span className="text-sm text-ink">
                {formatPrice(cart.subtotalCents, cart.currency)}
              </span>
            </div>

            {/* Shipping is a configured flat rate resolved at checkout. It is
                deliberately not guessed here — quoting a number the store has
                not configured would be a fabricated shipping promise. */}
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
              Flat-rate shipping and any applicable tax are calculated at
              checkout.
            </p>

            {cart.hasBlockingIssues ? (
              <p className="label mt-7 text-state-warning">
                Review the flagged items before checking out
              </p>
            ) : null}

            <Link
              href="/checkout"
              aria-disabled={cart.hasBlockingIssues}
              className={[
                "label mt-8 flex w-full items-center justify-center border px-8 py-5 transition-colors duration-[var(--animate-duration-base)]",
                cart.hasBlockingIssues
                  ? "pointer-events-none border-line text-ink-disabled"
                  : "border-ink/70 text-ink hover:border-ink hover:bg-ink hover:text-inverse-ink",
              ].join(" ")}
            >
              Checkout
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-section">
      <p className="label text-ink-subtle">Cart</p>
      <h1 className="mt-6 font-display text-display-md text-ink-strong">
        Your cart is empty
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted">
        Pieces you add will appear here.
      </p>
      <div className="mt-10">
        <Link
          href="/shop"
          className="label inline-flex items-center border border-ink/70 px-9 py-4 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
        >
          Shop all
        </Link>
      </div>
    </div>
  );
}
