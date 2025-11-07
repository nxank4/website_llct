export function getBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    // Fallback: try same-origin (useful if you set up a reverse proxy/rewrites)
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://localhost:8000";
}

// Helper to create AbortController with timeout
function createTimeoutSignal(timeoutMs: number = 10000): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function http<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const timeoutMs = 10000; // 10 seconds timeout
  const signal = createTimeoutSignal(timeoutMs);
  
  try {
    const res = await fetch(url, {
      ...init,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } catch (err) {
    // Handle timeout or abort
    if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
      console.warn(`Request timeout for ${path}`);
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    
    // In browser, try same-origin relative path as a fallback (helps during dev when API is proxied)
    if (typeof window !== 'undefined') {
      const rel = path.startsWith('/') ? path : `/${path}`;
      const fallbackSignal = createTimeoutSignal(timeoutMs);
      try {
        const res2 = await fetch(rel, {
          ...init,
          signal: fallbackSignal,
          headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          },
        });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        return res2.json() as Promise<T>;
      } catch (err2) {
        if (err2 instanceof Error && (err2.name === 'AbortError' || err2.message.includes('aborted'))) {
          console.warn(`Fallback request timeout for ${path}`);
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw err2;
      }
    }
    throw err;
  }
}


