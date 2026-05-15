import { useEffect, useState, useCallback } from 'react';

const API_URL = 'https://aifmi.onrender.com';

export function useLivePrices() {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const [flashMap, setFlashMap] = useState({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/prices`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const newFlash = {};
      setPrices(prev => {
        const next = { ...prev };
        for (const [ticker, d] of Object.entries(data)) {
          const old = prev[ticker]?.price;
          if (old !== undefined && old !== d.price) {
            newFlash[ticker] = d.price > old ? 'up' : 'down';
          }
          next[ticker] = d;
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
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { prices, connected, flashMap };
}
