import { notFound } from "next/navigation";

import { PageHeader } from "@/components/studio/primitives";
import { SiteEditor } from "@/components/studio/site-editor";
import { getOrCreateDraft } from "@/lib/cms/pages";
import { listMedia } from "@/lib/studio/media";

export const metadata = { title: "Edit page" };

/** The editor always works against a live draft; never cache it. */
export const dynamic = "force-dynamic";

export default async function StudioPageEditor({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: pageKey } = await params;

  const draft = await getOrCreateDraft(pageKey);
  if (!draft) notFound();

  // An unreachable media library should not block editing copy.
  const media = await listMedia().catch((error) => {
    console.error("[bad-era] media read failed in editor", error);
    return [];
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Site Editor"
        title={draft.title}
        description={`Draft revision ${draft.revisionNumber}. Edits autosave and never touch the live site until you publish.`}
      />
      <SiteEditor
        pageId={draft.pageId}
        pageKey={draft.pageKey}
        revisionId={draft.revisionId}
        initialSections={draft.sections}
        initialVersions={Object.fromEntries(
          draft.sectionRows.map((row) => [row.sectionKey, row.version]),
        )}
        media={media}
        hasPublished={Boolean(draft.publishedRevisionId)}
      />
    </div>
  );
}
