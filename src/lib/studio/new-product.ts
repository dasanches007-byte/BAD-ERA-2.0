import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type { SetPieceCandidate } from "@/lib/studio/new-product-types";

/**
 * Reads behind the New product page.
 *
 * Set pieces are single (non-set) products that are not archived, with their
 * ACTIVE variants only — `studio_create_product` refuses anything else, so the
 * form never offers it. Drafts are included: the owner creates the Tee and the
 * Crossbody as drafts, then builds the Era Set from them before anything goes
 * live.
 */
export async function listSetPieceCandidates(): Promise<SetPieceCandidate[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("products")
    .select(
      `id, title, handle, product_type,
       product_options(id, name, position),
       product_variants(id, title, position, active,
         variant_option_values(option_id, product_option_values(value)))`,
    )
    .eq("kind", "standard")
    .is("archived_at", null)
    .order("title");

  if (error) throw error;

  return (data ?? []).map((product) => {
    const options = [...(product.product_options ?? [])].sort((a, b) => a.position - b.position);
    const variants = [...(product.product_variants ?? [])]
      .filter((variant) => variant.active)
      .sort((a, b) => a.position - b.position)
      .map((variant) => {
        const links = variant.variant_option_values ?? [];
        return {
          id: variant.id,
          title: variant.title,
          values: options.map(
            (option) =>
              links.find((link) => link.option_id === option.id)?.product_option_values?.value ?? "",
          ),
        };
      })
      // A variant missing a value for one of its product's options cannot be
      // described as a choice of the set, so it is not offered.
      .filter((variant) => variant.values.every(Boolean));

    return {
      productId: product.id,
      title: product.title,
      handle: product.handle,
      productType: product.product_type,
      optionNames: options.map((option) => option.name),
      variants,
    };
  });
}

/** Every web address already taken, so the form can warn before submitting. */
export async function listProductHandles(): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("products").select("handle");
  if (error) throw error;
  return (data ?? []).map((row) => String(row.handle));
}
