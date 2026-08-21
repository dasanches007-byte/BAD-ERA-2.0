/**
 * Studio navigation model (Master Spec §10.3.1).
 *
 * Primary modules: Home, Site Editor, Products, Inventory, Orders, Customers,
 * Fulfillment, Returns, Support, Media, Publishing, Settings.
 *
 * Fulfillment is the one group with sub-navigation (Master Spec §10.4.2):
 * Overview, Ready to Ship, Supplier Orders, Providers, Action Required,
 * Shipments, History. Its children stay expanded while any of them is active.
 */

export type StudioNavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const STUDIO_NAV: { group: string; items: StudioNavItem[] }[] = [
  {
    group: "Overview",
    items: [{ label: "Home", href: "/studio" }],
  },
  {
    group: "Catalog",
    items: [
      { label: "Products", href: "/studio/products" },
      { label: "Inventory", href: "/studio/inventory" },
      { label: "Media", href: "/studio/media" },
    ],
  },
  {
    group: "Commerce",
    items: [
      { label: "Orders", href: "/studio/orders" },
      { label: "Customers", href: "/studio/customers" },
      {
        label: "Fulfillment",
        href: "/studio/fulfillment",
        children: [
          { label: "Overview", href: "/studio/fulfillment" },
          { label: "Ready to Ship", href: "/studio/fulfillment/ready-to-ship" },
          { label: "Supplier Orders", href: "/studio/fulfillment/supplier-orders" },
          { label: "Providers", href: "/studio/fulfillment/providers" },
          { label: "Action Required", href: "/studio/fulfillment/action-required" },
          { label: "Shipments", href: "/studio/fulfillment/shipments" },
          { label: "History", href: "/studio/fulfillment/history" },
        ],
      },
      { label: "Returns", href: "/studio/returns" },
      { label: "Support", href: "/studio/support" },
    ],
  },
  {
    group: "Site",
    items: [
      { label: "Site Editor", href: "/studio/site" },
      { label: "Publishing", href: "/studio/publishing" },
      { label: "Settings", href: "/studio/settings" },
    ],
  },
];

/**
 * Whether a nav href should render as active for the current pathname.
 *
 * Exact match for index routes so `/studio` does not light up on every page;
 * prefix match otherwise so a detail route keeps its parent selected.
 */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/studio") return pathname === "/studio";
  if (href === "/studio/fulfillment") return pathname === "/studio/fulfillment";
  return pathname === href || pathname.startsWith(`${href}/`);
}
