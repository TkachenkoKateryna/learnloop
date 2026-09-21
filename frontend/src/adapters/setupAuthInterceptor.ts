import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { api } from './api';
import { store, refreshSession } from '../store';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_URLS = [
  'auth/login',
  'auth/register',
  'auth/refresh',
  'auth/logout',
];

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = () => {
  refreshPromise ??= store
    .dispatch(refreshSession())
    .unwrap()
    .then(({ accessToken }) => accessToken)
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
      const accessToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api.retry(config);
    } catch {
      api.removeHeader('Authorization');
      throw error;
    }
  });
};
