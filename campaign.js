const clean = (value) => String(value || '')
  .replace(/[^a-zA-Z0-9._~:/?&=+-]/g, '')
  .slice(0, 120);

function campaignAttribution() {
  const params = new URLSearchParams(location.search);
  return {
    source: clean(params.get('utm_source')) || 'ccai_owned',
    utm_source: clean(params.get('utm_source')),
    utm_medium: clean(params.get('utm_medium')),
    utm_campaign: clean(params.get('utm_campaign')) || 'risk_off_stress_test',
    utm_content: clean(params.get('utm_content')),
    page_path: location.pathname,
  };
}

function capture(event, properties = {}) {
  try {
    window.posthog?.capture?.(event, {
      ...campaignAttribution(),
      ...properties,
      product: 'crypto_clarity_ai',
      surface: 'stress_test_campaign',
      tracking_version: 'ccai-funnel-v2',
    });
  } catch {}
}

capture('campaign page viewed');

document.querySelectorAll('[data-campaign-cta]').forEach((link) => {
  link.addEventListener('click', () => capture('campaign demo clicked', {
    cta_location: clean(link.dataset.campaignCta),
  }));
});
