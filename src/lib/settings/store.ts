import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/db/admin";
import {
  DEFAULT_ORDER_EMAIL_WORDS,
  ORDER_EMAIL_LIMITS,
  type OrderEmailWords,
} from "@/lib/email/order-confirmation";
import type { ShippingRule } from "@/lib/settings/shipping";

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
  returnWindowDays: "returns.window_days",
  orderEmailWords: "email.order_confirmation",
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
 * The owner's shipping rule: a flat charge per order, optionally free over an
 * amount. Read-only and forgiving: null when the flat charge is not set, for
 * the screens that show shipping (Studio, the checkout summary).
 */
export async function readShippingRule(): Promise<ShippingRule | null> {
  const [flat, freeOver] = await Promise.all([
    readSetting(SETTING_KEYS.shippingFlatRateCents),
    readSetting(SETTING_KEYS.shippingFreeThresholdCents),
  ]);

  const cents = z.coerce.number().int().min(0);
  const flatRate = flat === undefined || flat === null ? undefined : cents.safeParse(flat).data;
  if (flatRate === undefined) return null;

  const free =
    freeOver === undefined || freeOver === null ? null : (cents.safeParse(freeOver).data ?? null);
  return { flatRateCents: flatRate, freeOverCents: free };
}

/**
 * The shipping rule, for CHARGING. There is deliberately NO default: the owner
 * has not necessarily supplied a shipping amount, and inventing one would be a
 * fabricated shipping promise (Master Spec §22). Checkout fails loudly until
 * the owner sets it in Studio → Settings.
 */
export async function getShippingRule(): Promise<ShippingRule> {
  const rule = await readShippingRule();
  if (!rule) throw new MissingSettingError(SETTING_KEYS.shippingFlatRateCents);
  return rule;
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

/**
 * Return window, in days (Master Spec §9.1).
 *
 * Unlike flat shipping, a default IS appropriate here: a return policy that
 * silently accepts nothing would be worse than one with a conservative window,
 * and the owner can widen it from Studio without a deploy.
 */
export async function getReturnWindowDays(): Promise<number> {
  const value = await readSetting(SETTING_KEYS.returnWindowDays);
  const parsed = z.coerce.number().int().positive().safeParse(value);
  return parsed.success ? parsed.data : 30;
}

/** What the order confirmation email may hold, as saved from Studio. */
export const orderEmailWordsSchema = z.object({
  subject: z.string().trim().min(1, "The subject cannot be empty.").max(ORDER_EMAIL_LIMITS.subject),
  heading: z.string().trim().max(ORDER_EMAIL_LIMITS.heading),
  message: z.string().trim().max(ORDER_EMAIL_LIMITS.message),
  signOff: z.string().trim().max(ORDER_EMAIL_LIMITS.signOff),
  replyTo: z.union([z.literal(""), z.email("Enter a full email address for replies, or leave it empty.")]),
});

/**
 * The owner's words for the order confirmation email. Falls back to the
 * shipped wording, field by field, so a value saved before a field existed
 * still reads.
 */
export async function readOrderEmailWords(): Promise<OrderEmailWords> {
  const raw = await readSetting(SETTING_KEYS.orderEmailWords);
  const merged = { ...DEFAULT_ORDER_EMAIL_WORDS, ...(typeof raw === "object" && raw ? raw : {}) };
  const parsed = orderEmailWordsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_ORDER_EMAIL_WORDS;
}
