'use client';

import { useEffect, useRef, useState } from 'react';

export function useSSE(url: string, options?: { headers?: Record<string, string> }) {
  const [data, setData] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData("");

    (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
        });
        const reader = res.body?.getReader();
        readerRef.current = reader || null;
        const decoder = new TextDecoder();
        if (!reader) return;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          setData((prev) => prev + chunk);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'SSE error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      readerRef.current?.cancel().catch(() => {});
    };
  }, [url]);

  return { data, error, loading };
}


