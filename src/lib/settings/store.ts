import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/db/admin";

/**
 * Typed access to `site_settings`.
 *
 * Operational values the owner controls — flat shipping, low-stock thresholds,
 * store identity — live here so they can change from Studio without a code
 * deployment (Master Spec §8.1, §10.3.9).
 *
 * `visibility` marks what may reach a browser: only `public` rows are safe to
 * serialise into a client payload. Never widen that.
 */

export const SETTING_KEYS = {
  shippingFlatRateCents: "shipping.flat_rate_cents",
  shippingFreeThresholdCents: "shipping.free_threshold_cents",
  storeCurrency: "store.currency",
  lowStockLimitedAt: "inventory.limited_availability_at",
  lowStockFewAt: "inventory.only_a_few_left_at",
} as const;

export class MissingSettingError extends Error {
  readonly status = 409;

  constructor(readonly key: string) {
    super(
      `Required store setting "${key}" is not configured. Set it in Studio → Settings before this operation can run.`,
    );
    this.name = "MissingSettingError";
  }
}

async function readSetting(key: string): Promise<unknown> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? undefined;
}

/**
 * Flat shipping charge, in cents.
 *
 * There is deliberately NO default. The owner has not yet supplied a shipping
 * amount, and inventing one would be a fabricated shipping promise
 * (Master Spec §22). Checkout fails loudly until it is configured.
 */
export async function getFlatShippingCents(): Promise<number> {
  const raw = await readSetting(SETTING_KEYS.shippingFlatRateCents);
  if (raw === undefined || raw === null) {
    throw new MissingSettingError(SETTING_KEYS.shippingFlatRateCents);
  }

  const parsed = z.coerce.number().int().min(0).safeParse(raw);
  if (!parsed.success) {
    throw new MissingSettingError(SETTING_KEYS.shippingFlatRateCents);
  }
  return parsed.data;
}

/** Store currency. Defaults to USD, which is a store fact rather than a promise. */
export async function getStoreCurrency(): Promise<string> {
  const raw = await readSetting(SETTING_KEYS.storeCurrency);
  const parsed = z
    .string()
    .regex(/^[A-Z]{3}$/)
    .safeParse(raw);
  return parsed.success ? parsed.data : "USD";
}

/** Storefront stock-messaging thresholds (Master Spec §14.3.4 defaults). */
export async function getStockThresholds(): Promise<{
  limitedAvailabilityAt: number;
  onlyAFewLeftAt: number;
}> {
  const [limited, few] = await Promise.all([
    readSetting(SETTING_KEYS.lowStockLimitedAt),
    readSetting(SETTING_KEYS.lowStockFewAt),
  ]);

  const int = z.coerce.number().int().min(0);
  return {
    limitedAvailabilityAt: int.safeParse(limited).data ?? 10,
    onlyAFewLeftAt: int.safeParse(few).data ?? 4,
  };
}
