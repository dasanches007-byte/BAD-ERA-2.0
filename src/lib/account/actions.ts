"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAccountIdentity } from "@/lib/account/session";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Customer account mutations.
 *
 * Every action re-resolves the caller's own identity and scopes the write to
 * their `customerId`. The id is never accepted from the client — that would let
 * anyone edit another customer's profile by changing a form field.
 */

export type AccountResult = { ok: true } | { ok: false; message: string };

const profileSchema = z.object({
  firstName: z.string().max(80).nullable(),
  lastName: z.string().max(80).nullable(),
  phone: z.string().max(40).nullable(),
  marketingOptIn: z.boolean(),
});

export async function updateProfileAction(
  formData: FormData,
): Promise<AccountResult> {
  const identity = await getAccountIdentity();
  if (!identity) return { ok: false, message: "Please sign in again." };

  const parsed = profileSchema.safeParse({
    firstName: (formData.get("firstName") as string) || null,
    lastName: (formData.get("lastName") as string) || null,
    phone: (formData.get("phone") as string) || null,
    marketingOptIn: formData.get("marketingOptIn") === "on",
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("customers")
    .update({
      first_name: parsed.data.firstName?.trim() || null,
      last_name: parsed.data.lastName?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      marketing_opt_in: parsed.data.marketingOptIn,
    })
    // Scoped to the caller's own record, resolved server-side.
    .eq("id", identity.customerId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}

const addressSchema = z.object({
  label: z.string().max(60).nullable(),
  recipientName: z.string().min(1, "Recipient name is required").max(120),
  company: z.string().max(120).nullable(),
  line1: z.string().min(1, "Address is required").max(200),
  line2: z.string().max(200).nullable(),
  city: z.string().min(1, "City is required").max(120),
  region: z.string().min(1, "State or region is required").max(120),
  postalCode: z.string().min(1, "Postal code is required").max(30),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, "Country must be a two-letter code such as US"),
  phone: z.string().max(40).nullable(),
  isDefaultShipping: z.boolean(),
});

function readAddress(formData: FormData) {
  return {
    label: (formData.get("label") as string) || null,
    recipientName: (formData.get("recipientName") as string) ?? "",
    company: (formData.get("company") as string) || null,
    line1: (formData.get("line1") as string) ?? "",
    line2: (formData.get("line2") as string) || null,
    city: (formData.get("city") as string) ?? "",
    region: (formData.get("region") as string) ?? "",
    postalCode: (formData.get("postalCode") as string) ?? "",
    countryCode: ((formData.get("countryCode") as string) ?? "").toUpperCase(),
    phone: (formData.get("phone") as string) || null,
    isDefaultShipping: formData.get("isDefaultShipping") === "on",
  };
}

export async function saveAddressAction(
  formData: FormData,
): Promise<AccountResult> {
  const identity = await getAccountIdentity();
  if (!identity) return { ok: false, message: "Please sign in again." };

  const parsed = addressSchema.safeParse(readAddress(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid address" };
  }

  const addressId = (formData.get("addressId") as string) || null;
  const db = createAdminClient();
  const a = parsed.data;

  // A partial unique index allows only one default per customer, so clear the
  // previous default before setting a new one rather than letting the insert
  // fail on a constraint the customer cannot interpret.
  if (a.isDefaultShipping) {
    const { error } = await db
      .from("customer_addresses")
      .update({ is_default_shipping: false })
      .eq("customer_id", identity.customerId)
      .eq("is_default_shipping", true);
    if (error) return { ok: false, message: error.message };
  }

  const row = {
    customer_id: identity.customerId,
    label: a.label?.trim() || null,
    recipient_name: a.recipientName.trim(),
    company: a.company?.trim() || null,
    line1: a.line1.trim(),
    line2: a.line2?.trim() || null,
    city: a.city.trim(),
    region: a.region.trim(),
    postal_code: a.postalCode.trim(),
    country_code: a.countryCode,
    phone: a.phone?.trim() || null,
    is_default_shipping: a.isDefaultShipping,
  };

  const { error } = addressId
    ? await db
        .from("customer_addresses")
        .update(row)
        .eq("id", addressId)
        // Ownership check: an id from the form is never trusted on its own.
        .eq("customer_id", identity.customerId)
    : await db.from("customer_addresses").insert(row);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddressAction(
  addressId: string,
): Promise<AccountResult> {
  const identity = await getAccountIdentity();
  if (!identity) return { ok: false, message: "Please sign in again." };

  const db = createAdminClient();
  const { error } = await db
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", identity.customerId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/addresses");
  return { ok: true };
}
