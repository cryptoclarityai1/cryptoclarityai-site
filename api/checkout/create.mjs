import { json, stripeRequest } from '../_lib.mjs';

const CURRENT_LIFETIME_PRICE = 'price_1TvhyIRvOfYhdwHMWFmdE7jB';

function safeMeta(value, max = 120) {
  return String(value || '').replace(/[\r\n\0]/g, ' ').slice(0, max);
}

export async function POST(request) {
  try {
    let input = {};
    try { input = await request.json(); } catch {}

    const requestUrl = new URL(request.url);
    const appUrl = (process.env.APP_URL || requestUrl.origin).replace(/\/$/, '');
    const priceId = process.env.STRIPE_PRICE_ID || CURRENT_LIFETIME_PRICE;
    const params = new URLSearchParams();

    params.set('mode', 'payment');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${appUrl}/checkout/cancel`);
    params.set('allow_promotion_codes', 'true');
    params.set('customer_creation', 'if_required');
    params.set('metadata[cc_tier]', 'lifetime');
    params.set('metadata[cc_launch_offer]', 'direct-12');

    const metadata = {
      cc_attr_source: input.source,
      cc_attr_ref_source: input.ref_source,
      cc_attr_utm_source: input.utm_source,
      cc_attr_utm_medium: input.utm_medium,
      cc_attr_utm_campaign: input.utm_campaign,
      cc_attr_landing_page: input.landing_page,
      cc_attr_page_path: input.page_path,
      cc_attr_cta_location: input.cta_location,
      cc_attr_session_id: input.analytics_session_id,
      cc_attr_visitor_id: input.visitor_id,
    };
    for (const [key, value] of Object.entries(metadata)) {
      if (value) params.set(`metadata[${key}]`, safeMeta(value));
    }

    const session = await stripeRequest('/checkout/sessions', { method: 'POST', body: params });
    return json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('checkout_create_failed', error?.message || error);
    return json({ error: 'Unable to start checkout right now.' }, 503);
  }
}

export function GET() {
  return json({ error: 'Method not allowed' }, 405, { allow: 'POST' });
}
