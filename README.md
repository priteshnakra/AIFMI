# AI Financial Market Indicator (AIFMI)

Real-time financial dashboard tracking the top 20 companies across 5 AI technology sectors.

## Sectors Covered
- **GPU** — Graphics & AI Processing Units
- **Microchip** — Foundries, Memory, Equipment
- **ASIC** — Application-Specific Integrated Circuits
- **NPU** — Neural Processing Units
- **Networking** — AI Interconnects & Infrastructure

---

## Quick Start (macOS, fresh machine)

### 1. Run the setup script
```bash
chmod +x scripts/setup.sh
bash scripts/setup.sh
```
This installs Homebrew, Node.js 20, Git, and all project dependencies automatically.

### 2. Start both servers
```bash
npm run dev
```

- **Dashboard** → http://localhost:5173
- **API** → http://localhost:3001

---

## Manual Setup (if you prefer)

```bash
# Install Node.js via Homebrew
brew install node@20

# Install all dependencies
npm run install:all

# Start dev servers
npm run dev
```

---

## Project Structure

```
aifmi/
├── package.json          # Root — runs both servers with concurrently
├── scripts/
│   └── setup.sh          # One-command macOS setup
├── backend/
│   ├── server.js         # Express API + WebSocket price server
│   ├── data/
│   │   └── companies.js  # All 100 companies across 5 sectors
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx           # Main dashboard UI
        └── hooks/
            └── useLivePrices.js  # WebSocket price hook
```

---

## Connecting Real Market Data

The backend currently simulates price movements for development.
To connect live data, replace the price simulation in `backend/server.js` with a **Polygon.io** WebSocket feed:

1. Sign up at https://polygon.io (free tier available)
2. Add your API key to a `.env` file:
   ```
   POLYGON_API_KEY=your_key_here
   ```
3. Replace the `setInterval` tick in `server.js` with Polygon's WebSocket:
   ```js
   import WebSocket from 'ws';
   const poly = new WebSocket(`wss://socket.polygon.io/stocks`);
   poly.on('message', (data) => { /* parse & broadcast */ });
   ```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sectors` | All 5 sectors + company lists |
| GET | `/api/sectors/:id` | Single sector with live price data |
| GET | `/api/prices` | Snapshot of all current prices |
| GET | `/api/health` | Server health check |
| WS  | `ws://localhost:3001` | Live price stream (3s updates) |

---

## Adding More Companies

Edit `backend/data/companies.js` — each company entry:
```js
{ name: "Company Name", ticker: "TICK", hq: "Country", spec: "What they do", exchange: "NASDAQ" }
```
Private companies use `ticker: null` and `exchange: "Private"`.
