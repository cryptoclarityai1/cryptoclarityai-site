# Payment + lifetime access cutover

This document is the remaining server-side portion of the Replit exit. The analyzer itself is already browser-side and deploys on Vercel.

## What has been scaffolded

- `POST /api/checkout/create` creates the current one-time lifetime Stripe Checkout.
- `GET /api/checkout/session?session_id=...` verifies a paid Checkout Session server-side and creates/returns a deterministic lifetime access code.
- `POST /api/stripe/webhook` verifies Stripe's raw-body signature before fulfilling purchases or revoking entitlements for refunds/disputes.
- `POST /api/access/validate` validates an access code against a server-only entitlement store.
- `supabase/migrations/001_ccai_entitlements.sql` creates the locked-down entitlement table with RLS enabled and no browser-readable policies.

## Required environment variables

Configure these only in the production/preview hosting secret store; never commit their real values.

- `STRIPE_SECRET_KEY` — Stripe server secret.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook endpoint that points at the new deployment.
- `STRIPE_PRICE_ID` — current launch price is `price_1TvhyIRvOfYhdwHMWFmdE7jB`; override this in test environments with a test-mode price.
- `ACCESS_CODE_SECRET` — at least 32 random bytes of secret material. Keep stable because lifetime codes are deterministically derived from this secret plus the Checkout Session ID.
- `SUPABASE_URL` — the intended production entitlement-store project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key for the entitlement store.
- `APP_URL` — `https://app.cryptoclarityai.com` in production.
- Optional: `RESEND_API_KEY` and `ACCESS_EMAIL_FROM` for emailing access codes after verified payment.

## Safe activation order

1. Confirm which Supabase project is the intended production entitlement store.
2. Apply `supabase/migrations/001_ccai_entitlements.sql` to that project.
3. Configure the environment variables on the Vercel project.
4. In a test/preview environment, use Stripe test-mode secrets and a test-mode lifetime price.
5. Create a **new test webhook** pointing to `/api/stripe/webhook` and verify successful Checkout fulfillment, code display, code validation, refund revocation and signature rejection.
6. Configure live secrets only after the test flow passes.
7. Create/enable the live webhook on the new deployment while leaving the existing production Replit webhook untouched during parallel testing.
8. Run end-to-end live verification with the smallest safe internal transaction/refund workflow.
9. Only after payment + entitlement parity passes, move `app.cryptoclarityai.com` to Vercel and update/retire the old webhook endpoint.
10. Monitor live events, then cancel Replit Core / paid deployment.

## Security decisions

- No Stripe or Supabase server secret is included in browser JavaScript.
- Entitlement rows are inaccessible to anonymous/authenticated browser roles.
- Plaintext lifetime codes are not stored in Supabase; the table stores SHA-256 hashes.
- A lifetime code is reproducible server-side from the paid Stripe Checkout Session ID using `ACCESS_CODE_SECRET`, allowing the verified success page to recover it without storing plaintext.
- Webhook signatures use the raw request body and reject timestamps older than five minutes.
- Refund/dispute events revoke matching entitlements by Stripe PaymentIntent ID.
- The migration branch does not change the existing production Stripe webhook or DNS.

## Current production discovery

The current production checkout is a $12 one-time lifetime purchase. Current Stripe sessions use price `price_1TvhyIRvOfYhdwHMWFmdE7jB`, product `prod_UVsSdj80BQUjuX`, and return to `app.cryptoclarityai.com` after Checkout. The currently enabled production webhook points to `https://app.cryptoclarityai.com/api/stripe/webhook`, which is why DNS must remain unchanged until the new serverless route is fully configured and tested.
