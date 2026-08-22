# Crypto Clarity AI — Portfolio Health Analyzer

A dependency-free, privacy-first browser application for evaluating crypto portfolio structure across 12 risk dimensions.

## Run locally
Open `index.html` with a small static server. No build step is required.

## Hosting
This app is static and can be deployed to Vercel, Cloudflare Pages, Netlify, GitHub Pages, or any static host. `vercel.json` is included for secure response headers.

## Privacy model
Holdings are entered manually and analyzed in the browser. The app does not send portfolio holdings to an application server. Coin symbols are used to request public market data from CoinGecko when live historical metrics are available.

## Migration note
This code was created on the `migration/replit-exit` branch as a non-destructive replacement while the original Replit source is inaccessible. See `MIGRATION_STATUS.md` before any production cutover.
