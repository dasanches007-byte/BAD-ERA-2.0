"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { AddToBag } from "@/components/storefront/add-to-bag";
import { LitPhoto } from "@/components/storefront/lit-photo";
import { formatPrice } from "@/components/storefront/product-card";
import { useShop } from "@/components/storefront/shop-context";
import { VariantPicker } from "@/components/storefront/variant-picker";
import { MediaSlot } from "@/components/ui/media-slot";
import { galleryFor, photoSlot } from "@/lib/catalog/photos";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";
import { initialVariant } from "@/lib/catalog/variant-choice";

/**
 * The product page (cement design).
 *
 * One Client Component because its parts share one piece of state — the
 * chosen variant — so picking "Blue" brings the blue bag's photo under the
 * light, sets the price and tells the phone's buy bar what it would add. The
 * words around the picker are rendered on the server and passed in, so they
 * stay plain server HTML with their edit marks.
 *
 * Phone: the lit photo, then the pale buy panel, then the other photos, with
 * Add to bag held at the foot of the screen once the panel's own button has
 * scrolled away. Computer: the lit photo stays put on the left, full height,
 * while the buy panel scrolls on the right.
 */
export function ProductDetail({
  product,
  back,
  header,
  details,
  lightHint,
}: {
  product: CatalogProduct;
  /** The link back to the shop. */
  back: ReactNode;
  /** Label, name, subtitle. */
  header: ReactNode;
  /** Details, notes — under the buy button. */
  details: ReactNode;
  /** How to move the light, in the owner's words. */
  lightHint: ReactNode;
}) {
  const [selected, setSelected] = useState<CatalogVariant | undefined>(() =>
    initialVariant(product.variants),
  );
  const addButton = useRef<HTMLButtonElement>(null);
  const [lead, ...more] = galleryFor(product.photos, selected?.id);

  return (
    <>
      <article
        className="under-head lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:items-start"
        data-head-lg="light"
      >
        {/* Keyed by the photo: a new lead photo is a new picture to light. */}
        <LitPhoto key={lead?.url ?? "none"} photo={lead} title={product.title} hint={lightHint} />

        <section
          className="pale grid content-start gap-[26px] px-4 pb-[60px] pt-[34px] lg:min-h-screen lg:content-center lg:px-16 lg:pb-24 lg:pt-[120px]"
          data-tone="light"
        >
          {back}
          <div>
            {header}
            <p className="mt-3 text-[22px] font-bold tabular-nums">
              {selected ? formatPrice(selected.priceCents, selected.currency) : null}
            </p>
          </div>
          <VariantPicker
            product={product}
            selected={selected}
            onSelect={setSelected}
            addButtonRef={addButton}
          />
          {details}
        </section>
      </article>

      {more.length > 0 ? (
        <section
          className="grid gap-2.5 bg-surface px-4 pb-20 pt-3.5 lg:grid-cols-2 lg:gap-4 lg:px-11 lg:pb-[120px] lg:pt-7"
          data-tone="dark"
          aria-label={`More photos of ${product.title}`}
        >
          {more.map((photo, index) => (
            <MediaSlot
              key={`${photo.url}-${index}`}
              media={photoSlot(photo, product.title)}
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="aspect-[4/5] w-full lg:aspect-[16/10]"
            />
          ))}
        </section>
      ) : null}

      <BuyBar product={product} selected={selected} watch={addButton} />
    </>
  );
}

/**
 * On a phone, Add to bag stays in reach: a bar at the foot of the screen
 * whenever the page's own button is out of sight. It adds exactly what the
 * panel's button would — the chosen variant — and it steps aside for the bag.
 */
function BuyBar({
  product,
  selected,
  watch,
}: {
  product: CatalogProduct;
  selected: CatalogVariant | undefined;
  watch: RefObject<HTMLButtonElement | null>;
}) {
  const shop = useShop();
  // Taken as in view until measured, so the bar never flashes on arrival.
  const [mainInView, setMainInView] = useState(true);

  useEffect(() => {
    const button = watch.current;
    if (!button || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver(
      (entries) => setMainInView(entries[0]?.isIntersecting ?? true),
      { threshold: 0.6 },
    );
    seen.observe(button);
    return () => seen.disconnect();
  }, [watch]);

  const show = shop.interactive && !mainInView && !shop.bagOpen;
  const meta = [
    ...Object.values(selected?.options ?? {}),
    selected ? formatPrice(selected.priceCents, selected.currency) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="buybar" data-show={show ? "" : undefined} inert={!show}>
      <div className="min-w-0">
        <b className="poster block truncate text-2xl leading-none">{product.title}</b>
        <span className="mt-1 block text-[13px] tabular-nums text-ink-muted">{meta}</span>
      </div>
      <div className="grid flex-none justify-items-end gap-1">
        <AddToBag
          variantId={selected?.id}
          purchasable={Boolean(selected?.purchasable)}
          title={product.title}
          className="pill pill-bone px-5 py-[15px]"
        />
      </div>
    </div>
  );
}
