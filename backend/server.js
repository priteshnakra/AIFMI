import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { sectors, allPublicTickers } from './data/companies.js';
import intelligenceRouter from './routes/intelligence.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const POLYGON_KEY = process.env.POLYGON_API_KEY;
const USE_REAL = !!POLYGON_KEY;

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
if (USE_REAL) {
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

} else {
  // ── SIMULATION FALLBACK ──────────────────────────────────────────────────
  console.log('⚠️  No POLYGON_API_KEY — running price simulation');

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
  mode: USE_REAL ? 'live' : 'simulation',
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
  console.log(`💰 Price mode → ${USE_REAL ? '🟢 LIVE (Polygon.io)' : '🟡 Simulated'}`);
  console.log(`📊 Tickers    → ${allPublicTickers.length} across 5 sectors\n`);
});
