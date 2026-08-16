import crypto from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function stripeRequest(path, { method = 'GET', body } = {}) {
  const headers = {
    authorization: `Bearer ${requiredEnv('STRIPE_SECRET_KEY')}`,
  };
  if (body) headers['content-type'] = 'application/x-www-form-urlencoded';

  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || `Stripe request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export function verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  return signatures.some((candidate) => safeHexEqual(candidate, expected));
}

function safeHexEqual(a, b) {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length !== b.length) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function deriveAccessCode(sessionId) {
  const digest = crypto
    .createHmac('sha256', requiredEnv('ACCESS_CODE_SECRET'))
    .update(sessionId, 'utf8')
    .digest();
  let chars = '';
  for (let i = 0; i < 16; i += 1) chars += CODE_ALPHABET[digest[i] % CODE_ALPHABET.length];
  return `CCAI-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12, 16)}`;
}

export function normalizeAccessCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function hashAccessCode(code) {
  return crypto.createHash('sha256').update(normalizeAccessCode(code), 'utf8').digest('hex');
}

export async function supabaseRequest(path, { method = 'GET', body, prefer } = {}) {
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const url = `${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}${path}`;
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  };
  if (prefer) headers.prefer = prefer;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) throw new Error(`Entitlement store request failed (${response.status})`);
  return data;
}

export async function ensureEntitlement(session) {
  if (!session?.id || session.payment_status !== 'paid') throw new Error('Checkout session is not paid');
  const email = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (!email) throw new Error('Paid Checkout Session has no customer email');

  const accessCode = deriveAccessCode(session.id);
  const row = {
    email,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent || null,
    access_code_hash: hashAccessCode(accessCode),
    status: 'active',
    amount_total: Number.isFinite(session.amount_total) ? session.amount_total : null,
    currency: session.currency || null,
    updated_at: new Date().toISOString(),
    revoked_at: null,
    revocation_reason: null,
  };

  await supabaseRequest('/rest/v1/ccai_entitlements?on_conflict=stripe_checkout_session_id', {
    method: 'POST',
    body: row,
    prefer: 'resolution=merge-duplicates,return=minimal',
  });

  return { accessCode, email };
}

export async function revokeByPaymentIntent(paymentIntentId, reason) {
  if (!paymentIntentId) return;
  const encoded = encodeURIComponent(paymentIntentId);
  await supabaseRequest(`/rest/v1/ccai_entitlements?stripe_payment_intent_id=eq.${encoded}`, {
    method: 'PATCH',
    body: {
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=minimal',
  });
}

export function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return '';
  const visible = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}`;
  return `${visible}@${domain}`;
}

export async function sendAccessEmail({ email, accessCode }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ACCESS_EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: 'email_provider_not_configured' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Crypto Clarity AI lifetime access code',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Crypto Clarity AI</h2><p>Your lifetime access code is:</p><p style="font-size:22px;font-weight:700;letter-spacing:1px">${accessCode}</p><p>Keep this code for future access. If you did not make this purchase, contact support@cryptoclarityai.com.</p></div>`,
      text: `Crypto Clarity AI\n\nYour lifetime access code is: ${accessCode}\n\nKeep this code for future access. If you did not make this purchase, contact support@cryptoclarityai.com.`,
    }),
  });

  if (!response.ok) return { sent: false, reason: `email_provider_error_${response.status}` };
  return { sent: true };
}
