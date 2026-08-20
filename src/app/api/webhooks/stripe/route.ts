import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/payments/stripe/client';
import { serverEnv } from '@/lib/env/server';
import { constructStripeEvent } from '@/lib/payments/stripe/webhook';
import { handleStripeCheckoutEvent } from '@/lib/checkout/stripe-event-handler';
import { commerceRpc } from '@/lib/db/commerce-rpc';

export const runtime = 'nodejs';

// The Stripe client and secrets are resolved per-request rather than at module
// scope. See src/lib/payments/stripe/client.ts for why. The webhook semantics
// below are unchanged from Kickoff v0.2.

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new NextResponse('Missing Stripe signature', { status: 400 });

  // Do not call request.json(). Stripe signature verification requires the unmodified body.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(getStripe(), rawBody, signature, serverEnv().STRIPE_WEBHOOK_SECRET);
  } catch {
    return new NextResponse('Invalid Stripe signature', { status: 400 });
  }

  try {
    await handleStripeCheckoutEvent(event, commerceRpc);
    return NextResponse.json({ received: true });
  } catch {
    // 5xx lets Stripe retry transient failures. DB event claiming makes the handler idempotent.
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}
