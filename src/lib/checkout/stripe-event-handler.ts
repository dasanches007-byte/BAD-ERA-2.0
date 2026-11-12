import type Stripe from 'stripe';

export type CommerceRpc = {
  claimStripeEvent(eventId: string, eventType: string, payloadHash?: string): Promise<boolean>;
  finishStripeEvent(eventId: string, status: 'processed' | 'ignored' | 'failed', error?: string): Promise<void>;
  checkoutIdFromStripeSession(stripeSessionId: string): Promise<string | null>;
  convertPaidCheckout(checkoutId: string, stripeSessionId: string, paymentIntentId: string | null): Promise<string>;
  markCheckoutPaymentPending(checkoutId: string): Promise<void>;
  releaseCheckoutInventory(checkoutId: string, status: 'expired' | 'payment_failed' | 'cancelled'): Promise<void>;
};

/**
 * Handle one verified Stripe event. Returns the id of the order this event
 * converted a checkout into, or null when it converted nothing (so the caller
 * can send the order confirmation AFTER the commerce work is committed).
 */
export async function handleStripeCheckoutEvent(event: Stripe.Event, db: CommerceRpc): Promise<string | null> {
  const claimed = await db.claimStripeEvent(event.id, event.type);
  if (!claimed) return null;
  let convertedOrderId: string | null = null;

  try {
    if (!event.type.startsWith('checkout.session.')) {
      await db.finishStripeEvent(event.id, 'ignored');
      return null;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutId = await db.checkoutIdFromStripeSession(session.id);
    if (!checkoutId) throw new Error(`Unknown Stripe Checkout Session: ${session.id}`);

    switch (event.type) {
      case 'checkout.session.completed':
        if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
          convertedOrderId = await db.convertPaidCheckout(checkoutId, session.id, typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null);
        } else {
          await db.markCheckoutPaymentPending(checkoutId);
        }
        break;
      case 'checkout.session.async_payment_succeeded':
        convertedOrderId = await db.convertPaidCheckout(checkoutId, session.id, typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null);
        break;
      case 'checkout.session.async_payment_failed':
        await db.releaseCheckoutInventory(checkoutId, 'payment_failed');
        break;
      case 'checkout.session.expired':
        await db.releaseCheckoutInventory(checkoutId, 'expired');
        break;
      default:
        await db.finishStripeEvent(event.id, 'ignored');
        return null;
    }

    await db.finishStripeEvent(event.id, 'processed');
    return convertedOrderId;
  } catch (error) {
    await db.finishStripeEvent(event.id, 'failed', error instanceof Error ? error.message : 'unknown error');
    throw error;
  }
}
