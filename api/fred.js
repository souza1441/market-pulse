const FRED_KEY = '2c90738d3be6aa669519bbb8c311a711';
const BASE = 'https://api.stlouisfed.org/fred/series/observations';

const SERIES = [
  { id: 'UNRATE',   label: 'Unemployment Rate',    suffix: '%', desc: 'Latest monthly rate' },
  { id: 'PAYEMS',   label: 'Nonfarm Payrolls',     suffix: 'K', div: 1000, desc: 'Total employed (000s)' },
  { id: 'CPIAUCSL', label: 'CPI Index',             suffix: '',  desc: 'All-Urban Consumer Price Index' },
  { id: 'FEDFUNDS', label: 'Fed Funds Rate',        suffix: '%', desc: 'Current policy rate' },
  { id: 'JTSJOL',   label: 'Job Openings (JOLTS)',  suffix: 'M', div: 1000, desc: 'Total nonfarm openings' },
  { id: 'DGORDER',  label: 'Durable Goods Orders',  suffix: 'B', div: 1000, desc: 'New orders ($B)' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const results = await Promise.allSettled(
      SERIES.map(s =>
        fetch(`${BASE}?series_id=${s.id}&api_key=${FRED_KEY}&sort_order=desc&limit=1&file_type=json`)
          .then(r => r.json())
          .then(d => d.observations?.[0] ?? null)
      )
    );

    const data = SERIES.map((s, i) => {
      const obs = results[i].status === 'fulfilled' ? results[i].value : null;
      if (!obs || obs.value === '.') return { ...s, display: null, date: null };
      const raw = parseFloat(obs.value);
      const display = s.div
        ? (raw / s.div).toFixed(1) + s.suffix
        : raw.toFixed(2) + s.suffix;
      return { ...s, display, date: obs.date };
    });

    res.json({ data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
