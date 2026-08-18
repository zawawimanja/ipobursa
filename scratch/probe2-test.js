const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
const targets = [
  ['ipo-analysis', 'https://www.isaham.my/ipo-analysis'],
  ['insight-5er', 'https://www.isaham.my/ipo/insights/5e-resources-holdings-berhad'],
  ['insight-azam', 'https://www.isaham.my/ipo/insights/azam-jaya'],
  ['stock-insight', 'https://www.isaham.my/stock/dnex/insights'],
  ['ipo-page2', 'https://www.isaham.my/ipo?page=2'],
  ['api-ipo', 'https://api.isaham.my/api/ipo'],
  ['api-v1-ipo', 'https://api.isaham.my/api/v1/ipo'],
  ['api-ipo-list', 'https://api.isaham.my/ipo/list'],
];
(async () => {
  for (const [name, url] of targets) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      const hint = t.match(/f-ipo-card|MITI IPO|Future IPO|statsTable|watchlist|login|challenge|verification|404/i) || [];
      console.log(`### ${name} => ${r.status} | ${hint.slice(0,3).join(' | ') || ''} | ${t.slice(0, 90).replace(/\s+/g, ' ')}`);
    } catch (e) { console.log(`### ${name} => ERROR ${e.message}`); }
  }
})();
