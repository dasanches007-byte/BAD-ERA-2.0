import type { FulfillmentProviderAdapter, ProviderOrderRequest, ProviderOrderResult } from '../contract';

export class ManualSupplierProvider implements FulfillmentProviderAdapter {
  constructor(readonly providerKey: string) {}
  readonly connectionMode = 'manual' as const;

  async submitOrder(_request: ProviderOrderRequest): Promise<ProviderOrderResult> {
    // The DB already owns a durable supplier_tasks row. No external request is made here.
    return { status: 'pending_submission', rawStatus: 'manual_supplier_task_required' };
  }
}
