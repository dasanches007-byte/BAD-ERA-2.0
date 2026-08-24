import Link from "next/link";

export const metadata = { title: "Checkout cancelled", robots: { index: false } };

// Dynamic so the per-request CSP nonce reaches this page's scripts.
export const dynamic = "force-dynamic";

/**
 * Stripe cancel landing (Master Spec §6.3).
 *
 * This page changes NO state. It does not release the reservation and it does
 * not cancel the checkout session — a browser hitting a URL is not a decision.
 * The reservation is released by `checkout.session.expired` from Stripe, or by
 * the abandoned-checkout sweep, both of which are verified server-side.
 *
 * That means the customer's stock is still held for now, which is exactly what
 * they want if they came here by mis-clicking and intend to go back.
 */
export default function CheckoutCancelledPage() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-20 lg:py-28">
      <div className="max-w-xl">
        <p className="label text-ink-subtle">Checkout</p>
        <h1 className="mt-6 font-display text-display-md text-ink-strong">
          You didn&rsquo;t complete checkout
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-muted">
          Nothing was charged. Your cart is exactly as you left it.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/cart"
            className="label inline-flex items-center border border-ink/70 px-8 py-3.5 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
          >
            Back to cart
          </Link>
          <Link
            href="/shop"
            className="label inline-flex items-center px-4 py-3.5 text-ink-subtle transition-colors hover:text-ink"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
