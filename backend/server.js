import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { sectors, allPublicTickers } from './data/companies.js';
import intelligenceRouter from './routes/intelligence.js';

const app = express();
app.use(cors({ origin: ['https://aifmi-frontend.vercel.app', 'http://localhost:5173'], credentials: true }));
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const POLYGON_KEY = process.env.POLYGON_API_KEY;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const USE_POLYGON = !!POLYGON_KEY;
const USE_FINNHUB = !POLYGON_KEY && !!FINNHUB_KEY;
const USE_REAL = USE_POLYGON || USE_FINNHUB;

// ── Price state ────────────────────────────────────────────────────────────
// Stores current price + open price (for day change calculation)
const prices = {};      // ticker -> { price, open, prev }
const dayOpen = {};     // ticker -> open price for the session

// US-listed tickers only (Polygon free tier covers these)
const US_TICKERS = allPublicTickers.filter(t =>
  !['688521','688256','688981','285A','000660','2454','6533'].includes(t)
);

// ── Seed fallback prices ───────────────────────────────────────────────────
const BASE_PRICES = {
  NVDA: 118.50, AMD: 100.20, INTC: 22.40, QCOM: 155.30, ARM: 122.80,
  MBLY: 14.20,  CBRS: 8.40,  BZAI: 3.10,  IMG: 1.85,   MRVL: 68.90,
  TSM: 190.40,  SSNLF: 12.20, GFS: 35.60, UMC: 7.80,   MU: 95.40,
  WDC: 48.20,   ASML: 780.30, AMAT: 175.20, LRCX: 720.50, KLAC: 620.80,
  ASX: 9.40,    AMKR: 22.10,  ENTG: 90.20, ONTO: 130.40, COHU: 18.60,
  KLIC: 48.90,  AVGO: 228.40, GOOGL: 175.80, AMZN: 202.30, MSFT: 415.20,
  META: 580.90, AAPL: 225.40, TSLA: 258.70, BABA: 108.20, BIDU: 88.40,
  CSCO: 52.40,  ANET: 390.20, JNPR: 38.90,  CRDO: 32.40,  AWE: 0.88,
  COHR: 82.40,  SCMR: 0.12,   NXPI: 188.40, STM: 28.20,
  RNECF: 14.40, TXN: 178.40,  MCHP: 48.20,  BRN: 0.32,
};

for (const ticker of allPublicTickers) {
  const base = BASE_PRICES[ticker] ?? (Math.random() * 150 + 20);
  prices[ticker] = { price: base, open: base, prev: base };
  dayOpen[ticker] = base;
}

// ── Helper: build price update payload ────────────────────────────────────
function buildUpdate(ticker, currentPrice) {
  const open = dayOpen[ticker] ?? currentPrice;
  const prev = prices[ticker]?.price ?? currentPrice;
  prices[ticker] = { price: currentPrice, open, prev };
  return {
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat((currentPrice - open).toFixed(2)),
    changePct: parseFloat(((currentPrice / open - 1) * 100).toFixed(3)),
  };
}

// ── Broadcast to all dashboard clients ────────────────────────────────────
function broadcast(type, data) {
  const payload = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function snapshot() {
  const out = {};
  for (const ticker of allPublicTickers) {
    const p = prices[ticker];
    if (!p) continue;
    const open = dayOpen[ticker] ?? p.price;
    out[ticker] = {
      price: parseFloat(p.price.toFixed(2)),
      change: parseFloat((p.price - open).toFixed(2)),
      changePct: parseFloat(((p.price / open - 1) * 100).toFixed(3)),
    };
  }
  return out;
}

// ── POLYGON.IO REAL PRICE FEED ─────────────────────────────────────────────
if (USE_POLYGON) {
  console.log('📡 Connecting to Polygon.io WebSocket for live prices...');

  let polyWs;
  let authenticated = false;
  let subscribed = false;

  function connectPolygon() {
    polyWs = new WebSocket('wss://socket.polygon.io/stocks');

    polyWs.on('open', () => {
      console.log('✅ Polygon WebSocket connected');
    });

    polyWs.on('message', (raw) => {
      let msgs;
      try { msgs = JSON.parse(raw.toString()); } catch { return; }
      if (!Array.isArray(msgs)) msgs = [msgs];

      for (const msg of msgs) {
        // Auth flow
        if (msg.ev === 'status' && msg.status === 'connected') {
          polyWs.send(JSON.stringify({ action: 'auth', params: POLYGON_KEY }));
        }

        if (msg.ev === 'status' && msg.status === 'auth_success') {
          console.log('✅ Polygon authenticated');
          authenticated = true;
          // Subscribe to all US tickers: second trades (T.*) and quotes (Q.*)
          const subs = US_TICKERS.map(t => `T.${t}`).join(',');
          polyWs.send(JSON.stringify({ action: 'subscribe', params: subs }));
          subscribed = true;
          console.log(`📊 Subscribed to ${US_TICKERS.length} tickers`);
        }

        if (msg.ev === 'status' && msg.status === 'auth_failed') {
          console.error('❌ Polygon auth failed — check your API key');
        }

        // Trade event — real last sale price
        if (msg.ev === 'T' && msg.sym) {
          const ticker = msg.sym;
          const price = msg.p; // trade price
          if (!price || !prices[ticker]) continue;

          // Set open price once per session
          if (!dayOpen[ticker] || dayOpen[ticker] === BASE_PRICES[ticker]) {
            // fetch day open separately if we don't have it
            dayOpen[ticker] = dayOpen[ticker] ?? price;
          }

          const update = buildUpdate(ticker, price);
          broadcast('PRICE_UPDATE', { [ticker]: update });
        }

        // Aggregate minute bar — fallback for low-volume tickers
        if (msg.ev === 'AM' && msg.sym) {
          const ticker = msg.sym;
          const price = msg.c; // close of minute bar
          if (!price || !prices[ticker]) continue;
          if (!dayOpen[ticker]) dayOpen[ticker] = msg.o;
          const update = buildUpdate(ticker, price);
          broadcast('PRICE_UPDATE', { [ticker]: update });
        }
      }
    });

    polyWs.on('close', () => {
      console.log('⚠️  Polygon disconnected — reconnecting in 5s...');
      authenticated = false;
      subscribed = false;
      setTimeout(connectPolygon, 5000);
    });

    polyWs.on('error', (err) => {
      console.error('Polygon WS error:', err.message);
    });
  }

  // Fetch previous close prices to seed day open accurately
  async function fetchPrevClose() {
    console.log('📈 Fetching previous close prices from Polygon REST...');
    // Batch in groups of 10 to avoid rate limits
    const batches = [];
    for (let i = 0; i < US_TICKERS.length; i += 10) {
      batches.push(US_TICKERS.slice(i, i + 10));
    }
    for (const batch of batches) {
      await Promise.all(batch.map(async (ticker) => {
        try {
          const res = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_KEY}`
          );
          const data = await res.json();
          const result = data?.results?.[0];
          if (result) {
            dayOpen[ticker] = result.o;  // previous open
            const prevClose = result.c;
            prices[ticker] = { price: prevClose, open: result.o, prev: prevClose };
            console.log(`  ${ticker}: prev close $${prevClose}`);
          }
        } catch (e) {
          // silent — keep seed price
        }
      }));
      await new Promise(r => setTimeout(r, 200)); // small delay between batches
    }
    console.log('✅ Previous close prices loaded');
    // Broadcast updated snapshot to any connected clients
    broadcast('SNAPSHOT', snapshot());
  }

  fetchPrevClose().then(() => connectPolygon());

} else if (USE_FINNHUB) {
  // ── FINNHUB REAL PRICE FEED (free tier — real US quotes via REST polling) ──
  console.log('📡 Using Finnhub for live prices (REST polling)...');

  // Finnhub free tier: 60 calls/min. We poll each US ticker's /quote endpoint.
  // Quote response: { c: current, d: change, dp: changePct, h, l, o: open, pc: prevClose }
  async function fetchFinnhubQuotes() {
    const updates = {};
    // Throttle: ~50 calls/min ceiling. Space requests ~250ms apart.
    for (const ticker of US_TICKERS) {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`
        );
        if (!res.ok) continue;
        const q = await res.json();
        // c = current price; pc = previous close (used as the day baseline)
        if (q && typeof q.c === 'number' && q.c > 0) {
          // Anchor day-change to previous close so % matches what users see elsewhere
          if (typeof q.pc === 'number' && q.pc > 0) dayOpen[ticker] = q.pc;
          updates[ticker] = buildUpdate(ticker, q.c);
        }
      } catch (e) {
        // silent — keep last known price for this ticker
      }
      await new Promise(r => setTimeout(r, 250)); // ~4 req/sec, safely under 60/min
    }
    if (Object.keys(updates).length > 0) {
      broadcast('PRICE_UPDATE', updates);
    }
    return updates;
  }

  // Initial fetch, then refresh on an interval.
  fetchFinnhubQuotes().then((u) => {
    console.log(`✅ Finnhub: loaded real prices for ${Object.keys(u).length}/${US_TICKERS.length} US tickers`);
    broadcast('SNAPSHOT', snapshot());
  });

  // Full refresh cycle. ~35 tickers × 250ms ≈ 9s per cycle; refresh every 60s.
  setInterval(fetchFinnhubQuotes, 60000);

} else {
  // ── SIMULATION FALLBACK ──────────────────────────────────────────────────
  console.log('⚠️  No POLYGON_API_KEY or FINNHUB_API_KEY — running price simulation');

  setInterval(() => {
    const updates = {};
    for (const ticker of allPublicTickers) {
      const prev = prices[ticker]?.price ?? BASE_PRICES[ticker] ?? 50;
      const drift = (Math.random() - 0.499) * 0.003;
      const reversion = ((BASE_PRICES[ticker] ?? prev) - prev) * 0.0002;
      const next = Math.max(0.01, prev * (1 + drift + reversion));
      updates[ticker] = buildUpdate(ticker, next);
    }
    broadcast('PRICE_UPDATE', updates);
  }, 3000);
}

// ── REST endpoints ─────────────────────────────────────────────────────────
app.get('/api/sectors', (req, res) => res.json(sectors));

app.get('/api/prices', (req, res) => res.json(snapshot()));

app.get('/api/sectors/:id', (req, res) => {
  const sector = sectors[req.params.id];
  if (!sector) return res.status(404).json({ error: 'Sector not found' });
  const snap = snapshot();
  res.json({
    ...sector,
    companies: sector.companies.map(c => ({
      ...c,
      priceData: c.ticker && snap[c.ticker] ? snap[c.ticker] : null,
    }))
  });
});

app.get('/api/health', (req, res) => res.json({
  ok: true,
  mode: USE_POLYGON ? 'live-polygon' : USE_FINNHUB ? 'live-finnhub' : 'simulation',
  tickers: allPublicTickers.length,
  ts: Date.now(),
}));

app.use('/api/intelligence', intelligenceRouter);

// ── WebSocket handshake ────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'SNAPSHOT', data: snapshot(), ts: Date.now() }));
});

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 AIFMI API  → http://localhost:${PORT}`);
  console.log(`📡 WebSocket  → ws://localhost:${PORT}`);
  console.log(`💰 Price mode → ${USE_POLYGON ? '🟢 LIVE (Polygon.io)' : USE_FINNHUB ? '🟢 LIVE (Finnhub)' : '🟡 Simulated'}`);
  console.log(`📊 Tickers    → ${allPublicTickers.length} across 5 sectors\n`);
});

// Chart proxy - fetches from Yahoo Finance server-side to avoid CORS
app.get('/api/chart/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const { interval = '1d', range = '1mo' } = req.query;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// EPS + key stats from Yahoo Finance
app.get('/api/stats/:ticker', async (req, res) => {
  const { ticker } = req.params;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics,financialData`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    const data = await r.json();
    const ks = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
    const fd = data?.quoteSummary?.result?.[0]?.financialData;
    res.json({
      eps: ks?.trailingEps?.raw ?? null,
      debtToEquity: fd?.debtToEquity?.raw ?? null,
      returnOnEquity: fd?.returnOnEquity?.raw ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Portfolio AI Analysis ──────────────────────────────────────────────────
app.post('/api/portfolio/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: true }); }
});

// ── AI Intelligence Briefing ───────────────────────────────────────────────
app.post('/api/intelligence/briefing', async (req, res) => {
  try {
    const { ticker, name, sector, price, marketCap, peRatio, roe, eps } = req.body;
    const prompt = `You are a senior equity analyst at a top investment bank. Write a concise AI intelligence briefing for ${name} (${ticker}), a ${sector} sector company.

Current Data:
- Price: $${price || 'N/A'}
- Market Cap: ${marketCap || 'N/A'}
- P/E Ratio: ${peRatio || 'N/A'}
- ROE: ${roe || 'N/A'}
- EPS: ${eps || 'N/A'}

Respond with ONLY valid JSON, no markdown, no backticks:
{"verdict":"BULLISH|BEARISH|NEUTRAL","summary":"2-3 sentence executive summary","strengths":["strength 1","strength 2","strength 3"],"risks":["risk 1","risk 2"],"catalysts":["catalyst 1","catalyst 2"],"analystNote":"one sharp sentence a Wall Street analyst would say right now"}

Be specific. Reference real products, recent earnings, and market dynamics. No generic statements.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    console.error('Briefing error:', e.message);
    res.status(500).json({ error: true, message: e.message });
  }
});
