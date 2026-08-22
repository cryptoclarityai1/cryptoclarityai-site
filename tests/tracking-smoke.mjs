import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

assert.match(html, /posthog\.init\('phc_/);
assert.match(html, /autocapture:false/);
assert.match(html, /disable_session_recording:true/);
assert.match(html, /id="accessGate"/);
assert.match(html, /id="checkoutBtn"/);

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
assert.ok(!/track\([^;]{0,500}\b(symbol|value|apy|access_code|session_id)\b/i.test(app), 'analytics events must not include portfolio or access credentials');

console.log('tracking and access-gate smoke tests passed');
