import type { Enums } from "@/lib/db/generated.types";

/**
 * Client-safe account shapes.
 *
 * Separate from `queries.ts`, which is `server-only`.
 */

export type OrderSummary = {
  id: string;
  orderNumber: string;
  placedAt: string;
  totalCents: number;
  currency: string;
  paymentStatus: Enums<"payment_status">;
  fulfillmentStatus: Enums<"order_fulfillment_status">;
  returnStatus: Enums<"order_return_status">;
  itemCount: number;
};

export type SavedAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefaultShipping: boolean;
};
