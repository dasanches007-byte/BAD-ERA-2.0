/**
 * Client-safe dashboard shapes.
 *
 * Separate from `dashboard.ts`, which is `server-only`. Presentational panels
 * import these so the server-only poison pill never reaches a browser bundle.
 */

export type DashboardSummary = {
  paidRevenueCents: number;
  paidOrderCount: number;
  currency: string;
  awaitingFulfillment: number;
  openIssues: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type RecentOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  totalCents: number;
  currency: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  placedAt: string;
};

export type LowStockRow = {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  available: number;
  lowStockThreshold: number;
};
