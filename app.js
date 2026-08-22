const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (n, min=0, max=100) => Math.max(min, Math.min(max, n));
const money = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n >= 10000 ? 0 : 2}).format(Number(n)||0);
const pct = (n, digits=1) => `${Number(n||0).toFixed(digits)}%`;
const fmt = (n,d=2) => Number.isFinite(n) ? Number(n).toFixed(d) : '—';

const TRACKING_VERSION = 'ccai-funnel-v1';
let analysisStartedAt = 0;
let demoLoaded = false;

function track(event, properties={}) {
  try {
    window.posthog?.capture?.(event, {
      ...properties,
      product: 'crypto_clarity_ai',
      surface: 'migration_app',
      tracking_version: TRACKING_VERSION,
      page_path: location.pathname,
    });
  } catch {}
}

function attribution() {
  const params = new URLSearchParams(location.search);
  let refSource = '';
  try { refSource = document.referrer ? new URL(document.referrer).hostname : ''; } catch {}
  const utmSource = params.get('utm_source') || '';
  return {
    source: utmSource || refSource || 'direct',
    ref_source: refSource,
    utm_source: utmSource,
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    landing_page: location.origin + location.pathname,
    page_path: location.pathname,
  };
}

function analyticsIds() {
  return {
    analytics_session_id: window.posthog?.get_session_id?.() || '',
    visitor_id: window.posthog?.get_distinct_id?.() || '',
  };
}


const KNOWN = {
  BTC:{id:'bitcoin', tier:'large', group:'btc', fallbackVol:.63, fallbackDD:-.78},
  ETH:{id:'ethereum', tier:'large', group:'eth', fallbackVol:.78, fallbackDD:-.82},
  USDC:{id:'usd-coin', tier:'stable', group:'stable', fallbackVol:.04, fallbackDD:-.15},
  USDT:{id:'tether', tier:'stable', group:'stable', fallbackVol:.04, fallbackDD:-.15},
  DAI:{id:'dai', tier:'stable', group:'stable', fallbackVol:.05, fallbackDD:-.16},
  SOL:{id:'solana', tier:'largeAlt', group:'alt', fallbackVol:.95, fallbackDD:-.88},
  BNB:{id:'binancecoin', tier:'largeAlt', group:'alt', fallbackVol:.72, fallbackDD:-.75},
  XRP:{id:'ripple', tier:'largeAlt', group:'alt', fallbackVol:.82, fallbackDD:-.78},
  ADA:{id:'cardano', tier:'largeAlt', group:'alt', fallbackVol:.88, fallbackDD:-.86},
  DOGE:{id:'dogecoin', tier:'largeAlt', group:'alt', fallbackVol:.98, fallbackDD:-.89},
  AVAX:{id:'avalanche-2', tier:'alt', group:'alt', fallbackVol:1.02, fallbackDD:-.91},
  LINK:{id:'chainlink', tier:'largeAlt', group:'alt', fallbackVol:.86, fallbackDD:-.86},
  DOT:{id:'polkadot', tier:'alt', group:'alt', fallbackVol:.92, fallbackDD:-.91},
  LTC:{id:'litecoin', tier:'largeAlt', group:'alt', fallbackVol:.73, fallbackDD:-.84},
  BCH:{id:'bitcoin-cash', tier:'largeAlt', group:'alt', fallbackVol:.80, fallbackDD:-.89},
  SHIB:{id:'shiba-inu', tier:'alt', group:'alt', fallbackVol:1.12, fallbackDD:-.92},
  PEPE:{id:'pepe', tier:'alt', group:'alt', fallbackVol:1.25, fallbackDD:-.93},
  XLM:{id:'stellar', tier:'largeAlt', group:'alt', fallbackVol:.80, fallbackDD:-.86},
  TRX:{id:'tron', tier:'largeAlt', group:'alt', fallbackVol:.62, fallbackDD:-.70},
  SUI:{id:'sui', tier:'alt', group:'alt', fallbackVol:1.08, fallbackDD:-.90}
};
const WEIGHTS = {concentration:14, diversification:14, volatility:9, liquidity:8, drawdown:9, profitability:6, allocation:8, largeCap:8, altFragility:7, yieldQuality:5, rebalance:6, conviction:6};
const DIM_NAMES = {concentration:'Concentration Risk',diversification:'Diversification',volatility:'Volatility Exposure',liquidity:'Liquidity',drawdown:'Drawdown Risk',profitability:'Profitability Position',allocation:'Allocation Balance',largeCap:'Large-Cap Stability',altFragility:'Altcoin Fragility',yieldQuality:'Yield Quality',rebalance:'Rebalance Readiness',conviction:'Conviction vs Overexposure'};
const STRATEGIES = {
  btcCore:{label:'BTC Core', buckets:{BTC:.50,ETH:.25,STABLE:.15,OTHER:.10}},
  balanced:{label:'Balanced', buckets:{BTC:.35,ETH:.25,STABLE:.20,OTHER:.20}},
  aggressive:{label:'Aggressive Diversification', buckets:{BTC:.25,ETH:.20,STABLE:.10,OTHER:.45}}
};

let activeStrategy = 'btcCore';
let last = null;
let resolvedCache = new Map();
let accessGranted = false;

function addHolding(seed={symbol:'',value:'',apy:''}) {
  const row = document.createElement('div'); row.className='holding-row';
  row.innerHTML = `<input class="symbol" aria-label="Symbol" maxlength="12" placeholder="BTC" value="${seed.symbol||''}"><input class="value" aria-label="USD value" type="number" min="0" step="0.01" placeholder="USD value" value="${seed.value||''}"><div class="apy-wrap"><input class="apy" aria-label="Staking APY" type="number" min="0" step="0.1" placeholder="APY" value="${seed.apy||''}"></div><button class="remove-btn" aria-label="Remove holding">×</button>`;
  row.querySelector('.remove-btn').onclick=()=>{row.remove();updateEnteredTotal();};
  row.querySelectorAll('input').forEach(i=>i.addEventListener('input',updateEnteredTotal));
  row.querySelector('.symbol').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''));
  $('#holdingsRows').appendChild(row); updateEnteredTotal();
}
function holdingsFromForm(){return $$('.holding-row').map(r=>({symbol:r.querySelector('.symbol').value.trim().toUpperCase(),value:Number(r.querySelector('.value').value),apy:Number(r.querySelector('.apy').value)||0})).filter(x=>x.symbol&&x.value>0);}
function updateEnteredTotal(){ $('#enteredTotal').textContent = money(holdingsFromForm().reduce((s,x)=>s+x.value,0)); }
function loadDemo(){ $('#holdingsRows').innerHTML=''; [{symbol:'BTC',value:18000},{symbol:'ETH',value:9000,apy:3.2},{symbol:'SOL',value:6000,apy:6.5},{symbol:'USDC',value:4000,apy:4.1},{symbol:'LINK',value:3000}].forEach(addHolding); }

async function resolveCoin(symbol){
  if(resolvedCache.has(symbol)) return resolvedCache.get(symbol);
  if(KNOWN[symbol]) { resolvedCache.set(symbol,{...KNOWN[symbol],symbol}); return resolvedCache.get(symbol); }
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`);
    if(!r.ok) throw new Error('search'); const j=await r.json();
    const exact=(j.coins||[]).find(c=>String(c.symbol).toUpperCase()===symbol) || (j.coins||[])[0];
    if(exact){const out={id:exact.id,symbol,tier:'alt',group:'alt',fallbackVol:1.05,fallbackDD:-.90};resolvedCache.set(symbol,out);return out;}
  }catch(e){}
  const out={id:null,symbol,tier:'alt',group:'alt',fallbackVol:1.10,fallbackDD:-.92}; resolvedCache.set(symbol,out); return out;
}
async function fetchMarket(coin){
  if(!coin.id) return null;
  try{
    const [chartR,marketR]=await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=180&interval=daily`),
      fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
    ]);
    if(!chartR.ok||!marketR.ok) throw new Error('market');
    const chart=await chartR.json(), market=await marketR.json();
    const prices=(chart.prices||[]).map(p=>Number(p[1])).filter(Number.isFinite);
    if(prices.length<30) throw new Error('history');
    const returns=[]; for(let i=1;i<prices.length;i++) returns.push(prices[i]/prices[i-1]-1);
    const mean=returns.reduce((a,b)=>a+b,0)/returns.length;
    const variance=returns.reduce((s,r)=>s+(r-mean)**2,0)/Math.max(1,returns.length-1);
    const vol=Math.sqrt(variance)*Math.sqrt(365);
    let peak=prices[0], maxDD=0; for(const p of prices){peak=Math.max(peak,p);maxDD=Math.min(maxDD,p/peak-1);}
    const md=market.market_data||{};
    return {prices,returns,vol,maxDD,marketCap:Number(md.market_cap?.usd)||0,volume:Number(md.total_volume?.usd)||0,current:Number(md.current_price?.usd)||prices.at(-1),ath:Number(md.ath?.usd)||0};
  }catch(e){return null;}
}
function correlation(a,b){const n=Math.min(a.length,b.length);if(n<20)return null;const x=a.slice(-n),y=b.slice(-n);const mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n;let num=0,dx=0,dy=0;for(let i=0;i<n;i++){const ax=x[i]-mx,by=y[i]-my;num+=ax*by;dx+=ax*ax;dy+=by*by;}return dx&&dy?num/Math.sqrt(dx*dy):0;}
function tierFromMarketCap(cap,fallback){if(cap>=50e9)return 'large';if(cap>=10e9)return 'largeAlt';if(cap>=1e9)return 'alt';if(cap>0)return 'small';return fallback;}
function stable(symbol){return ['USDC','USDT','DAI','FDUSD','TUSD','USDE'].includes(symbol);}


function setAccess(granted, source='unknown', code='') {
  accessGranted = Boolean(granted);
  if (code) localStorage.setItem('ccai_access_code', code);
  const gate = $('#accessGate');
  if (gate) gate.classList.toggle('unlocked', accessGranted);
  $('.tab[data-requires-access="true"]').forEach((tab) => {
    tab.classList.toggle('locked', !accessGranted);
    tab.setAttribute('aria-disabled', String(!accessGranted));
  });
  if (accessGranted) {
    $('#accessStatus').textContent = 'Lifetime access verified. Full report unlocked.';
    track('access granted', { access_source: source });
  }
  if (last) {
    render(last);
    if (accessGranted) {
      renderRebalance();
      renderFuture();
    }
  }
}

function showAccessGate(message='Full-report access is required for this section.') {
  $('#accessStatus').textContent = message;
  $('#accessGate').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function validateAccessCode(code, source='saved_code') {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return false;
  $('#accessStatus').textContent = 'Verifying lifetime access…';
  try {
    const response = await fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: normalized }),
    });
    const data = await response.json();
    if (response.ok && data.valid) {
      setAccess(true, source, normalized);
      track('access validation succeeded', { access_source: source });
      return true;
    }
  } catch {}
  localStorage.removeItem('ccai_access_code');
  setAccess(false);
  $('#accessStatus').textContent = 'That access code could not be verified.';
  track('access validation failed', { access_source: source });
  return false;
}

async function startCheckout(ctaLocation='report_gate') {
  const button = $('#checkoutBtn');
  button.disabled = true;
  button.textContent = 'Opening secure checkout…';
  const safeProperties = {
    cta_location: ctaLocation,
    offer: 'lifetime_12',
    holding_count: last?.holdings?.length || 0,
  };
  track('checkout started', safeProperties);
  try {
    const response = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...attribution(),
        ...analyticsIds(),
        cta_location: ctaLocation,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.url) throw new Error(data.error || 'checkout_unavailable');
    track('checkout redirected', safeProperties);
    location.assign(data.url);
  } catch {
    button.disabled = false;
    button.textContent = 'Unlock full report — $12';
    $('#accessStatus').textContent = 'Secure checkout is temporarily unavailable. Please try again.';
    track('checkout failed', safeProperties);
  }
}

async function restoreAccess() {
  const code = localStorage.getItem('ccai_access_code');
  if (code) await validateAccessCode(code, 'saved_code');
}

async function handleCheckoutRoute() {
  if (location.pathname === '/checkout/cancel') {
    $('#accessStatus').textContent = 'Checkout canceled. No charge was made.';
    track('checkout canceled', { offer: 'lifetime_12' });
    return;
  }
  const sessionId = window.__ccaiCheckoutSessionId || '';
  if (location.pathname !== '/checkout/success' || !sessionId) return;
  $('#accessStatus').textContent = 'Verifying payment and preparing lifetime access…';
  try {
    const response = await fetch('/api/checkout/session?session_id=' + encodeURIComponent(sessionId));
    const data = await response.json();
    if (!response.ok || !data.paid || !data.access_code) throw new Error('payment_not_verified');
    setAccess(true, 'stripe_checkout', data.access_code);
    $('#accessStatus').textContent = 'Payment verified. Save this lifetime code: ' + data.access_code;
    track('purchase verified', { offer: 'lifetime_12' });
  } catch {
    $('#accessStatus').textContent = 'Payment verification is still pending. Refresh this page in a moment or contact support.';
    track('purchase verification failed', { offer: 'lifetime_12' });
  }
}

async function analyze(){
  const holdings=holdingsFromForm(); if(!holdings.length){alert('Add at least one holding with a USD value.');return;}
  analysisStartedAt = performance.now();
  track('free analysis started', { holding_count: holdings.length, has_staking: holdings.some((h)=>h.apy>0), is_demo: demoLoaded });
  $('#analyzeBtn').disabled=true; $('#analyzeBtn').textContent='Analyzing…'; $('#dataMode').textContent='Fetching available 180-day market history…';
  const total=holdings.reduce((s,h)=>s+h.value,0); holdings.forEach(h=>h.weight=h.value/total);
  const coins=await Promise.all(holdings.map(h=>resolveCoin(h.symbol)));
  const markets=await Promise.all(coins.map(c=>fetchMarket(c)));
  holdings.forEach((h,i)=>{h.coin=coins[i];h.market=markets[i];h.tier=tierFromMarketCap(markets[i]?.marketCap,coins[i].tier);h.group=stable(h.symbol)?'stable':coins[i].group;});
  const liveCount=markets.filter(Boolean).length;
  const scores=scoreDimensions(holdings,total);
  const overall=Math.round(Object.entries(scores).reduce((sum,[k,v])=>sum+v*WEIGHTS[k],0)/Object.values(WEIGHTS).reduce((a,b)=>a+b,0));
  const correlations=buildCorrelation(holdings);
  const stress=stressTests(holdings,total);
  last={holdings,total,scores,overall,correlations,stress,liveCount};
  render(last); renderRebalance(); renderFuture();
  $('#dataMode').textContent=liveCount===holdings.length?'Live mode: 180-day history loaded for every holding via CoinGecko.':`Mixed mode: 180-day history loaded for ${liveCount}/${holdings.length} holdings; unavailable assets use labeled risk fallbacks.`;
  $('#analysisTimestamp').textContent=new Date().toLocaleString(); $('#analyzeBtn').disabled=false; $('#analyzeBtn').textContent='Analyze portfolio';
  track('free analysis completed', {
    holding_count: holdings.length,
    analysis_mode: liveCount===holdings.length ? 'live' : 'mixed',
    duration_ms: Math.round(performance.now()-analysisStartedAt),
    is_demo: demoLoaded,
  });
}

function scoreDimensions(h,total){
  const hhi=h.reduce((s,x)=>s+x.weight*x.weight,0); const effective=1/hhi; const top=Math.max(...h.map(x=>x.weight));
  const concentration=clamp(100-(hhi-.10)/.90*100);
  const pair=buildCorrelation(h); const avgCorr=pair.avg ?? heuristicAvgCorrelation(h);
  const diversification=clamp((Math.min(effective,8)/8*68)+(1-clamp((avgCorr+1)/2,0,1))*32);
  const wVol=h.reduce((s,x)=>s+x.weight*(x.market?.vol??x.coin.fallbackVol),0); const volatility=clamp(100-(wVol-.25)/1.05*100);
  const liquidity=h.reduce((s,x)=>s+x.weight*({large:100,largeAlt:86,alt:68,small:42,stable:96}[x.tier]||55),0);
  const wDD=Math.abs(h.reduce((s,x)=>s+x.weight*(x.market?.maxDD??x.coin.fallbackDD),0)); const drawdown=clamp(100-(wDD-.25)/.72*100);
  const profitability=h.reduce((s,x)=>{const ratio=x.market?.ath?x.market.current/x.market.ath:null;const sc=ratio==null?55:clamp(ratio*110);return s+x.weight*sc;},0);
  const ideal=1/h.length; const drift=h.reduce((s,x)=>s+Math.abs(x.weight-ideal),0)/2; const allocation=clamp(100-drift*130);
  const largeCapShare=h.filter(x=>['BTC','ETH'].includes(x.symbol)||x.tier==='large'||x.group==='stable').reduce((s,x)=>s+x.weight,0); const largeCap=clamp(35+largeCapShare*70);
  const fragileShare=h.filter(x=>['alt','small'].includes(x.tier)&&!['BTC','ETH'].includes(x.symbol)).reduce((s,x)=>s+x.weight,0); const altFragility=clamp(100-fragileShare*92-wDD*15);
  const staked=h.filter(x=>x.apy>0); const stakedWeight=staked.reduce((s,x)=>s+x.weight,0); const yieldQuality=staked.length?clamp(staked.reduce((s,x)=>{const risk=({large:.85,largeAlt:.70,alt:.52,small:.30,stable:.90}[x.tier]||.5);const apyScore=clamp((x.apy/12)*100);return s+x.weight*(.55*apyScore+.45*risk*100);},0)/Math.max(stakedWeight,.0001)):60;
  const target=strategyTargets(h,STRATEGIES.balanced.buckets); const targetDrift=h.reduce((s,x)=>s+Math.abs(x.weight-(target[x.symbol]||0)),0)/2; const rebalance=clamp(100-targetDrift*145);
  const conviction=clamp(top<=.35?95:top<=.50?78:top<=.65?55:top<=.80?32:15);
  return {concentration,diversification,volatility,liquidity,drawdown,profitability,allocation,largeCap,altFragility,yieldQuality,rebalance,conviction};
}
function heuristicAvgCorrelation(h){if(h.length<2)return 1;let vals=[];for(let i=0;i<h.length;i++)for(let j=i+1;j<h.length;j++){const a=h[i],b=h[j];let c=.68;if(a.group==='stable'||b.group==='stable')c=.15;else if(a.symbol==='BTC'&&b.symbol==='ETH')c=.78;else if(['btc','eth'].includes(a.group)&&b.group==='alt'||['btc','eth'].includes(b.group)&&a.group==='alt')c=.72;else if(a.group===b.group)c=.76;vals.push(c);}return vals.reduce((a,b)=>a+b,0)/vals.length;}
function buildCorrelation(h){let vals=[],pairs=[];for(let i=0;i<h.length;i++)for(let j=i+1;j<h.length;j++){const a=h[i],b=h[j];let c=null,mode='estimated';if(a.market?.returns&&b.market?.returns){c=correlation(a.market.returns,b.market.returns);mode='180d';}if(c==null){if(a.group==='stable'||b.group==='stable')c=.15;else if(a.symbol==='BTC'&&b.symbol==='ETH')c=.78;else c=.72;}vals.push(c);pairs.push({a:a.symbol,b:b.symbol,c,mode});}return {avg:vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:null,pairs};}
function stressFactor(h,type){const g=h.group,t=h.tier;if(type==='moderate')return g==='stable'?-0.02:h.symbol==='BTC'?-0.30:h.symbol==='ETH'?-0.38:t==='largeAlt'?-0.45:-0.55;if(type==='2022')return g==='stable'?-0.08:h.symbol==='BTC'?-0.77:h.symbol==='ETH'?-0.82:t==='largeAlt'?-0.88:-0.92;if(type==='2018')return g==='stable'?-0.15:h.symbol==='BTC'?-0.84:h.symbol==='ETH'?-0.94:-0.95;if(type==='severe')return g==='stable'?-0.20:h.symbol==='BTC'?-0.90:h.symbol==='ETH'?-0.95:-0.97;return -.5;}
function stressTests(h,total){return [{key:'moderate',label:'Risk-off shock'},{key:'2022',label:'2022-style unwind'},{key:'2018',label:'2018-style winter'},{key:'severe',label:'Severe tail case'}].map(s=>{const loss=h.reduce((sum,x)=>sum+x.value*stressFactor(x,s.key),0);return {...s,loss,remaining:total+loss,pct:loss/total};});}
function strategyTargets(h,b){const target={};const groups={BTC:h.filter(x=>x.symbol==='BTC'),ETH:h.filter(x=>x.symbol==='ETH'),STABLE:h.filter(x=>x.group==='stable'),OTHER:h.filter(x=>!['BTC','ETH'].includes(x.symbol)&&x.group!=='stable')};
  for(const [bucket,list] of Object.entries(groups)){if(!list.length)continue;const share=b[bucket];const denom=list.reduce((s,x)=>s+x.weight,0)||1;list.forEach(x=>target[x.symbol]=(x.weight/denom)*share);}
  let assigned=Object.values(target).reduce((a,v)=>a+v,0);let missing=1-assigned;if(missing>0){const eligible=h.filter(x=>target[x.symbol]!=null);const denom=eligible.reduce((s,x)=>s+(target[x.symbol]||0),0)||1;eligible.forEach(x=>target[x.symbol]+=(target[x.symbol]/denom)*missing);}
  return target;
}

function rating(score){return score>=70?['Structurally sound','good']:score>=50?['Needs attention','warn']:['Critical vulnerabilities','bad'];}
function render(data){
  const [label,cls]=rating(data.overall); $('#heroScore').textContent=data.overall;$('#healthScore').textContent=data.overall;$('#heroRating').textContent=label;$('#heroRating').className=`rating ${cls}`;$('#healthLabel').textContent=label;
  const sorted=[...data.holdings].sort((a,b)=>b.weight-a.weight);$('#topWeight').textContent=pct(sorted[0].weight*100);$('#topAsset').textContent=sorted[0].symbol;$('#effectiveHoldings').textContent=fmt(1/data.holdings.reduce((s,x)=>s+x.weight*x.weight,0),1);$('#avgCorrelation').textContent=accessGranted?(data.correlations.avg==null?'—':fmt(data.correlations.avg,2)):'••';$('#correlationMode').textContent=accessGranted?(data.correlations.pairs.some(p=>p.mode==='180d')?'180-day + fallback':'estimated'):'Full report';
  $('#heroInsight').textContent=topInsight(data);
  const dimensionEntries=Object.entries(data.scores).sort((a,b)=>a[1]-b[1]);
  const visibleDimensions=accessGranted?dimensionEntries:dimensionEntries.slice(0,3);
  $('#dimensionGrid').className='dimension-grid';
  $('#dimensionGrid').innerHTML=visibleDimensions.map(([k,v])=>`<article class="dimension-card"><div class="dimension-top"><span>${DIM_NAMES[k]}</span><strong>${Math.round(v)}</strong></div><div class="score-bar"><div class="score-fill" style="width:${clamp(v)}%"></div></div></article>`).join('')+(accessGranted?'':`<article class="dimension-card dimension-locked"><div class="dimension-top"><span>9 additional scores</span><strong>••</strong></div><p class="muted small">Unlock the full report to reveal every dimension.</p></article>`);
  $('#allocationBars').className='allocation-bars';$('#allocationBars').innerHTML=sorted.map(x=>`<div class="allocation-row"><strong>${x.symbol}</strong><div class="allocation-track"><div class="allocation-fill" style="width:${x.weight*100}%"></div></div><span>${pct(x.weight*100)}</span></div>`).join('');
  const insights=buildInsights(data);$('#topInsights').innerHTML=insights.map(i=>`<div class="insight ${i.sev||''}">${i.text}</div>`).join('');
  $('#stressGrid').className='stress-grid';$('#stressGrid').innerHTML=data.stress.map(s=>`<article class="stress-card"><span>${s.label}</span><strong>${money(s.loss)}</strong><em>${pct(s.pct*100)} · ${money(s.remaining)} remaining</em><small>Illustrative scenario</small></article>`).join('');
  renderRiskTable(data);
}
function topInsight(d){const top=[...d.holdings].sort((a,b)=>b.weight-a.weight)[0];if(top.weight>.65)return `${top.symbol} is ${pct(top.weight*100)} of the portfolio — concentration is the first structural risk to investigate.`;if(d.correlations.avg>.70)return `Your holdings show high average co-movement, which can create false diversification.`;if(d.scores.drawdown<50)return `Historical/fallback drawdown exposure is the biggest resilience issue in this mix.`;return `No single critical issue dominates; review the lowest-scoring dimensions below.`;}
function buildInsights(d){const out=[];const sorted=[...d.holdings].sort((a,b)=>b.weight-a.weight);if(sorted[0].weight>.50)out.push({sev:'bad',text:`Concentration: ${sorted[0].symbol} represents ${pct(sorted[0].weight*100)} of portfolio value.`});if((d.correlations.avg??0)>.65)out.push({sev:'warn',text:`False-diversification risk: average pairwise correlation is about ${fmt(d.correlations.avg,2)}.`});const fragile=d.holdings.filter(x=>['alt','small'].includes(x.tier)).reduce((s,x)=>s+x.weight,0);if(fragile>.4)out.push({sev:'warn',text:`Altcoin fragility: ${pct(fragile*100)} of value is in higher-volatility alt tiers.`});if(!out.length)out.push({text:'Structure looks comparatively balanced. Use stress tests and rebalance targets to inspect the remaining trade-offs.'});return out.slice(0,4);}
function renderRiskTable(d){const btc=d.holdings.find(x=>x.symbol==='BTC');$('#assetRiskTable').className='table-wrap';$('#assetRiskTable').innerHTML=`<table><thead><tr><th>Asset</th><th>Weight</th><th>Ann. vol</th><th>Max drawdown</th><th>BTC corr.</th><th>Data</th></tr></thead><tbody>${d.holdings.map(x=>{let c='—';if(x.symbol==='BTC')c='1.00';else if(btc?.market?.returns&&x.market?.returns)c=fmt(correlation(btc.market.returns,x.market.returns),2);return `<tr><td><strong>${x.symbol}</strong></td><td>${pct(x.weight*100)}</td><td>${pct((x.market?.vol??x.coin.fallbackVol)*100,0)}</td><td>${pct((x.market?.maxDD??x.coin.fallbackDD)*100,0)}</td><td>${c}</td><td>${x.market?'180d live':'fallback'}</td></tr>`}).join('')}</tbody></table>`;}

function renderRebalance(){if(!last)return;const s=STRATEGIES[activeStrategy],targets=strategyTargets(last.holdings,s.buckets);let turnover=0;const rows=last.holdings.map(x=>{const target=targets[x.symbol]||0,diff=(target-x.weight)*last.total;turnover+=Math.abs(diff);return {...x,target,diff};});$('#rebalanceSummary').className='rebalance-summary';$('#rebalanceSummary').innerHTML=`<strong>${s.label}</strong><br><span class="muted small">Estimated one-way capital to reposition: ${money(turnover/2)}. Target weights are migration defaults pending formula parity validation.</span>`;$('#rebalanceTable').innerHTML=`<table><thead><tr><th>Asset</th><th>Current</th><th>Target</th><th>Dollar move</th><th>Action</th></tr></thead><tbody>${rows.map(r=>{const a=Math.abs(r.diff)<last.total*.005?'Hold':r.diff>0?'Buy':'Trim';const cls=a==='Buy'?'move-buy':a==='Trim'?'move-sell':'move-hold';return `<tr><td><strong>${r.symbol}</strong></td><td>${pct(r.weight*100)}</td><td>${pct(r.target*100)}</td><td>${money(Math.abs(r.diff))}</td><td class="${cls}">${a}</td></tr>`}).join('')}</tbody></table>`;}
function renderFuture(){if(!last)return;const years=Number($('#futureYears').value),monthly=Number($('#monthlyContribution').value)||0;$('#futureYearsLabel').textContent=`${years} year${years===1?'':'s'}`;const stakeBoost=last.holdings.reduce((s,x)=>s+x.weight*(x.apy/100),0);const scenarios=[['Bear',-.04],['Base',.08],['Bull',.18]];$('#futureCards').className='future-grid';$('#futureCards').innerHTML=scenarios.map(([name,r])=>{const annual=r+stakeBoost;const monthlyR=Math.pow(1+annual,1/12)-1;const n=years*12;let fv=last.total*Math.pow(1+monthlyR,n);if(monthly>0)fv+=monthlyR===0?monthly*n:monthly*((Math.pow(1+monthlyR,n)-1)/monthlyR);return `<article class="future-card"><span>${name} scenario · ${(annual*100).toFixed(1)}% incl. weighted APY</span><strong>${money(fv)}</strong><small>${years}y · ${money(monthly)}/mo contribution</small></article>`}).join('');}

$('#addHoldingBtn').onclick=()=>addHolding();
$('#loadDemoBtn').onclick=()=>{demoLoaded=true;track('free demo loaded',{holding_count:5});loadDemo();analyze();};
$('#analyzeBtn').onclick=()=>{demoLoaded=false;analyze();};
$('#openAccessBtn').onclick=()=>showAccessGate('Enter a lifetime code or unlock the complete report for $12.');
$('#checkoutBtn').onclick=()=>startCheckout('report_gate');
$('#accessForm').onsubmit=async(event)=>{event.preventDefault();await validateAccessCode($('#accessCodeInput').value,'manual_code');};
$('.tab').forEach(t=>t.onclick=()=>{
  if(t.dataset.requiresAccess==='true'&&!accessGranted){track('paid feature blocked',{feature:t.dataset.tab});showAccessGate();return;}
  $('.tab').forEach(x=>x.classList.remove('active'));$('.tab-panel').forEach(x=>x.classList.remove('active'));t.classList.add('active');$(`#tab-${t.dataset.tab}`).classList.add('active');track('analysis tab viewed',{tab:t.dataset.tab});
});
$('.strategy').forEach(b=>b.onclick=()=>{$('.strategy').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeStrategy=b.dataset.strategy;renderRebalance();track('rebalance strategy viewed',{strategy:activeStrategy});});
$('#futureYears').oninput=renderFuture;$('#monthlyContribution').oninput=renderFuture;
['BTC','ETH','SOL'].forEach((symbol,i)=>addHolding({symbol,value:i===0?10000:i===1?5000:2500,apy:i===1?3.2:i===2?6.5:''}));
setAccess(false);
restoreAccess();
handleCheckoutRoute();
