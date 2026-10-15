import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { api } from '../../../lib/apiClient';
import { store } from '../../../store';
import { refreshSession } from '../store/authThunks';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_URLS = [
  'auth/login',
  'auth/register',
  'auth/refresh',
  'auth/logout',
  'auth/profile',
  'auth/forgot-password',
  'auth/reset-password',
];

let refreshPromise: Promise<unknown> | null = null;

const refreshAccessToken = () => {
  refreshPromise ??= store
    .dispatch(refreshSession())
    .unwrap()
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

export const setupAuthInterceptor = () => {
  api.setErrorResponseInterceptor(async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      AUTH_URLS.some((url) => config.url?.includes(url))
    ) {
      throw error;
    }

    config._retry = true;

    try {
      await refreshAccessToken();
      return api.retry(config);
    } catch (reason) {
      // Mirror the slice: drop the token only when the session is really
      // gone. If the server was unreachable the user stays logged in, and
      // the next 401 will try the refresh again.
      if (reason === 'unauthorized') {
        api.setAccessToken(null);
      }
      throw error;
    }
  });
};
