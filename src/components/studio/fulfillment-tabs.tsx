"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Fulfillment sub-navigation (Master Spec §10.4.2).
 *
 * Overview · Ready to Ship · Supplier Orders · Providers · Action Required ·
 * Shipments · History.
 *
 * Counts are passed in from real records. Action Required carries a badge
 * because it is the one queue where a paid customer is waiting on the owner.
 */
export function FulfillmentTabs({
  counts,
}: {
  counts: { readyToShip: number; supplierOrders: number; actionRequired: number };
}) {
  const pathname = usePathname();

  const tabs = [
    { label: "Overview", href: "/studio/fulfillment", exact: true },
    { label: "Ready to Ship", href: "/studio/fulfillment/ready-to-ship", count: counts.readyToShip },
    { label: "Supplier Orders", href: "/studio/fulfillment/supplier-orders", count: counts.supplierOrders },
    { label: "Providers", href: "/studio/fulfillment/providers" },
    {
      label: "Action Required",
      href: "/studio/fulfillment/action-required",
      count: counts.actionRequired,
      urgent: true,
    },
    { label: "Shipments", href: "/studio/fulfillment/shipments" },
    { label: "History", href: "/studio/fulfillment/history" },
  ];

  return (
    <nav aria-label="Fulfillment" className="border-b border-line">
      <ul className="flex gap-7 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`label -mb-px inline-flex items-center gap-2 border-b-2 pb-4 transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-subtle hover:text-ink-muted"
                }`}
              >
                {tab.label}
                {tab.count ? (
                  <span
                    className={`inline-flex min-w-5 items-center justify-center border px-1.5 py-0.5 text-[0.625rem] ${
                      tab.urgent
                        ? "border-state-critical/40 text-state-critical"
                        : "border-line-strong text-ink-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
