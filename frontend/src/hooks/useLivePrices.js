import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'wss://aifmi-production.up.railway.app';

export function useLivePrices() {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const [flashMap, setFlashMap] = useState({});
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'SNAPSHOT' || msg.type === 'PRICE_UPDATE') {
        const incoming = msg.data;
        const newFlash = {};
        setPrices(prev => {
          const next = { ...prev };
          for (const [ticker, data] of Object.entries(incoming)) {
            const old = prev[ticker]?.price;
            if (old !== undefined && old !== data.price) {
              newFlash[ticker] = data.price > old ? 'up' : 'down';
            }
            next[ticker] = data;
          }
          return next;
        });
        if (Object.keys(newFlash).length > 0) {
          setFlashMap(f => ({ ...f, ...newFlash }));
          setTimeout(() => {
            setFlashMap(f => {
              const cleared = { ...f };
              for (const t of Object.keys(newFlash)) delete cleared[t];
              return cleared;
            });
          }, 600);
        }
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { prices, connected, flashMap };
}
