import { getBaseUrl } from "./http";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

export async function listProducts(authFetch: FetchLike) {
  const res = await authFetch(withBase('/api/v1/products'));
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
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

export async function deleteProduct(authFetch: FetchLike, id: string | number) {
  const res = await authFetch(withBase(`/api/v1/products/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  return true;
}


