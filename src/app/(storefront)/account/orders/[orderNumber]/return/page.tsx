import Link from "next/link";
import { notFound } from "next/navigation";

import { ReturnRequestForm } from "@/components/account/return-request-form";
import { getAccountIdentity } from "@/lib/account/session";
import { getReturnableLines } from "@/lib/returns/queries";
import {
  DEFAULT_RETURN_WINDOW_DAYS,
  checkReturnEligibility,
} from "@/lib/returns/types";
import { getReturnWindowDays } from "@/lib/settings/store";

export const metadata = { title: "Request a return", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Start a return (Master Spec §9.1).
 *
 * Eligibility is policy-driven and checked before the form is even shown, so
 * the customer is told why rather than being allowed to submit something that
 * will be rejected.
 */
export default async function RequestReturnPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const identity = await getAccountIdentity();
  if (!identity) notFound();

  const order = await getReturnableLines(identity.customerId, orderNumber);
  if (!order) notFound();

  // Configurable from Studio; falls back to the documented default.
  const windowDays = await getReturnWindowDays().catch(
    () => DEFAULT_RETURN_WINDOW_DAYS,
  );

  const eligibility = checkReturnEligibility({
    paidAt: order.paidAt,
    fulfillmentStatus: order.fulfillmentStatus,
    windowDays,
  });

  return (
    <section>
      <Link href={`/account/orders/${orderNumber}`} className="label text-ink-subtle hover:text-ink">
        &larr; Order {orderNumber}
      </Link>
      <h2 className="mt-4 font-display text-display-sm text-ink-strong">
        Request a return
      </h2>

      {!eligibility.eligible ? (
        <div className="mt-8 max-w-lg">
          <p className="text-sm leading-relaxed text-ink-muted">
            {eligibility.reason}
          </p>
          <Link
            href="/support"
            className="label mt-8 inline-flex items-center gap-3 border-b border-line-strong pb-2 text-ink transition-colors hover:border-accent hover:text-accent-strong"
          >
            Contact support
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
            {eligibility.daysRemaining}{" "}
            {eligibility.daysRemaining === 1 ? "day" : "days"} left in your
            return window.
          </p>
          <div className="mt-10 max-w-2xl">
            <ReturnRequestForm orderNumber={orderNumber} lines={order.lines} />
          </div>
        </>
      )}
    </section>
  );
}
