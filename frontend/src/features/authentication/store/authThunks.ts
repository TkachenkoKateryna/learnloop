import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../api/authService';
import type { LoginRequest, User } from '../types/auth';
import { getErrorMessage } from '../../../utils/getErrorMessage';
import { getRetryAfterSeconds } from '../../../utils/getRetryAfterSeconds';

export const login = createAsyncThunk<
  User,
  LoginRequest,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to sign in.'));
  }
});

// 'unauthorized': the server answered and rejected the session - log out.
// 'unavailable': no answer (offline, timeout) or a 5xx - the session may
// still be valid, so the user must not be logged out.
// 'rate-limited': a 429 - the session may still be valid, but retrying
// before retryAfterSeconds is up will only be rejected again.
export type RefreshFailure = 'unauthorized' | 'unavailable' | 'rate-limited';

export interface RefreshRejection {
  reason: RefreshFailure;
  retryAfterSeconds: number | null;
}

export const isRefreshRejection = (value: unknown): value is RefreshRejection =>
  typeof value === 'object' && value !== null && 'reason' in value;

export const refreshSession = createAsyncThunk<
  User,
  void,
  { rejectValue: RefreshRejection }
>('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    return await authService.refresh();
  } catch (error) {
    if (!axios.isAxiosError(error) || !error.response) {
      return rejectWithValue({
        reason: 'unavailable',
        retryAfterSeconds: null,
      });
    }

    const { status } = error.response;

    if (status === 429) {
      return rejectWithValue({
        reason: 'rate-limited',
        retryAfterSeconds: getRetryAfterSeconds(error),
      });
    }

    return rejectWithValue({
      reason: status < 500 ? 'unauthorized' : 'unavailable',
      retryAfterSeconds: null,
    });
  }
});

export const logout = createAsyncThunk('auth/logout', () =>
  authService.logout(),
);
