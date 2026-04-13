import express from 'express';

const router = express.Router();

// Allow cross-origin requests from the frontend
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Cache briefings for 10 minutes to avoid hammering the API
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

router.post('/briefing', async (req, res) => {
  const { company, ticker, hq, spec, sector, exchange } = req.body;

  if (!company) return res.status(400).json({ error: 'company required' });

  const cacheKey = `${company}-${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json(cached.data);
  }

  const isPrivate = exchange === 'Private';
  const tickerStr = ticker ? `(${ticker} on ${exchange})` : '(privately held)';

  const prompt = `You are a senior financial analyst specializing in AI and semiconductor companies. 
Generate a concise investor intelligence briefing for: ${company} ${tickerStr}
Sector: ${sector} — ${spec}
HQ: ${hq}

Return ONLY a valid JSON object with exactly this structure:
{
  "summary": "2-3 sentence executive overview of the company's current strategic position and momentum",
  "earnings": {
    "headline": "Most recent earnings headline or funding status",
    "detail": "2-3 sentences on recent financial performance, revenue trends, beats/misses vs expectations, or for private companies: latest funding round details"
  },
  "investments": {
    "headline": "Key recent investment, partnership, or M&A activity",
    "detail": "2-3 sentences on notable capital deployment, strategic partnerships, acquisitions, or investor interest"
  },
  "leadership": {
    "headline": "Leadership or organizational headline",
    "detail": "2-3 sentences on executive changes, new hires, board moves, or leadership strategy signals"
  },
  "products": {
    "headline": "Latest product or technology development",
    "detail": "2-3 sentences on new product launches, patent activity, R&D breakthroughs, or roadmap announcements relevant to AI"
  },
  "outlook": "1-2 sentence forward-looking analyst sentiment and key risks or catalysts to watch",
  "sentiment": "bullish" | "neutral" | "bearish",
  "lastUpdated": "${new Date().toISOString()}"
}

Base this on your training knowledge up to your cutoff. Be specific and factual. Do not include any text outside the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'Claude API error', detail: err });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '';

    let briefing;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      briefing = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: 'Failed to parse Claude response', raw });
    }

    const result = { company, ticker, briefing };
    cache.set(cacheKey, { ts: Date.now(), data: result });
    res.json(result);

  } catch (err) {
    console.error('Intelligence fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
