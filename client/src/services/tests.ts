import { getBaseUrl } from "./http";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

export async function listTestResults(authFetch: FetchLike, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase('/api/v1/test-results/my-results'));
      
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
          console.warn(`Rate limit exceeded for test results, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
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
        throw new Error(`Failed to fetch test results: ${res.status}`);
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

  throw new Error('Failed to fetch test results after retries');
}

export async function getInstructorStats(authFetch: FetchLike, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase('/api/v1/test-results/instructor-stats'));
      
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
          console.warn(`Rate limit exceeded for instructor stats, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
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
        throw new Error(`Failed to fetch instructor stats: ${res.status}`);
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

  throw new Error('Failed to fetch instructor stats after retries');
}

export async function getTestResultsByTestId(authFetch: FetchLike, testId: string, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch(withBase(`/api/v1/test-results/test/${testId}/results`));
      
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
          console.warn(`Rate limit exceeded for test results by test ID, retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
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
        throw new Error(`Failed to fetch test results by test ID: ${res.status}`);
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

  throw new Error('Failed to fetch test results by test ID after retries');
}

