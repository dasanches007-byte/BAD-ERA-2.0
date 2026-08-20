import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { constructStripeEvent } from '@/lib/payments/stripe/webhook';
import { handleStripeCheckoutEvent } from '@/lib/checkout/stripe-event-handler';
import { commerceRpc } from '@/lib/db/commerce-rpc';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new NextResponse('Missing Stripe signature', { status: 400 });

  // Do not call request.json(). Stripe signature verification requires the unmodified body.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(stripe, rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
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
