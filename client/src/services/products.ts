import { getBaseUrl } from "./http";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

export async function listProducts(authFetch: FetchLike, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase('/api/v1/products'));

      // Handle rate limiting (429)
      if (res.status === 429) {
        // Get retry-after from header or use exponential backoff
        const retryAfterHeader = res.headers.get('Retry-After');
        let delay: number;

        if (retryAfterHeader) {
          delay = parseInt(retryAfterHeader, 10) * 1000;
        } else {
          // Exponential backoff: 5s, 10s, 20s, 40s, 80s
          delay = Math.min(5000 * Math.pow(2, attempt), 60000); // Max 60 seconds
        }

        if (attempt < retries - 1) {
          console.warn(`Rate limit exceeded, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // After all retries, provide a helpful error message
          const limit = res.headers.get('X-RateLimit-Limit') || '100';
          const remaining = res.headers.get('X-RateLimit-Remaining') || '0';
          throw new Error(
            `Rate limit exceeded (${limit} requests/hour). ` +
            `Remaining: ${remaining}. ` +
            `Vui lòng đợi một lúc rồi thử lại hoặc làm mới trang.`
          );
        }
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status}`);
      }

      return res.json();
    } catch (error) {
      // If it's already our custom error, throw it
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      if (attempt === retries - 1) {
        throw error;
      }
      // Exponential backoff for other errors
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to fetch products after retries');
}

export async function createProduct(authFetch: FetchLike, body: Record<string, unknown>) {
  const res = await authFetch(withBase('/api/v1/products'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
}

export async function updateProduct(authFetch: FetchLike, id: string | number, body: Record<string, unknown>) {
  const res = await authFetch(withBase(`/api/v1/products/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function getProduct(authFetch: FetchLike, id: string | number) {
  const res = await authFetch(withBase(`/api/v1/products/${id}`));
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function deleteProduct(authFetch: FetchLike, id: string | number) {
  const res = await authFetch(withBase(`/api/v1/products/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  return true;
}

export async function getProductsStats(authFetch: FetchLike, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase('/api/v1/products/stats/summary'));

      // Handle rate limiting (429)
      if (res.status === 429) {
        // Get retry-after from header or use exponential backoff
        const retryAfterHeader = res.headers.get('Retry-After');
        let delay: number;

        if (retryAfterHeader) {
          delay = parseInt(retryAfterHeader, 10) * 1000;
        } else {
          // Exponential backoff: 5s, 10s, 20s, 40s, 80s
          delay = Math.min(5000 * Math.pow(2, attempt), 60000); // Max 60 seconds
        }

        if (attempt < retries - 1) {
          console.warn(`Rate limit exceeded for stats, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // After all retries, provide a helpful error message
          const limit = res.headers.get('X-RateLimit-Limit') || '100';
          const remaining = res.headers.get('X-RateLimit-Remaining') || '0';
          throw new Error(
            `Rate limit exceeded (${limit} requests/hour). ` +
            `Remaining: ${remaining}. ` +
            `Vui lòng đợi một lúc rồi thử lại hoặc làm mới trang.`
          );
        }
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch products stats: ${res.status}`);
      }

      return res.json();
    } catch (error) {
      // If it's already our custom error, throw it
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      if (attempt === retries - 1) {
        throw error;
      }
      // Exponential backoff for other errors
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to fetch products stats after retries');
}


