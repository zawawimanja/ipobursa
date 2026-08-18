const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
const paths = [
  '/v1/auth/login', '/v1/auth/register', '/v1/auth/token', '/v1/auth/refresh', '/v1/auth/me',
  '/v1/login', '/v1/register', '/v1/session', '/v1/user/login', '/v1/user', '/v1/me',
  '/v1/ipo/upcoming?limit=5', '/v1/ipo/upcoming/all', '/v1/ipo/list/upcoming',
  '/v1/ipo/statistics', '/v1/ipo/miti', '/v1/ipo/listed',
  '/v1/miti', '/v1/miti/ipo', '/v1/ipo_applications', '/v1/ipo/application',
];
(async () => {
  for (const p of paths) {
    try {
      const r = await fetch('https://api.isaham.my' + p, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Content-Type': 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
      const t = await r.text();
      const code = (() => { try { return JSON.parse(t).error?.code || ''; } catch { return ''; } })();
      if (r.status !== 404) console.log(`>> ${p} => ${r.status} | ${code} | ${t.slice(0, 130).replace(/\s+/g, ' ')}`);
    } catch (e) { /* skip */ }
  }
})();
