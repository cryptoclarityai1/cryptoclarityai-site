import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  deriveAccessCode,
  hashAccessCode,
  normalizeAccessCode,
  verifyStripeSignature,
} from '../api/_lib.mjs';

process.env.ACCESS_CODE_SECRET = 'test-only-access-secret-with-more-than-32-bytes';

const sessionA = 'cs_test_example_session_a';
const sessionB = 'cs_test_example_session_b';
const codeA1 = deriveAccessCode(sessionA);
const codeA2 = deriveAccessCode(sessionA);
const codeB = deriveAccessCode(sessionB);

assert.equal(codeA1, codeA2, 'same paid session must reproduce the same lifetime code');
assert.notEqual(codeA1, codeB, 'different sessions must not share a code');
assert.match(codeA1, /^CCAI-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/);
assert.equal(normalizeAccessCode(`  ${codeA1.toLowerCase()}  `), codeA1);
assert.equal(hashAccessCode(codeA1), hashAccessCode(codeA1.toLowerCase()));

const webhookSecret = 'stripe-test-webhook-secret';
const rawBody = JSON.stringify({ id: 'evt_test_123', type: 'checkout.session.completed' });
const timestamp = Math.floor(Date.now() / 1000);
const signature = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');
const header = `t=${timestamp},v1=${signature}`;

assert.equal(verifyStripeSignature(rawBody, header, webhookSecret), true, 'valid signature must pass');
assert.equal(verifyStripeSignature(`${rawBody} `, header, webhookSecret), false, 'mutated payload must fail');
assert.equal(verifyStripeSignature(rawBody, `t=${timestamp - 1000},v1=${signature}`, webhookSecret), false, 'stale timestamps must fail');

console.log('payment smoke tests passed');
