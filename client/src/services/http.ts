export function getBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    // Fallback: try same-origin (useful if you set up a reverse proxy/rewrites)
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://localhost:8000";
}

export async function http<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } catch (err) {
    // In browser, try same-origin relative path as a fallback (helps during dev when API is proxied)
    if (typeof window !== 'undefined') {
      const rel = path.startsWith('/') ? path : `/${path}`;
      const res2 = await fetch(rel, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      return res2.json() as Promise<T>;
    }
    throw err;
  }
}


