const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const symbols = req.query.symbols || '';
  if (!symbols) return res.status(400).json({ error: 'symbols param required' });

  // Step 1: get Yahoo cookie + crumb (required since 2024)
  let cookie = '', crumb = '';
  try {
    const r1 = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }
    });
    const setCookie = r1.headers.get('set-cookie') || '';
    cookie = setCookie.split(',')
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');

    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, 'Cookie': cookie }
    });
    crumb = await r2.text();
  } catch {}

  // Step 2: batch quote request
  try {
    const params = new URLSearchParams({
      symbols,
      fields: 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose',
      ...(crumb ? { crumb } : {})
    });
    const r3 = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?${params}`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    });
    const data = await r3.json();
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
