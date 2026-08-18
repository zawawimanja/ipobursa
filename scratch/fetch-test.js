const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
(async () => {
  for (const url of ['https://www.isaham.my/ipo', 'https://www.isaham.my/ipo/miti', 'https://www.isaham.my/ipo/statistics']) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
      const t = await r.text();
      console.log(url, '=>', r.status, t.slice(0, 120).replace(/\s+/g, ' '));
    } catch (e) { console.log(url, '=> ERROR', e.message); }
  }
})();
