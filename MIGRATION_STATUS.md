# Crypto Clarity AI — Replit Exit Migration

## Goal
Move the Portfolio Health Analyzer off Replit so ordinary product updates no longer require Replit Core or Replit Agent usage.

## Current status
- Migration branch: `migration/replit-exit`
- Production remains untouched.
- Replit Agent spend for this migration: **$0**.
- Original Replit source has **not** been retrieved because the Replit connector is unavailable.
- This branch contains a clean-room browser-side replacement built from verified public CCAI product behavior and connected project materials.

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
- Responsive, dependency-free static UI suitable for Vercel or Cloudflare Pages.

## Deliberately not migrated yet
1. **Paid access-code validation.** The public site says buyers receive an access code after Stripe payment, but the original validation source is not available. Do not cut production over until this is replaced safely.
2. **Exact proprietary scoring weights/formulas.** Public materials disclose HHI, 12 dimensions, 180-day metrics and that concentration/diversification carry the most weight, but not every threshold. This build uses transparent migration defaults and labels them accordingly.
3. **Exact original rebalancing target formulas.** Three strategy modes are preserved, but target bucket percentages are migration defaults pending parity validation.
4. **DNS/custom-domain cutover.** `app.cryptoclarityai.com` should remain on the current production app until preview parity and payment access are verified.

## Cutover checklist
- [ ] Compare output against the current Replit app on at least 5 saved/sample portfolios.
- [ ] Replace migration scoring defaults with exact original thresholds if/when source is recovered.
- [ ] Implement secure paid access-code flow (recommended: Stripe webhook + Supabase table/RPC or equivalent serverless validation).
- [ ] Confirm refund/support workflow still points to the correct product/payment configuration.
- [ ] Deploy preview on Vercel.
- [ ] Mobile, tablet and desktop QA.
- [ ] Validate CoinGecko rate-limit/fallback behavior.
- [ ] Point `app.cryptoclarityai.com` to the new deployment only after all above items pass.
- [ ] Then cancel Replit Core / disable paid Replit deployment.

## Important pricing note
Connected Stripe currently contains a live one-time Crypto Clarity AI Payment Link at $5, while the current public site advertises a $12 launch price / $19 regular price. Resolve this mismatch before production cutover; this branch intentionally does not modify Stripe.
