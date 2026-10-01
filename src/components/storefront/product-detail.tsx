"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { VariantPicker } from "@/components/storefront/variant-picker";
import { MediaSlot } from "@/components/ui/media-slot";
import { galleryFor, photoSlot } from "@/lib/catalog/photos";
import type { CatalogProduct, CatalogVariant } from "@/lib/catalog/queries";
import { initialVariant } from "@/lib/catalog/variant-choice";

/**
 * The product page's two columns: gallery and purchase controls.
 *
 * One Client Component because the two share one piece of state — the chosen
 * variant — so picking "Blue" brings the blue bag's photos to the front. The
 * words around the picker (title, details) are rendered on the server and
 * passed in, so they stay plain server HTML.
 *
 * Desktop: photos stacked down the left (the first full width, the rest two
 * across), details sticky on the right. Phone: the photos become one swipeable
 * row with the next photo peeking in, then the details below.
 */
export function ProductDetail({
  product,
  header,
  details,
}: {
  product: CatalogProduct;
  header: ReactNode;
  details: ReactNode;
}) {
  const [selected, setSelected] = useState<CatalogVariant | undefined>(() =>
    initialVariant(product.variants),
  );
  const photos = galleryFor(product.photos, selected?.id);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
      <ProductGallery title={product.title} photos={photos} />

      <div className="lg:sticky lg:top-28 lg:self-start">
        {header}
        <div className="mt-10">
          <VariantPicker product={product} selected={selected} onSelect={setSelected} />
        </div>
        {details}
      </div>
    </div>
  );
}

function ProductGallery({
  title,
  photos,
}: {
  title: string;
  photos: ReturnType<typeof galleryFor>;
}) {
  const row = useRef<HTMLDivElement>(null);
  const first = photos[0]?.url;

  // When the chosen variant changes the lead photo, bring it into view on a
  // phone, where the gallery scrolls sideways.
  useEffect(() => {
    row.current?.scrollTo({ left: 0 });
  }, [first]);

  if (photos.length <= 1) {
    return (
      <MediaSlot
        media={photoSlot(photos[0], title)}
        sizes="(min-width: 1024px) 55vw, 100vw"
        priority
        className="aspect-[4/5] w-full"
      />
    );
  }

  return (
    <div
      ref={row}
      aria-label={`${title} photos`}
      role="group"
      className="-mx-[var(--spacing-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--spacing-gutter)] [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0"
    >
      {photos.map((photo, index) => (
        <MediaSlot
          key={`${photo.url}-${index}`}
          media={photoSlot(photo, title)}
          sizes={index === 0 ? "(min-width: 1024px) 55vw, 88vw" : "(min-width: 1024px) 28vw, 88vw"}
          priority={index === 0}
          className={`aspect-[4/5] w-[88%] shrink-0 snap-start lg:w-full ${index === 0 ? "lg:col-span-2" : ""}`}
        />
      ))}
    </div>
  );
}
