import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const campaignHtml = fs.readFileSync(new URL('../stress-test.html', import.meta.url), 'utf8');
const campaignJs = fs.readFileSync(new URL('../campaign.js', import.meta.url), 'utf8');
const vercel = fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');

assert.match(html, /posthog\.init\('phc_/);
assert.match(html, /autocapture:false/);
assert.match(html, /disable_session_recording:true/);
assert.match(html, /id="accessGate"/);
assert.match(html, /id="checkoutBtn"/);
assert.match(html, /3 of 12 factor scores/);
assert.match(html, /\$12 USD one-time launch price/);
assert.match(html, /No subscription/);
assert.match(html, /No wallet, exchange account, seed phrase or API key is required/);
assert.doesNotMatch(html, /MIGRATION BUILD|7-day money-back guarantee|Your analysis stays in this browser/);

for (const event of [
  'free analysis started',
  'free analysis completed',
  'checkout started',
  'checkout redirected',
  'purchase verified',
  'access validation succeeded',
]) {
  assert.ok(app.includes(event), 'missing funnel event: ' + event);
}

assert.ok(app.includes("fetch('/api/checkout/create'"), 'checkout UI must use the server-side creation endpoint');
assert.ok(app.includes("fetch('/api/access/validate'"), 'access codes must be verified server-side');
assert.ok(app.includes('window.__ccaiCheckoutSessionId'), 'success routing must use the redacted session handoff');
assert.ok(app.includes('...attribution()'), 'funnel events must carry privacy-safe attribution');
assert.ok(app.includes('sessionStorage.setItem(ATTRIBUTION_KEY'), 'campaign attribution must survive the landing-to-checkout session');
const literalTrackCalls = [...app.matchAll(/track\\((['"])[^'"]+\\1,\\s*\\{([\\s\\S]*?)\\}\\s*\\)/g)];
for (const call of literalTrackCalls) {
  assert.ok(!/\\b(symbol|value|apy|access_code|session_id)\\s*:/i.test(call[2]), 'analytics events must not include portfolio or access credential properties');
}

assert.match(campaignHtml, /2022-style, 2018-style and severe-tail scenarios/);
assert.match(campaignHtml, /not a prediction, backtest or promise/i);
assert.match(campaignHtml, /\$12 USD once, regularly \$19, with no subscription/);
assert.match(campaignHtml, /utm_campaign=risk_off_stress_test/);
assert.ok((campaignHtml.match(/data-campaign-cta=/g) || []).length >= 3, 'campaign needs separately attributed CTAs');
assert.ok(campaignJs.includes("capture('campaign page viewed')"), 'campaign view must be tracked');
assert.ok(campaignJs.includes("capture('campaign demo clicked'"), 'campaign CTA clicks must be tracked');
assert.match(vercel, /"source": "\/stress-test"/);

console.log('tracking and access-gate smoke tests passed');
