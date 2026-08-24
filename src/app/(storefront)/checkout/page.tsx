import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/storefront/checkout-form";
import { formatPrice } from "@/components/storefront/product-card";
import { getAccountIdentity } from "@/lib/account/session";
import { getCart } from "@/lib/cart/service";
import { resolveExistingCartId } from "@/lib/cart/session";

export const metadata = { title: "Checkout", robots: { index: false } };

/** Per-visitor state, and it must carry a CSP nonce. Never prerendered. */
export const dynamic = "force-dynamic";

/**
 * Checkout details (Master Spec §6.2, Kickoff v0.2 §3).
 *
 * This is the step between the cart and Stripe. It collects contact and
 * shipping details, then the SERVER performs the whole invariant:
 *
 *   durable checkout snapshot -> inventory reservation -> Stripe session
 *
 * Nothing is reserved by opening this page. The order summary is re-derived
 * from current variant records on every render, exactly as the cart is, so a
 * price or availability change between cart and checkout is visible here rather
 * than being discovered after payment.
 */
export default async function CheckoutPage() {
  const cartId = await resolveExistingCartId().catch((error) => {
    console.error("[bad-era] checkout cart session read failed", error);
    return null;
  });

  // A cart read failure must NOT degrade to an empty cart here. `safeCatalogRead`
  // exists for optional editorial surfaces; on a commerce path a swallowed
  // failure would show "your cart is empty" to someone who has items, so this
  // throws to the error boundary instead.
  const cart = cartId ? await getCart(cartId) : null;

  // Nothing to check out. Send them to the cart rather than showing an empty
  // form that cannot succeed.
  if (!cart || cart.lines.length === 0) redirect("/cart");

  // An item went unavailable between cart and checkout. The reservation would
  // refuse anyway; refusing here is the honest, earlier failure.
  if (cart.hasBlockingIssues) redirect("/cart");

  const identity = await getAccountIdentity().catch(() => null);

  return (
    <div className="shell py-14 lg:py-20">
      <nav aria-label="Breadcrumb" className="label text-ink-subtle">
        <Link href="/cart" className="transition-colors hover:text-ink">
          Cart
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-ink">Checkout</span>
      </nav>

      <h1 className="mt-6 font-display text-display-md text-ink-strong">Checkout</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
        <CheckoutForm email={identity?.email ?? null} />

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="hairline bg-surface-raised p-8">
            <h2 className="label text-ink-subtle">Order summary</h2>

            <ul className="mt-7 space-y-5">
              {cart.lines.map((line) => (
                <li key={line.itemId} className="flex justify-between gap-6 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{line.productTitle}</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      {line.variantTitle} · Qty {line.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-ink">
                    {formatPrice(line.lineTotalCents, line.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex items-baseline justify-between border-t border-line pt-5">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <span className="text-sm text-ink">
                {formatPrice(cart.subtotalCents, cart.currency)}
              </span>
            </div>

            {/*
              Shipping and tax are resolved server-side from Studio settings at
              snapshot time. Quoting a number the store has not configured would
              be a fabricated shipping promise (Master Spec §6.2).
            */}
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
              Flat-rate shipping and any applicable tax are added at payment.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
