"use server";

import { revalidatePath } from "next/cache";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";
import { parseSection } from "@/lib/cms/registry";
import type { Json } from "@/lib/db/generated.types";

/**
 * Site Editor mutations (Master Spec §11.4.5, §13).
 *
 * Every write validates the payload against the registry FIRST. That is the
 * guardrail: content reaches the database only in a shape the renderer already
 * understands, so no field can smuggle CSS, markup or a script onto a page.
 *
 * Publishing never edits live content. It flips the draft revision to
 * published and moves the live pointer, so a failed publish leaves the previous
 * revision serving traffic untouched.
 */

export type EditorResult = { ok: true } | { ok: false; message: string };

async function assertOwner(): Promise<EditorResult> {
  try {
    await requireStudioOwner();
    return { ok: true };
  } catch (error) {
    if (error instanceof StudioAuthorizationError) {
      return { ok: false, message: "Studio authorization required." };
    }
    throw error;
  }
}

/**
 * Autosave one section's payload into the draft revision.
 *
 * Refuses if the target revision is not a draft — belt and braces alongside the
 * database trigger that already rejects edits to published revisions.
 */
export async function saveSectionAction(input: {
  revisionId: string;
  sectionKey: string;
  payload: unknown;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const parsed = parseSection(input.payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue
        ? `${issue.path.join(".") || "Section"}: ${issue.message}`
        : "That content is not valid for this section.",
    };
  }

  const db = createAdminClient();

  const { data: revision, error: revError } = await db
    .from("page_revisions")
    .select("id, state, page_id")
    .eq("id", input.revisionId)
    .maybeSingle();

  if (revError) return { ok: false, message: revError.message };
  if (!revision) return { ok: false, message: "That draft no longer exists." };
  if (revision.state !== "draft") {
    return { ok: false, message: "That revision is published and cannot be edited." };
  }

  const section = parsed.data;
  // sectionId / type / enabled / schemaVersion live in their own columns, so
  // they are stripped from the stored payload to keep one source of truth.
  const { sectionId: _sectionId, type: _type, enabled, schemaVersion, ...payload } =
    section as Record<string, unknown> & {
      sectionId: string;
      type: string;
      enabled: boolean;
      schemaVersion: number;
    };
  void _sectionId;
  void _type;

  const { error } = await db
    .from("page_sections")
    // The payload came through the registry schema, so its shape is known and
    // JSON-serialisable; the cast satisfies the generated Json type.
    .update({ payload: payload as Json, enabled, schema_version: schemaVersion })
    .eq("revision_id", input.revisionId)
    .eq("section_key", input.sectionKey);

  if (error) return { ok: false, message: error.message };

  await db
    .from("page_drafts")
    .update({ autosaved_at: new Date().toISOString() })
    .eq("revision_id", input.revisionId);

  return { ok: true };
}

/** Toggle a section's visibility without deleting it. */
export async function setSectionEnabledAction(input: {
  revisionId: string;
  sectionKey: string;
  enabled: boolean;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();
  const { error } = await db
    .from("page_sections")
    .update({ enabled: input.enabled })
    .eq("revision_id", input.revisionId)
    .eq("section_key", input.sectionKey);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Reorder sections within the draft. */
export async function reorderSectionsAction(input: {
  revisionId: string;
  orderedSectionKeys: string[];
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  for (const [index, key] of input.orderedSectionKeys.entries()) {
    const { error } = await db
      .from("page_sections")
      .update({ position: index })
      .eq("revision_id", input.revisionId)
      .eq("section_key", key);
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

/**
 * Publish the draft.
 *
 * Validates every section before touching anything. If validation fails, live
 * stays exactly where it was (Master Spec §11.4.5: "If publish validation or
 * persistence fails, live remains untouched").
 */
export async function publishPageAction(input: {
  pageId: string;
  revisionId: string;
  note?: string;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  const { data: sections, error: readError } = await db
    .from("page_sections")
    .select("section_key, section_type, schema_version, enabled, payload")
    .eq("revision_id", input.revisionId);

  if (readError) return { ok: false, message: readError.message };
  if (!sections || sections.length === 0) {
    return { ok: false, message: "This draft has no sections to publish." };
  }

  for (const row of sections) {
    const parsed = parseSection({
      ...(row.payload as Record<string, unknown>),
      type: row.section_type,
      sectionId: row.section_key,
      enabled: row.enabled,
      schemaVersion: row.schema_version,
    });
    if (!parsed.success) {
      return {
        ok: false,
        message: `Section "${row.section_key}" is not valid, so nothing was published.`,
      };
    }
  }

  const publishedAt = new Date().toISOString();

  // Flip the draft to published. The immutability trigger only fires on rows
  // that are ALREADY published, so this transition is allowed exactly once.
  const { error: stateError } = await db
    .from("page_revisions")
    .update({
      state: "published",
      published_at: publishedAt,
      note: input.note?.trim() || null,
    })
    .eq("id", input.revisionId);

  if (stateError) return { ok: false, message: stateError.message };

  const { error: pointerError } = await db
    .from("pages")
    .update({ published_revision_id: input.revisionId })
    .eq("id", input.pageId);

  if (pointerError) return { ok: false, message: pointerError.message };

  // Clearing the draft pointer means the next edit starts a fresh revision
  // rather than mutating the one now serving live traffic.
  await db.from("page_drafts").delete().eq("page_id", input.pageId);

  await db.from("audit_events").insert({
    action: "page.publish",
    entity_type: "page",
    entity_id: input.pageId,
    metadata: { revision_id: input.revisionId, note: input.note ?? null },
  });

  revalidatePath("/", "layout");
  revalidatePath("/studio/site");

  return { ok: true };
}

/**
 * Roll back to an earlier revision.
 *
 * Republishes it as a NEW revision rather than moving the pointer backwards, so
 * later history is preserved and the rollback itself is auditable
 * (Master Spec §13.1).
 */
export async function rollbackPageAction(input: {
  pageId: string;
  targetRevisionId: string;
}): Promise<EditorResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  const { data: last, error: lastError } = await db
    .from("page_revisions")
    .select("revision_number")
    .eq("page_id", input.pageId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) return { ok: false, message: lastError.message };

  const { data: created, error: createError } = await db
    .from("page_revisions")
    .insert({
      page_id: input.pageId,
      revision_number: (last?.revision_number ?? 0) + 1,
      state: "draft",
      source_revision_id: input.targetRevisionId,
      note: `Rollback of revision ${input.targetRevisionId}`,
    })
    .select("id")
    .single();

  if (createError) return { ok: false, message: createError.message };

  const { data: source, error: sourceError } = await db
    .from("page_sections")
    .select("section_key, section_type, schema_version, position, enabled, payload")
    .eq("revision_id", input.targetRevisionId)
    .order("position");

  if (sourceError) return { ok: false, message: sourceError.message };
  if (!source || source.length === 0) {
    return { ok: false, message: "That revision has no sections." };
  }

  const { error: copyError } = await db.from("page_sections").insert(
    source.map((s) => ({
      revision_id: created.id,
      section_key: s.section_key,
      section_type: s.section_type,
      schema_version: s.schema_version,
      position: s.position,
      enabled: s.enabled,
      payload: s.payload,
    })),
  );

  if (copyError) return { ok: false, message: copyError.message };

  // Drop any in-flight draft, then publish the restored content.
  await db.from("page_drafts").delete().eq("page_id", input.pageId);

  return publishPageAction({
    pageId: input.pageId,
    revisionId: created.id,
    note: "Rollback",
  });
}
