import { getBaseUrl } from "./http";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

export async function getDocument(authFetch: FetchLike, id: string | number) {
  const res = await authFetch(withBase(`/api/v1/library/documents/${id}`));
  if (!res.ok) throw new Error(`Failed to fetch document: ${res.status}`);
  return res.json();
}

export async function listDocuments(authFetch: FetchLike, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase('/api/v1/library/documents/'));

      // Handle rate limiting (429)
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        let delay: number;

        if (retryAfterHeader) {
          delay = parseInt(retryAfterHeader, 10) * 1000;
        } else {
          delay = Math.min(5000 * Math.pow(2, attempt), 60000);
        }

        if (attempt < retries - 1) {
          console.warn(`Rate limit exceeded for documents, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
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
        throw new Error(`Failed to fetch documents: ${res.status}`);
      }

      return res.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      if (attempt === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to fetch documents after retries');
}

export async function listSubjects(authFetch: FetchLike, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase('/api/v1/library/subjects/'));

      // Handle rate limiting (429)
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        let delay: number;

        if (retryAfterHeader) {
          delay = parseInt(retryAfterHeader, 10) * 1000;
        } else {
          delay = Math.min(5000 * Math.pow(2, attempt), 60000);
        }

        if (attempt < retries - 1) {
          console.warn(`Rate limit exceeded for subjects, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
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
        throw new Error(`Failed to fetch subjects: ${res.status}`);
      }

      return res.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      if (attempt === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to fetch subjects after retries');
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

export async function incrementViewCount(authFetch: FetchLike, id: string | number) {
  const res = await authFetch(withBase(`/api/v1/library/documents/${id}/view`), { method: 'POST' });
  if (!res.ok) throw new Error('Failed to increment view count');
  return res.json();
}

export async function rateDocument(authFetch: FetchLike, id: string | number, rating: number) {
  const formData = new FormData();
  formData.append('rating', rating.toString());
  const res = await authFetch(withBase(`/api/v1/library/documents/${id}/rate`), {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to rate document');
  return res.json();
}

export async function createSubject(
  authFetch: FetchLike,
  payload: { code: string; name: string; description?: string }
) {
  const res = await authFetch(withBase('/api/v1/library/subjects/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to create subject');
  }

  return res.json();
}

export async function toggleSubjectActive(
  authFetch: FetchLike,
  subjectId: number,
  isActive: boolean
) {
  const res = await authFetch(withBase(`/api/v1/library/subjects/${subjectId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to update subject status');
  }

  return res.json();
}


