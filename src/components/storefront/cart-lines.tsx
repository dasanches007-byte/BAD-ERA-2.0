"use client";

import { useTransition } from "react";
import Link from "next/link";

import { formatPrice } from "@/components/storefront/product-card";
import {
  removeCartLineAction,
  updateCartLineAction,
} from "@/lib/cart/actions";
import { STOCK_STATE_LABEL } from "@/lib/inventory/availability";
import type { CartLine } from "@/lib/cart/service";

/**
 * Editable cart lines.
 *
 * Quantity and removal go through Server Actions; the browser never mutates the
 * database. A line that can no longer be fulfilled at its current quantity is
 * flagged rather than silently reduced, so the customer sees what changed
 * (Master Spec §6.1).
 */
export function CartLines({ lines }: { lines: CartLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <CartLineRow key={line.itemId} line={line} />
      ))}
    </ul>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const [pending, startTransition] = useTransition();

  const optionSummary = Object.entries(line.options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");

  function setQuantity(next: number) {
    startTransition(async () => {
      await updateCartLineAction(line.itemId, next);
    });
  }

  return (
    <li className="flex items-start justify-between gap-6 py-7">
      <div className="min-w-0">
        <Link
          href={`/products/${line.productHandle}`}
          className="text-sm text-ink transition-colors hover:text-accent-strong"
        >
          {line.productTitle}
        </Link>
        {optionSummary ? (
          <p className="mt-1 text-xs text-ink-subtle">{optionSummary}</p>
        ) : (
          <p className="mt-1 text-xs text-ink-subtle">{line.variantTitle}</p>
        )}

        {line.needsAttention ? (
          <p className="label mt-3 text-state-warning">
            Only {line.sellableQuantity} available
          </p>
        ) : line.stockState === "sold_out" ? (
          <p className="label mt-3 text-state-critical">
            {STOCK_STATE_LABEL.sold_out}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center border border-line-strong">
            <QuantityButton
              label="Decrease quantity"
              symbol="−"
              disabled={pending}
              onClick={() => setQuantity(line.quantity - 1)}
            />
            <span className="min-w-10 text-center text-sm text-ink">
              {line.quantity}
            </span>
            <QuantityButton
              label="Increase quantity"
              symbol="+"
              disabled={pending}
              onClick={() => setQuantity(line.quantity + 1)}
            />
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeCartLineAction(line.itemId);
              })
            }
            className="label text-ink-subtle transition-colors hover:text-ink disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>

      <p className="shrink-0 text-sm text-ink">
        {formatPrice(line.lineTotalCents, line.currency)}
      </p>
    </li>
  );
}

function QuantityButton({
  label,
  symbol,
  disabled,
  onClick,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
    >
      {symbol}
    </button>
  );
}
