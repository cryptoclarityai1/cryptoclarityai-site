import { ensureEntitlement, json, maskEmail, sendAccessEmail, stripeRequest } from '../_lib.mjs';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get('session_id') || '');
    if (!/^cs_(test|live)_/.test(sessionId)) return json({ error: 'Invalid Checkout Session ID.' }, 400);

    const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status !== 'paid') {
      return json({ paid: false, status: session.payment_status || session.status || 'pending' }, 202);
    }

    const entitlement = await ensureEntitlement(session);
    const emailResult = await sendAccessEmail(entitlement);
    return json({
      paid: true,
      access_code: entitlement.accessCode,
      email: maskEmail(entitlement.email),
      emailed: emailResult.sent,
    });
  } catch (error) {
    console.error('checkout_session_verify_failed', error?.message || error);
    return json({ error: 'Payment verification is not configured on this deployment yet.' }, 503);
  }
}

export function POST() {
  return json({ error: 'Method not allowed' }, 405, { allow: 'GET' });
}
