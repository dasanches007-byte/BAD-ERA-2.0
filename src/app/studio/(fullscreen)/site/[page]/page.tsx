import { notFound } from "next/navigation";

import { SiteEditor } from "@/components/studio/site-editor";
import { getStudioIdentityForRender } from "@/lib/auth/studio";
import { CONTENT_TEMPLATE } from "@/lib/cms/edit-targets";
import { getOrCreateDraft } from "@/lib/cms/pages";
import { listMedia } from "@/lib/studio/media";

export const metadata = { title: "Edit page" };

/** The editor always works against a live draft; never cache it. */
export const dynamic = "force-dynamic";

/**
 * The Site Editor — every field of a page, beside a preview you can click.
 *
 * Full screen (the `(fullscreen)` group): the three panes need the width that
 * Studio's navigation rail would take. Inside the rail, a laptop left the
 * preview about 500px wide, so "Desktop" was really the phone layout.
 */
export default async function StudioPageEditor({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const identity = await getStudioIdentityForRender();
  if (!identity) notFound();

  const { page: pageKey } = await params;

  const draft = await getOrCreateDraft(pageKey);
  if (!draft) notFound();

  // An unreachable media library should not block editing copy.
  const media = await listMedia().catch((error) => {
    console.error("[bad-era] media read failed in editor", error);
    return [];
  });

  return (
    <SiteEditor
      // A publish opens a new draft revision; start fresh on it.
      key={draft.revisionId}
      pageId={draft.pageId}
      pageKey={draft.pageKey}
      pageTitle={draft.title}
      liveHref={draft.route ?? "/"}
      revisionId={draft.revisionId}
      revisionNumber={draft.revisionNumber}
      initialSections={draft.sections}
      initialVersions={Object.fromEntries(
        draft.sectionRows.map((row) => [row.sectionKey, row.version]),
      )}
      media={media}
      hasPublished={Boolean(draft.publishedRevisionId)}
      startable={draft.templateKey === CONTENT_TEMPLATE && draft.sections.length === 0}
    />
  );
}
