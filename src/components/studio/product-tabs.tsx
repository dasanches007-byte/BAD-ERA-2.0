import Link from "next/link";

/**
 * Product Editor navigation (Master Spec §10.4.9).
 *
 * Inventory & Fulfillment is a dedicated workspace, not a hidden accordion
 * inside General.
 */
export function ProductTabs({
  productId,
  active,
}: {
  productId: string;
  active: "general" | "variants" | "fulfillment";
}) {
  const tabs = [
    { key: "general", label: "General", href: `/studio/products/${productId}` },
    {
      key: "variants",
      label: "Variants",
      href: `/studio/products/${productId}/variants`,
    },
    {
      key: "fulfillment",
      label: "Inventory & Fulfillment",
      href: `/studio/products/${productId}/fulfillment`,
    },
  ] as const;

  return (
    <nav aria-label="Product sections" className="border-b border-line">
      <ul className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.key} className="shrink-0">
            <Link
              href={tab.href}
              aria-current={tab.key === active ? "page" : undefined}
              className={`label -mb-px inline-block border-b-2 pb-4 transition-colors ${
                tab.key === active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-subtle hover:text-ink-muted"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
