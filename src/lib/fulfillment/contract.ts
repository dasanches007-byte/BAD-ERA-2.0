export type FulfillmentCanonicalStatus =
  | 'pending_submission'
  | 'submitted'
  | 'accepted'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'action_required'
  | 'rejected'
  | 'cancelled';

export type ProviderAvailability = {
  available: boolean;
  quantity?: number;
  rawStatus?: string;
  checkedAt: string;
};

export type ProviderOrderItem = {
  fulfillmentGroupItemId: string;
  variantId: string;
  supplierSku?: string;
  quantity: number;
};

export type ProviderOrderRequest = {
  fulfillmentGroupId: string;
  submissionKey: string;
  shippingAddress: Record<string, unknown>;
  items: ProviderOrderItem[];
};

export type ProviderOrderResult = {
  providerOrderId?: string;
  status: FulfillmentCanonicalStatus;
  rawStatus?: string;
};

export type ProviderTracking = {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: string;
};

export interface FulfillmentProviderAdapter {
  readonly providerKey: string;
  readonly connectionMode: 'internal' | 'manual' | 'api';
  checkAvailability?(providerVariantId: string): Promise<ProviderAvailability>;
  getQuote?(request: ProviderOrderRequest): Promise<{ currency: string; amountCents: number }>;
  submitOrder(request: ProviderOrderRequest): Promise<ProviderOrderResult>;
  cancelOrder?(providerOrderId: string): Promise<ProviderOrderResult>;
  getOrderStatus?(providerOrderId: string): Promise<ProviderOrderResult>;
  getTracking?(providerOrderId: string): Promise<ProviderTracking[]>;
  handleWebhook?(rawBody: string, headers: Headers): Promise<void>;
}
