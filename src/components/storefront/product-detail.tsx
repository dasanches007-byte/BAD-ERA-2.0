"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { AddToBag } from "@/components/storefront/add-to-bag";
import { PhotoZoom, ZoomMark, type ZoomOrigin, type ZoomStart } from "@/components/storefront/photo-zoom";
import { formatPrice } from "@/components/storefront/product-card";
import { useShop } from "@/components/storefront/shop-context";
import { VariantPicker } from "@/components/storefront/variant-picker";
import { galleryFor } from "@/lib/catalog/photos";
import type { CatalogPhoto, CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";
import { initialVariant } from "@/lib/catalog/variant-choice";

/**
 * The product page (cement design).
 *
 * One Client Component because its parts share one piece of state — the
 * chosen variant — so picking "Blue" brings the blue bag's photos forward,
 * sets the price and tells the phone's buy bar what it would add. The words
 * around the picker are rendered on the server and passed in, so they stay
 * plain server HTML with their edit marks.
 *
 * Every photo can be zoomed: a tap or click opens it out of its place to fill
 * the screen, zoomed in where it was touched (`PhotoZoom`).
 *
 * Phone: the first photo, then the pale buy panel, then the other photos,
 * with Add to bag held at the foot of the screen once the panel's own button
 * has scrolled away. Computer: the first photo stays put on the left, full
 * height, while the buy panel scrolls on the right.
 */
export function ProductDetail({
  product,
  back,
  header,
  details,
  zoomHint,
}: {
  product: CatalogProduct;
  /** The link back to the shop. */
  back: ReactNode;
  /** Label, name, subtitle. */
  header: ReactNode;
  /** Details, notes — under the buy button. */
  details: ReactNode;
  /** How to zoom in, in the owner's words. */
  zoomHint: ReactNode;
}) {
  const shop = useShop();
  const [selected, setSelected] = useState<CatalogVariant | undefined>(() =>
    initialVariant(product.variants),
  );
  const addButton = useRef<HTMLButtonElement>(null);
  const photos = galleryFor(product.photos, selected?.id);
  const [lead, ...more] = photos;

  // Each photo's place on the page, so the zoom can open out of it and return.
  const places = useRef<(HTMLElement | null)[]>([]);
  const [zoom, setZoom] = useState<ZoomStart | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const originOf = useCallback(
    (index: number): ZoomOrigin | null => {
      const el = places.current[index];
      const photo = photos[index];
      if (!el || !photo) return null;
      const rect = el.getBoundingClientRect();
      const img = el.querySelector("img");
      return {
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        focal: photo.focal,
        aspect: img?.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null,
      };
    },
    [photos],
  );

  function open(index: number, event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    // A keyboard press carries no place on the screen: show the whole photo.
    setZoom({ index, at: event.detail === 0 ? null : { x: event.clientX, y: event.clientY } });
  }

  const zoomable = shop.interactive;

  return (
    <>
      <article
        className="under-head lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:items-start"
        data-head-lg="light"
      >
        <section
          ref={(el) => {
            places.current[0] = el;
          }}
          className="stage"
          data-tone="dark"
          aria-label={lead ? undefined : `${product.title}: no photo yet`}
        >
          {lead ? (
            <>
              <Photo photo={lead} title={product.title} sizes="(min-width: 1024px) 53vw, 100vw" priority />
              {zoomable ? (
                <button
                  type="button"
                  className="zoom-open"
                  aria-label="Zoom in on this photo"
                  onClick={(event) => open(0, event)}
                >
                  <ZoomMark />
                </button>
              ) : null}
              {zoomHint}
            </>
          ) : (
            // No photo yet: the stage is there, empty, until the owner adds one.
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#141312_0%,#0a0a0a_60%,#050505_100%)]"
            >
              <span className="label absolute bottom-4 right-5 text-ink-disabled/70">{product.title}</span>
            </div>
          )}
        </section>

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
          {more.map((photo, at) => {
            const index = at + 1;
            return (
              <figure
                key={`${photo.url}-${index}`}
                ref={(el) => {
                  places.current[index] = el;
                }}
                className="relative aspect-[4/5] overflow-hidden bg-surface-inset lg:aspect-[16/10]"
              >
                <Photo photo={photo} title={product.title} sizes="(min-width: 1024px) 48vw, 100vw" />
                {zoomable ? (
                  <button
                    type="button"
                    className="zoom-open"
                    aria-label="Zoom in on this photo"
                    onClick={(event) => open(index, event)}
                  >
                    <ZoomMark />
                  </button>
                ) : null}
              </figure>
            );
          })}
        </section>
      ) : null}

      <BuyBar product={product} selected={selected} watch={addButton} />

      {zoom ? (
        <PhotoZoom
          photos={photos}
          title={product.title}
          start={zoom}
          originOf={originOf}
          onClose={() => {
            setZoom(null);
            const back = opener.current;
            opener.current = null;
            // Once the page is no longer inert, or the focus call is ignored.
            requestAnimationFrame(() => {
              if (back?.isConnected) back.focus({ preventScroll: true });
            });
          }}
        />
      ) : null}
    </>
  );
}

/** A product photo filling its place, cropped about the owner's focal point. */
function Photo({
  photo,
  title,
  sizes,
  priority = false,
}: {
  photo: CatalogPhoto;
  title: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className="absolute inset-0">
      <Image
        src={photo.url}
        alt={photo.alt || title}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: `${photo.focal.x * 100}% ${photo.focal.y * 100}%` }}
      />
    </div>
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
