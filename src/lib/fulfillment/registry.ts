import type { FulfillmentProviderAdapter } from './contract';
import { BadEraStockProvider } from './providers/bad-era-stock';
import { ManualSupplierProvider } from './providers/manual-supplier';

const adapters = new Map<string, FulfillmentProviderAdapter>();
adapters.set('bad-era-stock', new BadEraStockProvider());

export function registerProvider(adapter: FulfillmentProviderAdapter): void {
  if (adapters.has(adapter.providerKey)) throw new Error(`Provider already registered: ${adapter.providerKey}`);
  adapters.set(adapter.providerKey, adapter);
}

export function getProvider(providerKey: string, connectionMode?: 'internal' | 'manual' | 'api'): FulfillmentProviderAdapter {
  const existing = adapters.get(providerKey);
  if (existing) return existing;
  if (connectionMode === 'manual') return new ManualSupplierProvider(providerKey);
  throw new Error(`No fulfillment adapter registered for provider: ${providerKey}`);
}
