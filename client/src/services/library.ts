import { getBaseUrl } from "./http";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

export async function listDocuments() {
  const res = await fetch(withBase('/api/v1/library/documents/'));
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function listSubjects() {
  const res = await fetch(withBase('/api/v1/library/subjects/'));
  if (!res.ok) throw new Error('Failed to fetch subjects');
  return res.json();
}

export async function createDocument(authFetch: FetchLike, payload: Record<string, unknown>) {
  const res = await authFetch(withBase('/api/v1/library/documents/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create document');
  return res.json();
}

export async function updateDocument(authFetch: FetchLike, id: string, payload: Record<string, unknown>) {
  const res = await authFetch(withBase(`/api/v1/library/documents/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update document');
  return res.json();
}

export async function deleteDocument(authFetch: FetchLike, id: string) {
  const res = await authFetch(withBase(`/api/v1/library/documents/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
  return true;
}

export async function incrementDownloadAndGetUrl(authFetch: FetchLike, id: string) {
  const res = await authFetch(withBase(`/api/v1/library/documents/${id}/download`), { method: 'POST' });
  if (!res.ok) throw new Error('Failed to prepare download');
  return res.json();
}


