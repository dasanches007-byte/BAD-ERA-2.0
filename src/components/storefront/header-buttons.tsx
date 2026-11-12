"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useShop } from "@/components/storefront/shop-context";

/**
 * The header's two fixed buttons.
 *
 * Cart is a real link to the cart page: it works before the page's script
 * has loaded, in the editors, and on the cart and checkout pages themselves.
 * Everywhere else it slides the bag in instead of leaving the page. The count
 * is pieces, straight from the server's reading of the bag.
 */
export function CartButton({ className }: { className?: string }) {
  const shop = useShop();
  const pathname = usePathname() ?? "";
  const stay = shop.interactive && !pathname.startsWith("/cart") && !pathname.startsWith("/checkout");
  const count = shop.bag.count;

  return (
    <Link
      href="/cart"
      className={className}
      aria-haspopup={stay ? "dialog" : undefined}
      aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? "piece" : "pieces"}` : undefined}
      onClick={(event) => {
        if (!stay || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        shop.openBag(event.currentTarget);
      }}
    >
      Cart
      {count > 0 ? <span className="tabular-nums"> ({count})</span> : null}
    </Link>
  );
}

/** Phones only: the owner's menu links live behind this, in a slab from the left. */
export function MenuButton({ className }: { className?: string }) {
  const shop = useShop();
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      onClick={(event) => shop.openMenu(event.currentTarget)}
    >
      Menu
    </button>
  );
}
