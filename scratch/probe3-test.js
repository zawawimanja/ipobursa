const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.138 Safari/537.36';
const targets = [
  ['bursa-ipo-upcoming', 'https://www.bursamalaysia.com/api/v1/ipo/listing?type=Upcoming'],
  ['bursa-ipo-opening', 'https://www.bursamalaysia.com/api/v1/ipo/listing?type=Opening'],
  ['bursa-ipo-listed', 'https://www.bursamalaysia.com/api/v1/ipo/listing?type=Listed'],
  ['bursa-page-ipo', 'https://www.bursamalaysia.com/market_information/initial_public_offerings'],
  ['isaham-api2', 'https://api.isaham.my/v1/ipo'],
  ['isaham-api-app', 'https://api.isaham.my/app/ipo'],
  ['isaham-api-mobile', 'https://api.isaham.my/mobile/ipo'],
];
(async () => {
  for (const [name, url] of targets) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      console.log(`### ${name} => ${r.status} | ${t.slice(0, 220).replace(/\s+/g, ' ')}`);
    } catch (e) { console.log(`### ${name} => ERROR ${e.message}`); }
  }
})();
