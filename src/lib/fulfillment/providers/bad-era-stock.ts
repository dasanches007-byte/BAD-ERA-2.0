import type { FulfillmentProviderAdapter, ProviderOrderRequest, ProviderOrderResult } from '../contract';

export class BadEraStockProvider implements FulfillmentProviderAdapter {
  readonly providerKey = 'bad-era-stock';
  readonly connectionMode = 'internal' as const;

  async submitOrder(_request: ProviderOrderRequest): Promise<ProviderOrderResult> {
    // Internal stock never sends an external supplier order. The group is ready for owner fulfillment.
    return { status: 'accepted', rawStatus: 'ready_to_ship' };
  }
}
