import { SupportForm } from "@/components/account/support-form";
import { listCustomerOrders } from "@/lib/account/queries";
import { getAccountIdentity } from "@/lib/account/session";
import { listCustomerSupportCases } from "@/lib/support/queries";
import { SUPPORT_STATUS_LABEL } from "@/lib/support/types";

export const metadata = { title: "Support", robots: { index: false } };

/**
 * Customer support (Master Spec §9.2).
 *
 * Shows only the customer's own messages. Internal notes live in a different
 * table that no query on this page touches.
 */
export default async function AccountSupportPage() {
  const identity = await getAccountIdentity();

  const [cases, orders] = identity
    ? await Promise.all([
        listCustomerSupportCases(identity.customerId),
        listCustomerOrders(identity.customerId, 20),
      ])
    : [[], []];

  return (
    <div className="space-y-14">
      {cases.length > 0 ? (
        <section>
          <h2 className="font-display text-display-sm text-ink-strong">
            Your messages
          </h2>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {cases.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{c.subject}</p>
                  <p className="mt-1.5 text-xs text-ink-subtle">
                    {c.caseNumber}
                    {c.orderNumber ? ` · order ${c.orderNumber}` : ""}
                  </p>
                </div>
                <span className="label text-ink-muted">
                  {SUPPORT_STATUS_LABEL[c.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-display-sm text-ink-strong">
          {cases.length > 0 ? "Send another message" : "Contact us"}
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
          Questions about an order, a return or a fit — we read every message.
        </p>
        <div className="mt-8">
          {identity ? (
            <SupportForm orderNumbers={orders.map((o) => o.orderNumber)} />
          ) : (
            <p className="text-sm text-ink-muted">
              Sign in so we can link your message to your orders.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
