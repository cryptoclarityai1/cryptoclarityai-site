(() => {
  const pages = {
    koinly: {
      name: 'Koinly',
      utm: 'koinly',
      title: 'Koinly Alternative for Portfolio Risk Analysis | Crypto Clarity AI',
      description: 'Keep Koinly for crypto tax reporting. Add Crypto Clarity AI for concentration, diversification and downside-risk analysis.',
      eyebrow: 'KOINLY VS CRYPTO CLARITY AI',
      jobTitle: 'Built for crypto tax reporting',
      jobCopy: 'Koinly is designed to organize transactions and support crypto tax workflows.',
      intro: 'Keep using Koinly for taxes. Crypto Clarity AI handles a different job: diagnosing concentration, diversification and downside risk across your holdings.',
      bridge: 'Use Koinly for tax reporting. Use CCAI when the question is: “How structurally risky is my portfolio?”'
    },
    cointracker: {
      name: 'CoinTracker',
      utm: 'cointracker',
      title: 'CoinTracker Alternative for Portfolio Risk Analysis | Crypto Clarity AI',
      description: 'Keep CoinTracker for transaction tracking and tax workflows. Add CCAI for focused portfolio-risk diagnostics.',
      eyebrow: 'COINTRACKER VS CRYPTO CLARITY AI',
      jobTitle: 'Built for tracking and tax workflows',
      jobCopy: 'CoinTracker helps monitor holdings and transactions while supporting tax workflows.',
      intro: 'Keep using CoinTracker for tracking and taxes. Crypto Clarity AI handles a different job: diagnosing concentration, diversification and downside risk.',
      bridge: 'Track transactions in CoinTracker. Use CCAI when you need to see whether one position—or one correlated theme—dominates your risk.'
    },
    coinstats: {
      name: 'CoinStats',
      utm: 'coinstats',
      title: 'CoinStats Alternative for Portfolio Risk Analysis | Crypto Clarity AI',
      description: 'Keep CoinStats for monitoring holdings and prices. Add CCAI for concentration, diversification and downside-risk analysis.',
      eyebrow: 'COINSTATS VS CRYPTO CLARITY AI',
      jobTitle: 'Built to monitor holdings and prices',
      jobCopy: 'CoinStats is useful for viewing portfolio balances, assets and day-to-day price movement.',
      intro: 'Keep using CoinStats to monitor holdings and prices. Crypto Clarity AI handles a different job: diagnosing concentration, diversification and downside risk.',
      bridge: 'Watch prices in CoinStats. Use CCAI when you want to understand how portfolio structure could amplify a market shock.'
    },
    delta: {
      name: 'Delta',
      utm: 'delta',
      title: 'Delta Alternative for Crypto Portfolio Analysis | Crypto Clarity AI',
      description: 'Keep Delta for investment tracking. Add CCAI for focused crypto portfolio concentration, correlation and downside analysis.',
      eyebrow: 'DELTA VS CRYPTO CLARITY AI',
      jobTitle: 'Built for investment tracking',
      jobCopy: 'Delta is designed to help users monitor investments, prices and portfolio performance.',
      intro: 'Keep using Delta for investment tracking. Crypto Clarity AI handles a different job: diagnosing crypto concentration, diversification and downside risk.',
      bridge: 'Track performance in Delta. Use CCAI before making a portfolio decision that depends on how the holdings interact under stress.'
    },
    kubera: {
      name: 'Kubera',
      utm: 'kubera',
      title: 'Kubera Alternative for Crypto Risk Analysis | Crypto Clarity AI',
      description: 'Keep Kubera for net-worth tracking. Add CCAI for a focused diagnostic of crypto portfolio risk.',
      eyebrow: 'KUBERA VS CRYPTO CLARITY AI',
      jobTitle: 'Built for net-worth tracking',
      jobCopy: 'Kubera is designed to bring a broad mix of assets into one net-worth view.',
      intro: 'Keep using Kubera for your total net-worth dashboard. Crypto Clarity AI handles a narrower job: diagnosing risk inside the crypto portion of your portfolio.',
      bridge: 'See the big picture in Kubera. Use CCAI to examine concentration, correlation and downside exposure inside your crypto allocation.'
    },
    'best-crypto-portfolio-analyzer': {
      name: 'portfolio trackers',
      utm: 'best_analyzer',
      title: 'Best Crypto Portfolio Analyzer vs Trackers | Crypto Clarity AI',
      description: 'Crypto Clarity AI is an analyzer, not another tracker: portfolio health, concentration, diversification and downside risk for $12 once.',
      eyebrow: 'BEST CRYPTO PORTFOLIO ANALYZER',
      jobTitle: 'Trackers show balances and movement',
      jobCopy: 'Portfolio trackers are useful for monitoring prices, holdings and historical performance.',
      intro: 'If you already know what you own and what moved, the next useful question is why the portfolio may be fragile. CCAI is built to answer that question.',
      bridge: 'Keep your favorite tracker for monitoring. Use CCAI for the decision layer: health, concentration, diversification and downside exposure.'
    }
  };

  const slug = location.pathname.split('/').filter(Boolean).pop() || 'best-crypto-portfolio-analyzer';
  const page = pages[slug] || pages['best-crypto-portfolio-analyzer'];
  const url = new URL('/demo', location.origin);
  url.searchParams.set('utm_source', 'comparison');
  url.searchParams.set('utm_medium', 'organic');
  url.searchParams.set('utm_campaign', 'competitor_exit_ramp');
  url.searchParams.set('utm_content', page.utm);

  document.title = page.title;
  document.getElementById('meta-description').content = page.description;
  document.getElementById('og-title').content = page.title;
  document.getElementById('og-description').content = page.description;
  document.getElementById('comparison-eyebrow').textContent = page.eyebrow;
  document.getElementById('comparison-intro').textContent = page.intro;
  document.getElementById('competitor-label').textContent = page.name.toUpperCase();
  document.getElementById('competitor-job-title').textContent = page.jobTitle;
  document.getElementById('competitor-job-copy').textContent = page.jobCopy;
  document.getElementById('bridge-copy').textContent = page.bridge;

  const canonical = 'https://app.cryptoclarityai.com/compare/' + slug;
  document.getElementById('canonical-link').href = canonical;
  document.getElementById('og-url').content = canonical;

  document.querySelectorAll('.comparison-cta').forEach(link => {
    link.href = url.toString();
    link.addEventListener('click', () => {
      if (window.posthog) {
        posthog.capture('comparison analyzer clicked', {
          competitor: page.utm,
          cta_location: link.dataset.location,
          utm_source: 'comparison',
          utm_medium: 'organic',
          utm_campaign: 'competitor_exit_ramp',
          utm_content: page.utm
        });
      }
    });
  });

  if (window.posthog) {
    posthog.register({comparison_competitor: page.utm});
    posthog.capture('comparison page viewed', {
      competitor: page.utm,
      utm_source: 'comparison',
      utm_medium: 'organic',
      utm_campaign: 'competitor_exit_ramp',
      utm_content: page.utm
    });
  }
})();
