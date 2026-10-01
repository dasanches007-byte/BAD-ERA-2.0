import Link from "next/link";

import {
  EmptyState,
  LoadError,
  PageHeader,
  Panel,
  StatusChip,
  formatMoney,
} from "@/components/studio/primitives";
import { listStudioCustomers } from "@/lib/studio/customers";
import type { StudioCustomerRow } from "@/lib/studio/customers";

export const metadata = { title: "Customers" };

export default async function StudioCustomersPage() {
  let customers: StudioCustomerRow[];
  try {
    customers = await listStudioCustomers();
  } catch (error) {
    console.error("[bad-era] studio customers read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Commerce" title="Customers" />
        <Panel>
          <LoadError what="customers" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Commerce"
        title="Customers"
        description="Lifetime value counts paid orders only."
      />
      <Panel>
        {customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            body="A customer record is created with their first order, whether or not they signed up for an account."
          />
        ) : (
          <ul className="divide-y divide-line">
            {customers.map((customer) => {
              const name = [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(" ");
              return (
                <li key={customer.id}>
                  <Link
                    href={`/studio/customers/${customer.id}`}
                    className="flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-surface-overlay sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {name || customer.email}
                      </p>
                      {name ? (
                        <p className="mt-1 truncate text-xs text-ink-subtle">
                          {customer.email}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                      <StatusChip tone="neutral">
                        {customer.orderCount}{" "}
                        {customer.orderCount === 1 ? "order" : "orders"}
                      </StatusChip>
                      <span className="text-sm text-ink sm:w-24 sm:text-right">
                        {formatMoney(customer.lifetimeCents, customer.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
