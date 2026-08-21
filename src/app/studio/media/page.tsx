import {
  LoadError,
  PageHeader,
  Panel,
} from "@/components/studio/primitives";
import { MediaLibrary } from "@/components/studio/media-library";
import { listMedia } from "@/lib/studio/media";
import type { MediaAsset } from "@/lib/studio/media";

export const metadata = { title: "Media" };

/**
 * Media Library (Master Spec §12).
 *
 * The owner adds final photography AFTER the site is built, so this module is
 * the hinge the whole deferred-photography requirement turns on.
 */
export default async function StudioMediaPage() {
  let assets: MediaAsset[];
  try {
    assets = await listMedia();
  } catch (error) {
    console.error("[bad-era] media read failed", error);
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Catalog" title="Media" />
        <Panel>
          <LoadError what="the media library" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Catalog"
        title="Media"
        description="Upload final photography here, then place it into any storefront slot. Replacing a placeholder never needs a code change or a redeploy."
      />
      <MediaLibrary assets={assets} />
    </div>
  );
}
