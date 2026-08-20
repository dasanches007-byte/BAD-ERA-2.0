import type { CommerceRpc } from '@/lib/checkout/stripe-event-handler';

// v0.2 defines this boundary. v0.3 implements it with the server-only Supabase admin client.
export const commerceRpc: CommerceRpc = {
  async claimStripeEvent() { throw new Error('v0.3 implementation required'); },
  async finishStripeEvent() { throw new Error('v0.3 implementation required'); },
  async checkoutIdFromStripeSession() { throw new Error('v0.3 implementation required'); },
  async convertPaidCheckout() { throw new Error('v0.3 implementation required'); },
  async markCheckoutPaymentPending() { throw new Error('v0.3 implementation required'); },
  async releaseCheckoutInventory() { throw new Error('v0.3 implementation required'); },
};
