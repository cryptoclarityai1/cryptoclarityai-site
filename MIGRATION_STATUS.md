# Crypto Clarity AI — Replit Exit Migration

## Goal
Move the Portfolio Health Analyzer off Replit so ordinary product updates no longer require Replit Core or Replit Agent usage.

## Current status
- Migration branch: `migration/replit-exit`
- Draft pull request: `#1`
- Production remains untouched.
- Replit Agent spend for this migration: **$0**.
- Original Replit source has **not** been retrieved because the Replit connector is unavailable.
- This branch contains a clean-room browser-side replacement built from verified public CCAI product behavior and connected project materials.
- Vercel Git integration is deploying the migration branch successfully as a preview.
- Static CI checks pass on the migration branch.
- Privacy-safe PostHog funnel instrumentation is implemented on the migration branch.
- A $12 checkout/access gate now limits free analysis to three risk dimensions and routes verified buyers through the server-side entitlement flow.

## What this replacement already covers
- Manual holdings entry; no wallet connection.
- 0–100 overall health score.
- 12 named portfolio health dimensions.
- HHI concentration and effective holdings.
- 180-day CoinGecko history when available.
- Annualized volatility, max drawdown, pairwise/BTC correlation.
- Four crash stress tests in dollars.
- Three rebalancing modes with exact dollar moves.
- Staking-aware bear/base/bull future-value scenarios.
- Funnel events for free analysis, paid-feature interest, checkout, verified purchase and access validation.
- Analytics payloads exclude coin symbols, portfolio values, APYs, access codes and Checkout Session IDs.
- Responsive, dependency-free static UI suitable for Vercel or Cloudflare Pages.

## Production payment architecture discovered
- Current production does **not** primarily use the older $5 Payment Link for the present launch offer.
- Current production creates **$12 one-time lifetime Checkout Sessions** using Stripe price `price_1TvhyIRvOfYhdwHMWFmdE7jB` for product `prod_UVsSdj80BQUjuX` (`Crypto Clarity AI — Lifetime Access`).
- Current production Checkout success/cancel URLs point back to `app.cryptoclarityai.com` and include the Checkout Session ID.
- The active production Stripe webhook endpoint is `https://app.cryptoclarityai.com/api/stripe/webhook`.
- Therefore **DNS must not be moved away from the current app until that API route and access fulfillment are securely rehosted**. A static redirect page alone is not sufficient payment fulfillment.
- An older $5 one-time Payment Link still exists in Stripe, but it does not appear to be the current $12 launch checkout flow and has not been modified.

## Deliberately not migrated yet
1. **Checkout creation + paid access fulfillment.** The current production app creates $12 Stripe Checkout Sessions and processes Stripe events at `/api/stripe/webhook`. The server-side source/secrets for this route are not available through the current connections, so this has not been guessed or weakened.
2. **Paid access-code validation/delivery.** Buyers are promised access after payment. The replacement must securely verify completed payment before granting access and preserve a recoverable lifetime entitlement.
3. **Exact proprietary scoring weights/formulas.** Public materials disclose HHI, 12 dimensions, 180-day metrics and that concentration/diversification carry the most weight, but not every threshold. This build uses transparent migration defaults and labels them accordingly.
4. **Exact original rebalancing target formulas.** Three strategy modes are preserved, but target bucket percentages are migration defaults pending parity validation.
5. **DNS/custom-domain cutover.** `app.cryptoclarityai.com` should remain on the current production app until preview parity and payment/access fulfillment are verified.

## Cutover checklist
- [ ] Compare output against the current Replit app on at least 5 saved/sample portfolios.
- [ ] Replace migration scoring defaults with exact original thresholds if/when source is recovered.
- [ ] Rehost secure Stripe Checkout creation for the $12 lifetime product.
- [ ] Rehost `/api/stripe/webhook` with Stripe signature verification and idempotent fulfillment.
- [ ] Implement recoverable lifetime access entitlement/access-code validation.
- [ ] Confirm refund/dispute events revoke or flag access as intended.
- [ ] Confirm refund/support workflow still points to the correct product/payment configuration.
- [x] Deploy migration preview on Vercel through Git integration.
- [x] Replace obsolete Python CI with static-app checks.
- [x] Static JavaScript syntax / required-file CI checks pass.
- [x] Add privacy-safe PostHog initialization and explicit funnel events.
- [x] Add free-report gating and connect the $12 checkout/access UI to the scaffolded APIs.
- [ ] Confirm events arrive in PostHog project 537425 from the Vercel preview.
- [ ] Mobile, tablet and desktop QA on the preview.
- [ ] Validate CoinGecko rate-limit/fallback behavior.
- [ ] Point `app.cryptoclarityai.com` to the new deployment only after all above items pass.
- [ ] Confirm Stripe webhook points at the new production backend after domain cutover.
- [ ] Then cancel Replit Core / disable paid Replit deployment.

## Cost guardrail
Do not run Replit Agent work unless explicitly necessary, and never exceed the user's **$2 total Replit-work cap**. Current migration Replit Agent spend is **$0**.
