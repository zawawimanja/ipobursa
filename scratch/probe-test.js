const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
const targets = [
  ['jina', 'https://r.jina.ai/https://www.isaham.my/ipo'],
  ['allorigins', 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.isaham.my%2Fipo'],
  ['m-subdomain', 'https://m.isaham.my/ipo'],
  ['api-subdomain', 'https://api.isaham.my/ipo'],
  ['app-subdomain', 'https://app.isaham.my/ipo'],
  ['sitemap', 'https://www.isaham.my/sitemap.xml'],
  ['robots', 'https://www.isaham.my/robots.txt'],
];
(async () => {
  for (const [name, url] of targets) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      console.log(`### ${name} | ${url} => ${r.status} | ${t.slice(0, 150).replace(/\s+/g, ' ')}`);
    } catch (e) { console.log(`### ${name} | ${url} => ERROR ${e.message}`); }
  }
})();
