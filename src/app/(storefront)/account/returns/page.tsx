import Link from "next/link";

import { listCustomerReturns } from "@/lib/returns/queries";
import { RETURN_STATUS_LABEL } from "@/lib/returns/types";
import { getAccountIdentity } from "@/lib/account/session";

export const metadata = { title: "Returns", robots: { index: false } };

export default async function AccountReturnsPage() {
  const identity = await getAccountIdentity();
  const returns = identity ? await listCustomerReturns(identity.customerId) : [];

  return (
    <section>
      <h2 className="font-display text-display-sm text-ink-strong">Returns</h2>

      {returns.length === 0 ? (
        <>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
            You have no returns. To start one, open the order you want to send
            back.
          </p>
          <Link
            href="/account/orders"
            className="label mt-8 inline-flex border border-ink/70 px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-inverse-ink"
          >
            View orders
          </Link>
        </>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {returns.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-ink">{r.returnNumber}</p>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  Order {r.orderNumber} ·{" "}
                  {new Date(r.requestedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span className="label text-ink-muted">
                {RETURN_STATUS_LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
