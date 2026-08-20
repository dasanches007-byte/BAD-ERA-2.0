import Stripe from 'stripe';

export function constructStripeEvent(stripe: Stripe, rawBody: string, signature: string, webhookSecret: string): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
