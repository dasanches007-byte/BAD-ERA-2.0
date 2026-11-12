"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type Ref } from "react";

import { useShop } from "@/components/storefront/shop-context";

/**
 * The buy button, everywhere it appears.
 *
 * One tap puts the piece in the bag on the server and slides the bag in with
 * it; nobody leaves the page. The words are the owner's (Studio → Site → Menu
 * & footer → Bag & buy buttons). What it adds is a variant id — never a
 * price, and never a quantity the server has not checked.
 */
export function AddToBag({
  variantId,
  purchasable,
  title,
  className,
  buttonRef,
}: {
  /** Undefined while nothing can be chosen. */
  variantId: string | undefined;
  purchasable: boolean;
  /** The piece's name, so each button says what it adds. */
  title: string;
  className: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const shop = useShop();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const canBuy = Boolean(variantId) && purchasable;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        disabled={!canBuy}
        aria-busy={pending}
        aria-label={canBuy ? `${shop.words.addToBag}: ${title}` : undefined}
        onClick={(event) => {
          // Not `disabled` while saving: that would drop keyboard focus.
          if (!variantId || pending || !shop.interactive) return;
          const button = event.currentTarget;
          setMessage(null);
          start(async () => {
            const result = await shop.add(variantId, button);
            if (!result.ok) {
              // The server's reason, not a generic failure: "sold out" and
              // "quantity limit" need different responses from the customer.
              setMessage(result.message);
              return;
            }
            setAdded(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setAdded(false), 1500);
          });
        }}
      >
        {!canBuy ? shop.words.soldOut : added ? shop.words.added : shop.words.addToBag}
      </button>
      {/* Said in words, in the surface's own lettering: never colour alone. */}
      <p aria-live="polite" className={message ? "text-xs font-bold uppercase tracking-[0.14em]" : "sr-only"}>
        {message}
      </p>
    </>
  );
}

/**
 * What a product card offers: add it (a piece with nothing to choose), choose
 * (a piece with sizes or colours, on its own page), or sold out.
 */
export function CardAction({
  handle,
  title,
  variantId,
  purchasable,
  tone,
}: {
  handle: string;
  title: string;
  /** The piece's only variant, when it has exactly one. */
  variantId: string | undefined;
  purchasable: boolean;
  tone: "pale" | "dark";
}) {
  const shop = useShop();
  const pill = tone === "pale" ? "pill pill-on-pale" : "pill pill-on-dark";

  if (purchasable && !variantId) {
    return (
      <Link
        href={`/products/${handle}`}
        className={pill}
        aria-label={`${shop.words.chooseOptions}: ${title}`}
      >
        {shop.words.chooseOptions}
      </Link>
    );
  }
  return (
    <div className="grid justify-items-start gap-2">
      <AddToBag variantId={variantId} purchasable={purchasable} title={title} className={pill} />
    </div>
  );
}
