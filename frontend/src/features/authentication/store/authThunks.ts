import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../api/authService';
import type { LoginRequest, User } from '../types/auth';
import { getErrorMessage } from '../../../utils/getErrorMessage';

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
export type RefreshFailure = 'unauthorized' | 'unavailable';

export const refreshSession = createAsyncThunk<
  User,
  void,
  { rejectValue: RefreshFailure }
>('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    return await authService.refresh();
  } catch (error) {
    const serverRejected =
      axios.isAxiosError(error) &&
      error.response !== undefined &&
      error.response.status < 500;

    return rejectWithValue(serverRejected ? 'unauthorized' : 'unavailable');
  }
});

export const logout = createAsyncThunk('auth/logout', () =>
  authService.logout(),
);
