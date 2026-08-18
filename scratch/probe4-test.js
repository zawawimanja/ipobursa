const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
const paths = [
  '/api/v1/ipo', '/api/v1/ipo/upcoming', '/api/v1/ipo/listing', '/api/v1/ipo/statistics',
  '/api/v1/ipo/miti', '/api/v1/ipo/all', '/api/v1/ipo/list',
  '/api/ipo', '/api/ipo/upcoming', '/api/ipo/listing', '/api/ipo/statistics', '/api/ipo/miti',
  '/api/ipo/list', '/api/ipo/all',
  '/v1/ipo', '/v1/ipo/upcoming', '/v1/ipo/listing', '/v1/ipo/statistics', '/v1/ipo/miti',
  '/ipo', '/ipo/upcoming', '/ipo/listing', '/ipo/statistics', '/ipo/miti',
  '/api/v1/equities', '/api/v1/screener', '/v1/screener', '/api/screener',
  '/api/v1/news', '/health', '/api/health'
];
(async () => {
  let found = 0;
  for (const p of paths) {
    try {
      const r = await fetch('https://api.isaham.my' + p, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Content-Type': 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
      const t = await r.text();
      if (r.status !== 404) {
        console.log(`>> ${p} => ${r.status} | ${t.slice(0, 150).replace(/\s+/g, ' ')}`);
        found++;
      }
    } catch (e) { /* skip */ }
  }
  console.log(`non-404 endpoints: ${found}`);
})();
