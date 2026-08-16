import {
  ensureEntitlement,
  json,
  requiredEnv,
  revokeByPaymentIntent,
  sendAccessEmail,
  verifyStripeSignature,
} from '../_lib.mjs';

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    const secret = requiredEnv('STRIPE_WEBHOOK_SECRET');
    if (!verifyStripeSignature(rawBody, signature, secret)) {
      return json({ error: 'Invalid webhook signature.' }, 400);
    }
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error('stripe_webhook_verification_failed', error?.message || error);
    return json({ error: 'Invalid webhook payload.' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data?.object;
        if (session?.payment_status === 'paid') {
          const entitlement = await ensureEntitlement(session);
          await sendAccessEmail(entitlement);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data?.object;
        await revokeByPaymentIntent(charge?.payment_intent, 'charge_refunded');
        break;
      }
      case 'charge.dispute.created': {
        const charge = event.data?.object;
        await revokeByPaymentIntent(charge?.payment_intent, 'charge_dispute_created');
        break;
      }
      default:
        break;
    }
    return json({ received: true });
  } catch (error) {
    // Returning non-2xx lets Stripe retry transient fulfillment failures.
    console.error('stripe_webhook_fulfillment_failed', event?.id, event?.type, error?.message || error);
    return json({ error: 'Fulfillment failed; retry requested.' }, 500);
  }
}

export function GET() {
  return json({ error: 'Method not allowed' }, 405, { allow: 'POST' });
}
