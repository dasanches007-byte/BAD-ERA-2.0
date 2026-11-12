"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { formatPrice } from "@/components/storefront/product-card";
import {
  ShopContext,
  type AddResult,
  type Shop,
} from "@/components/storefront/shop-context";
import { SiteEffects } from "@/components/storefront/site-effects";
import { addToCartAction, loadBagAction, updateCartLineAction } from "@/lib/cart/actions";
import type { BagLine, BagView, BagWords } from "@/lib/cart/bag-types";

/**
 * The storefront's frame: the page, and the two cement slabs that slide over
 * it — the bag from the right, and on a phone the menu from the left.
 *
 * Nobody leaves the page to see their bag. Adding a piece slides the bag in
 * with the piece in it; closing it puts them back exactly where they were.
 * The bag's contents and total always come from the server (`BagView`): this
 * component shows them and asks the server to change them, and never works a
 * price out itself.
 *
 * While a slab is open the page behind is `inert`, the keyboard stays inside
 * the slab, Escape closes it and focus returns to whatever opened it.
 *
 * `interactive` is false in the two editors, where the page is being edited,
 * not shopped: the words are still provided to the buttons, but nothing opens.
 */
export function StorefrontShell({
  words,
  initialBag,
  interactive,
  menu,
  children,
}: {
  words: BagWords;
  initialBag: BagView;
  interactive: boolean;
  /** The phone menu's links, rendered on the server. */
  menu?: ReactNode;
  children: ReactNode;
}) {
  const [bag, setBag] = useState(initialBag);
  const [open, setOpen] = useState<"bag" | "menu" | null>(null);
  const [status, setStatus] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  // A fresh server render (a navigation that re-ran the layout) knows the bag
  // at least as well as this component does.
  const initialKey = JSON.stringify(initialBag);
  const [adoptedKey, setAdoptedKey] = useState(initialKey);
  if (initialKey !== adoptedKey) {
    setAdoptedKey(initialKey);
    setBag(initialBag);
  }

  const close = useCallback(() => {
    setOpen(null);
    const back = opener.current;
    opener.current = null;
    // After the page is no longer inert, or the focus call is ignored.
    requestAnimationFrame(() => {
      if (back?.isConnected) back.focus({ preventScroll: true });
    });
  }, []);

  const show = useCallback((which: "bag" | "menu", from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    setOpen(which);
  }, []);

  const adopt = useCallback((next: BagView | null) => {
    if (next) {
      setBag(next);
      return;
    }
    // The change was made but could not be read back: ask again.
    loadBagAction()
      .then(setBag)
      .catch(() => {});
  }, []);

  const add = useCallback(
    async (variantId: string, from?: HTMLElement | null): Promise<AddResult> => {
      const result = await addToCartAction(variantId, 1);
      if (!result.ok) return { ok: false, message: result.message };
      adopt(result.bag);
      setStatus(`${words.added}.`);
      show("bag", from);
      return { ok: true };
    },
    [adopt, show, words.added],
  );

  // Going to another page closes whatever is open.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    if (open) setOpen(null);
  }

  // The page behind does not scroll while a slab is open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  const shop = useMemo<Shop>(
    () => ({
      bag,
      words,
      interactive,
      bagOpen: open === "bag",
      openBag: (from) => show("bag", from),
      openMenu: (from) => show("menu", from),
      add,
      adopt,
    }),
    [bag, words, interactive, open, show, add, adopt],
  );

  return (
    <ShopContext.Provider value={shop}>
      <div
        className="storefront flex min-h-screen flex-col bg-surface text-ink"
        inert={interactive && open !== null}
      >
        {children}
      </div>
      <SiteEffects />
      {interactive ? (
        <>
          <Drawer open={open === "bag"} side="right" labelledBy="bag-title" onClose={close}>
            <BagPanel
              bag={bag}
              words={words}
              onClose={close}
              onBag={adopt}
              onStatus={setStatus}
            />
          </Drawer>
          <Drawer open={open === "menu"} side="left" labelledBy="menu-title" onClose={close}>
            <div className="flex items-center justify-between gap-3 px-5 pb-3.5 pt-[calc(18px+env(safe-area-inset-top,0px))]">
              <h2 id="menu-title" className="poster text-[46px] leading-[0.86]">
                Menu
              </h2>
              <CloseButton label="Close menu" onClick={close} />
            </div>
            {/* A tap on any link is a navigation, which closes the menu. */}
            <div className="overflow-y-auto overscroll-contain px-5 pb-8">{menu}</div>
            <span />
          </Drawer>
          <p className="sr-only" aria-live="polite">
            {status}
          </p>
        </>
      ) : null}
    </ShopContext.Provider>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="round-btn" aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        <path d="M1 1l12 12M13 1L1 13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}

/** A slab of cement that slides in from one side, over a scrim. */
function Drawer({
  open,
  side,
  labelledBy,
  onClose,
  children,
}: {
  open: boolean;
  side: "left" | "right";
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      // Keep the keyboard inside the slab while it is open.
      const stops = [
        ...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ].filter((el) => el.offsetParent !== null);
      if (stops.length === 0) {
        event.preventDefault();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (event.shiftKey && (at === first || at === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && at === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="drawer" data-open={open ? "" : undefined} inert={!open}>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panel}
        className="drawer-panel cement"
        data-side={side}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </aside>
    </div>
  );
}

function BagPanel({
  bag,
  words,
  onClose,
  onBag,
  onStatus,
}: {
  bag: BagView;
  words: BagWords;
  onClose: () => void;
  onBag: (bag: BagView | null) => void;
  onStatus: (message: string) => void;
}) {
  const empty = bag.lines.length === 0;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pb-3.5 pt-[calc(18px+env(safe-area-inset-top,0px))]">
        <h2 id="bag-title" className="poster text-[46px] leading-[0.86]">
          {words.title}
        </h2>
        <CloseButton label="Close bag" onClick={onClose} />
      </div>

      <div className="overflow-y-auto overscroll-contain px-5">
        {empty ? (
          <div className="grid justify-items-start gap-[22px] py-7 text-base text-[#cbc7c0]">
            <p>{words.emptyText}</p>
            <button type="button" className="pill pill-on-dark" onClick={onClose}>
              {words.keepShopping}
            </button>
          </div>
        ) : (
          <ul className="border-t border-ink/20">
            {bag.lines.map((line) => (
              <BagRow
                key={line.itemId}
                line={line}
                onClose={onClose}
                onBag={onBag}
                onStatus={onStatus}
              />
            ))}
          </ul>
        )}
      </div>

      {empty ? (
        <span />
      ) : (
        <div className="grid gap-3.5 border-t border-ink/20 px-5 pb-[calc(22px+env(safe-area-inset-bottom,0px))] pt-[18px]">
          <p className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">
              {words.subtotalLabel}
            </span>
            <b className="text-2xl tabular-nums">{formatPrice(bag.subtotalCents, bag.currency)}</b>
          </p>
          {words.shippingNote ? (
            <p className="text-[13px] leading-normal text-[#cbc7c0]">{words.shippingNote}</p>
          ) : null}
          {bag.blocked ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-state-warning">
                Something in your bag needs a look
              </p>
              <Link href="/cart" className="pill pill-bone pill-wide">
                Review your bag
              </Link>
            </>
          ) : (
            <Link href="/checkout" className="pill pill-bone pill-wide">
              {words.checkoutLabel}
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="justify-self-center px-1 py-2 text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-[5px]"
          >
            {words.keepShopping}
          </button>
        </div>
      )}
    </>
  );
}

function BagRow({
  line,
  onClose,
  onBag,
  onStatus,
}: {
  line: BagLine;
  onClose: () => void;
  onBag: (bag: BagView | null) => void;
  onStatus: (message: string) => void;
}) {
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  function setQuantity(next: number) {
    // Not `disabled` while saving: a disabled button drops keyboard focus.
    if (pending) return;
    setProblem(null);
    start(async () => {
      const result = await updateCartLineAction(line.itemId, next);
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      onBag(result.bag);
      onStatus(next > 0 ? `${line.title}: ${next} in your bag.` : `${line.title} removed.`);
    });
  }

  const meta = [line.detail, formatPrice(line.unitPriceCents, line.currency)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className="grid grid-cols-[68px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-ink/20 py-4"
      aria-busy={pending}
    >
      <div className="relative h-[85px] w-[68px] overflow-hidden bg-pale-card">
        {line.photo ? (
          <Image
            src={line.photo.url}
            alt=""
            fill
            sizes="68px"
            className="object-cover"
            style={{ objectPosition: `${line.photo.focal.x * 100}% ${line.photo.focal.y * 100}%` }}
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <h3 className="poster text-[25px] leading-[0.9]">
          <Link href={`/products/${line.productHandle}`} onClick={onClose}>
            {line.title}
          </Link>
        </h3>
        <p className="mt-2 text-[13px] tabular-nums text-[#cbc7c0]">{meta}</p>
        {line.flag || problem ? (
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-state-warning">
            {problem ?? line.flag}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2.5 text-[15px] font-bold tabular-nums">
        <button
          type="button"
          className="round-btn round-btn-sm"
          aria-label={line.quantity > 1 ? `One fewer ${line.title}` : `Remove ${line.title}`}
          onClick={() => setQuantity(line.quantity - 1)}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <path d="M1 5h8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <b className="min-w-[1ch] text-center">{line.quantity}</b>
        <button
          type="button"
          className="round-btn round-btn-sm"
          aria-label={`One more ${line.title}`}
          aria-disabled={!line.canAddOne}
          onClick={() => {
            if (line.canAddOne) setQuantity(line.quantity + 1);
          }}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <path d="M1 5h8M5 1v8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </li>
  );
}
