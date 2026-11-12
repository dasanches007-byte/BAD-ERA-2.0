"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type MouseEvent } from "react";

import { PhotoZoom, ZoomMark, type ZoomOrigin, type ZoomStart } from "@/components/storefront/photo-zoom";
import { useShop } from "@/components/storefront/shop-context";
import { MediaSlot } from "@/components/ui/media-slot";
import { mainPhoto, photoSlot } from "@/lib/catalog/photos";
import type { CatalogPhoto } from "@/lib/catalog/queries";

/**
 * A card's photo, which zooms where it stands (owner's request, 12 November
 * 2026): a tap or click opens the piece's photos full screen, zoomed in on
 * the spot that was touched, without leaving the line-up.
 *
 * It is a real link to the product page. Before the page's script has
 * loaded, in the editors, with a modifier key, or when the piece has no
 * photo yet, it simply goes there. The zoom itself carries the piece's name
 * as a link to its page, and the name and button under the photo are
 * unchanged, so the product page is never further than it was.
 *
 * The zoom shows every photo of the piece in the owner's order, the card's
 * photo first.
 */
export function CardPhoto({
  handle,
  title,
  photos,
  tone,
  sizes,
}: {
  handle: string;
  title: string;
  photos: CatalogPhoto[];
  tone: "pale" | "dark";
  sizes: string;
}) {
  const shop = useShop();
  const place = useRef<HTMLAnchorElement>(null);
  const [zoom, setZoom] = useState<ZoomStart | null>(null);
  const main = mainPhoto(photos);
  const href = `/products/${handle}`;
  const zoomable = shop.interactive && Boolean(main);

  const originOf = useCallback(
    (index: number): ZoomOrigin | null => {
      // Only the first photo has a place on the card to open out of.
      const el = place.current;
      const photo = photos[index];
      if (index !== 0 || !el || !photo) return null;
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

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!zoomable || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // A keyboard press carries no place on the screen: show the whole photo.
    setZoom({ index: 0, at: event.detail === 0 ? null : { x: event.clientX, y: event.clientY } });
  }

  return (
    <>
      <Link
        ref={place}
        href={href}
        className={`relative block ${zoomable ? "cursor-zoom-in" : ""}`}
        aria-label={zoomable ? `Zoom in: ${title}` : title}
        aria-haspopup={zoomable ? "dialog" : undefined}
        onClick={onClick}
      >
        <MediaSlot
          media={photoSlot(main, title)}
          tone={tone}
          sizes={sizes}
          className={`piece-tile aspect-[4/5] w-full ${
            tone === "pale" ? "shadow-[0_18px_30px_-20px_rgb(40_38_34/0.45)]" : ""
          }`}
        />
        {zoomable ? <ZoomMark small /> : null}
      </Link>

      {zoom ? (
        <PhotoZoom
          photos={photos}
          title={title}
          start={zoom}
          originOf={originOf}
          link={{ href, label: title }}
          onClose={() => {
            setZoom(null);
            // Once the page is no longer inert, or the focus call is ignored.
            requestAnimationFrame(() => place.current?.focus({ preventScroll: true }));
          }}
        />
      ) : null}
    </>
  );
}
