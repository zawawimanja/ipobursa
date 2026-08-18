const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
(async () => {
  const r = await fetch('https://www.isaham.my/sitemap.xml', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  console.log('SITEMAP length:', t.length);
  const urls = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log('Total URLs:', urls.length);
  const unique = [...new Set(urls.map(u => u.replace(/^\w+:\/\/[^/]+/, '').split('/').slice(0, 3).join('/')))];
  console.log('Path patterns:');
  unique.forEach(u => console.log('  ', u));
  const sample = urls.slice(0, 30);
  console.log('Sample URLs:');
  sample.forEach(u => console.log('  ', u));
})();
