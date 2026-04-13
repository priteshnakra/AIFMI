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

const FINNHUB_KEY = process.env.FINNHUB_KEY;
const prices = {};

const US_TICKERS = allPublicTickers.filter(t =>
  !['688521','688256','688981','285A','000660','2454','6533'].includes(t)
);

const BASE_PRICES = {
  NVDA: 165.17, AMD: 196.04, INTC: 41.19, QCOM: 127.07, ARM: 136.96,
  MBLY: 6.56, CBRS: 8.40, BZAI: 3.10, IMG: 1.85, MRVL: 68.90,
  TSM: 190.40, SSNLF: 12.20, GFS: 35.60, UMC: 7.80, MU: 95.40,
  WDC: 48.20, ASML: 780.30, AMAT: 175.20, LRCX: 720.50, KLAC: 620.80,
  ASX: 9.40, AMKR: 22.10, ENTG: 90.20, ONTO: 130.40, COHU: 18.60,
  KLIC: 48.90, AVGO: 228.40, GOOGL: 175.80, AMZN: 202.30, MSFT: 415.20,
  META: 580.90, AAPL: 225.40, TSLA: 258.70, BABA: 108.20, BIDU: 88.40,
  CSCO: 52.40, ANET: 390.20, JNPR: 38.90, CRDO: 32.40, AWE: 0.88,
  COHR: 82.40, SCMR: 0.12, NXPI: 188.40, STM: 28.20,
  RNECF: 14.40, TXN: 178.40, MCHP: 48.20, BRN: 0.32,
};

for (const ticker of allPublicTickers) {
  const base = BASE_PRICES[ticker] ?? (Math.random() * 150 + 20);
  prices[ticker] = { price: base, change: 0, changePct: 0 };
}

function broadcast(type, data) {
  const payload = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function snapshot() {
  const out = {};
  for (const [ticker, p] of Object.entries(prices)) {
    out[ticker] = {
      price: parseFloat((p.price ?? 0).toFixed(2)),
      change: parseFloat((p.change ?? 0).toFixed(2)),
      changePct: parseFloat((p.changePct ?? 0).toFixed(3)),
    };
  }
  return out;
}

async function fetchAllPrices() {
  if (!FINNHUB_KEY) return;
  console.log('📈 Fetching prices from Finnhub...');
  const updates = {};
  let success = 0;

  await Promise.all(US_TICKERS.map(async (ticker, i) => {
    await new Promise(r => setTimeout(r, i * 80));
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`
      );
      const q = await res.json();
      if (!q?.c || q.c === 0) {
        console.log(`  ${ticker}: no data`);
        return;
      }
      prices[ticker] = { price: q.c, change: q.d ?? 0, changePct: q.dp ?? 0 };
      updates[ticker] = {
        price: parseFloat(q.c.toFixed(2)),
        change: parseFloat((q.d ?? 0).toFixed(2)),
        changePct: parseFloat((q.dp ?? 0).toFixed(3)),
      };
      console.log(`  ✅ ${ticker}: $${q.c.toFixed(2)} ${q.dp >= 0 ? '+' : ''}${q.dp?.toFixed(2)}%`);
      success++;
    } catch (e) {
      console.error(`  ${ticker}:`, e.message);
    }
  }));

  if (Object.keys(updates).length > 0) {
    broadcast('PRICE_UPDATE', updates);
    console.log(`✅ Updated ${success}/${US_TICKERS.length} tickers`);
  }
}

if (FINNHUB_KEY) {
  fetchAllPrices().then(() => {
    broadcast('SNAPSHOT', snapshot());
    setInterval(fetchAllPrices, 60000);
  });
} else {
  console.log('⚠️  No FINNHUB_KEY — running simulation');
  setInterval(() => {
    const updates = {};
    for (const ticker of allPublicTickers) {
      const prev = prices[ticker]?.price ?? BASE_PRICES[ticker] ?? 50;
      const base = BASE_PRICES[ticker] ?? prev;
      const drift = (Math.random() - 0.499) * 0.003;
      const next = Math.max(0.01, prev * (1 + drift));
      const change = next - base;
      const changePct = (change / base) * 100;
      prices[ticker] = { price: next, change, changePct };
      updates[ticker] = {
        price: parseFloat(next.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(3)),
      };
    }
    broadcast('PRICE_UPDATE', updates);
  }, 3000);
}

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
app.get('/api/health', (req, res) => res.json({ ok: true, mode: FINNHUB_KEY ? 'finnhub' : 'simulation', ts: Date.now() }));
app.use('/api/intelligence', intelligenceRouter);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'SNAPSHOT', data: snapshot(), ts: Date.now() }));
});

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 AIFMI API  → http://localhost:${PORT}`);
  console.log(`💰 Price mode → ${FINNHUB_KEY ? '🟢 Finnhub (60 req/min, 60s refresh)' : '🟡 Simulated'}`);
  console.log(`📊 Tickers    → ${allPublicTickers.length} across 5 sectors\n`);
});
