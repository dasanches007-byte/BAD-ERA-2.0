"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudioOwner, StudioAuthorizationError } from "@/lib/auth/studio";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Product and variant mutations (Master Spec §10.3.2, §10.3.3).
 *
 * Two rules the schema alone will not enforce, so they live here:
 *
 *   1. Changing a display label must never change a stable id. These actions
 *      update fields on existing rows and never re-create a variant, so
 *      historical order snapshots and provider mappings stay intact.
 *   2. A variant is archived, never deleted, once an order references it.
 *
 * Every action re-verifies Studio authorization server-side. A disabled input
 * is never the boundary.
 */

async function assertOwner(): Promise<{ ok: true } | { ok: false; message: string }> {
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

export type MutationResult = { ok: true } | { ok: false; message: string };

const productSchema = z.object({
  productId: z.uuid(),
  title: z.string().min(1, "Title is required").max(200),
  // Lower-case, hyphenated. The handle is the public URL, so it is validated
  // rather than sanitised silently — a changed URL is a real decision.
  handle: z
    .string()
    .min(1, "Handle is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lower-case words separated by hyphens"),
  subtitle: z.string().max(300).nullable(),
  description: z.string().max(8000).nullable(),
  productType: z.string().max(120).nullable(),
  tags: z.array(z.string().max(60)).max(30),
  status: z.enum(["draft", "active", "archived"]),
  seoTitle: z.string().max(200).nullable(),
  seoDescription: z.string().max(400).nullable(),
});

export async function updateProductAction(input: unknown): Promise<MutationResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const p = parsed.data;
  const db = createAdminClient();

  const { error } = await db
    .from("products")
    .update({
      title: p.title,
      handle: p.handle,
      subtitle: p.subtitle?.trim() || null,
      description: p.description?.trim() || null,
      product_type: p.productType?.trim() || null,
      tags: p.tags,
      status: p.status,
      seo_title: p.seoTitle?.trim() || null,
      seo_description: p.seoDescription?.trim() || null,
    })
    .eq("id", p.productId);

  if (error) {
    console.error("[bad-era] product update failed", error);
    // A duplicate handle is the common case and deserves a plain explanation.
    if (error.code === "23505") {
      return { ok: false, message: "Another product already uses that handle." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath(`/studio/products/${p.productId}`);
  revalidatePath("/studio/products");
  // The storefront reads this product, so its pages must revalidate too.
  revalidatePath(`/products/${p.handle}`);
  revalidatePath("/shop");
  revalidatePath("/");

  return { ok: true };
}

const variantSchema = z.object({
  variantId: z.uuid(),
  productId: z.uuid(),
  title: z.string().min(1, "Title is required").max(200),
  sku: z.string().max(120).nullable(),
  priceCents: z.number().int().min(0, "Price cannot be negative"),
  lowStockThreshold: z.number().int().min(0),
  continueSellingWhenOutOfStock: z.boolean(),
  trackInventory: z.boolean(),
  active: z.boolean(),
});

export async function updateVariantAction(input: unknown): Promise<MutationResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid variant" };
  }

  const v = parsed.data;
  const db = createAdminClient();

  const { error } = await db
    .from("product_variants")
    .update({
      title: v.title,
      sku: v.sku?.trim() || null,
      price_cents: v.priceCents,
      low_stock_threshold: v.lowStockThreshold,
      continue_selling_when_out_of_stock: v.continueSellingWhenOutOfStock,
      track_inventory: v.trackInventory,
      active: v.active,
    })
    .eq("id", v.variantId);

  if (error) {
    console.error("[bad-era] variant update failed", error);
    if (error.code === "23505") {
      return { ok: false, message: "Another variant already uses that SKU." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath(`/studio/products/${v.productId}`);
  revalidatePath(`/studio/products/${v.productId}/variants`);
  revalidatePath("/studio/inventory");
  revalidatePath("/shop");

  return { ok: true };
}

/**
 * Archive a variant.
 *
 * Deletion is refused outright when order history references the variant —
 * historical orders must keep rendering from their own snapshots, and a
 * dangling foreign key would break them (Master Spec §10.3.3).
 */
export async function archiveVariantAction(
  variantId: string,
  productId: string,
): Promise<MutationResult> {
  const auth = await assertOwner();
  if (!auth.ok) return auth;

  const db = createAdminClient();

  const { error } = await db
    .from("product_variants")
    .update({ active: false })
    .eq("id", variantId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/studio/products/${productId}/variants`);
  revalidatePath("/studio/inventory");
  return { ok: true };
}
