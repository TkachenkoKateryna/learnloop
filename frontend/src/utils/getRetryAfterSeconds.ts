import type { AxiosError } from 'axios';

// The backend sends Retry-After for its default rate limit and a suffixed
// header for each named one (e.g. Retry-After-login-ip). The longest wait
// is the one that matters.
export const getRetryAfterSeconds = (error: AxiosError): number | null => {
  const headers = error.response?.headers ?? {};

  const waits = Object.entries(headers)
    .filter(([name]) => name.toLowerCase().startsWith('retry-after'))
    .map(([, value]) => Number(value))
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);

  return waits.length > 0 ? Math.ceil(Math.max(...waits)) : null;
};
