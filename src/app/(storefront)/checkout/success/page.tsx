import Link from "next/link";

import { formatPrice } from "@/components/storefront/product-card";
import { getOrderForCheckout } from "@/lib/orders/queries";

export const metadata = { title: "Order received", robots: { index: false } };

// Per-visitor, never cached, and it must carry a CSP nonce.
export const dynamic = "force-dynamic";

/**
 * Post-payment landing page (Master Spec §6.3, Kickoff v0.2 §5).
 *
 * THE INVARIANT THIS PAGE EXISTS TO RESPECT:
 *
 *   the success page is NEVER payment truth and NEVER performs fulfillment
 *
 * Reaching this URL proves only that Stripe redirected a browser here. It does
 * not prove payment, and a customer can arrive here by pasting the link. So
 * this page only READS state that the verified webhook has already written. It
 * creates nothing, converts nothing, and sends nothing.
 *
 * If the webhook has not landed yet — which is normal for a second or two, and
 * expected for hours with a delayed payment method — there is simply no order
 * to show, and the page says so honestly rather than implying failure.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  const order = checkout
    ? await getOrderForCheckout(checkout).catch((error) => {
        // A read failure is not a payment failure. Never tell someone who has
        // just paid that something went wrong with their money.
        console.error("[bad-era] success page order read failed", error);
        return null;
      })
    : null;

  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-20 lg:py-28">
      <div className="max-w-xl">
        <p className="label text-ink-subtle">Thank you</p>
        <h1 className="mt-6 font-display text-display-md text-ink-strong">
          {order ? "Your order is confirmed" : "Your order is being confirmed"}
        </h1>

        {order ? (
          <>
            {/*
              The confirmation email address is deliberately NOT echoed here.
              This page is reachable by anyone holding the checkout id in the
              URL, and `CustomerOrder` rightly does not carry the address —
              printing it would turn a shared link into an email disclosure.
            */}
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">
              We&rsquo;ve got it. A confirmation email is on its way.
            </p>

            <dl className="mt-10 space-y-3 border-t border-line pt-8 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-ink-subtle">Order</dt>
                <dd className="text-ink">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-ink-subtle">Total</dt>
                <dd className="text-ink">
                  {formatPrice(order.totalCents, order.currency)}
                </dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="label inline-flex items-center border border-ink/70 px-8 py-3.5 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
              >
                View order
              </Link>
              <Link
                href="/shop"
                className="label inline-flex items-center px-4 py-3.5 text-ink-subtle transition-colors hover:text-ink"
              >
                Continue shopping
              </Link>
            </div>
          </>
        ) : (
          <>
            {/*
              Deliberately reassuring and deliberately not a claim. We do not
              say "payment successful" — we have not verified that here, and
              only the webhook can. We say what is actually true: it is being
              confirmed, and nothing is lost either way.
            */}
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">
              Payment is being confirmed with our payment provider. This usually
              takes a few seconds. Some payment methods take longer, and that is
              normal.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">
              You&rsquo;ll get an email as soon as it clears. Nothing is lost if
              you close this page — your order does not depend on it staying
              open.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/account/orders"
                className="label inline-flex items-center border border-ink/70 px-8 py-3.5 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink"
              >
                My orders
              </Link>
              <Link
                href="/support"
                className="label inline-flex items-center px-4 py-3.5 text-ink-subtle transition-colors hover:text-ink"
              >
                Get help
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
