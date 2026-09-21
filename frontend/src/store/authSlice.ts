import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import type { LoginRequest, RegisterRequest, User } from '../types/auth';
import { getErrorMessage } from '../utils/getErrorMessage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk<
  { accessToken: string; user: User },
  LoginRequest,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { accessToken } = await authService.login(credentials);
    const user = await authService.profile();
    return { accessToken, user };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to sign in.'));
  }
});

export const register = createAsyncThunk<
  User,
  RegisterRequest,
  { rejectValue: string }
>('auth/register', async (payload, { rejectWithValue }) => {
  try {
    return await authService.register(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to register.'));
  }
});

// Fired silently on app load to restore a session from the httpOnly
// refresh-token cookie. A rejection here just means "not logged in" -
// it must not surface as a user-facing error on the login/signup forms.
export const refreshSession = createAsyncThunk('auth/refresh', async () => {
  const { accessToken } = await authService.refresh();
  const user = await authService.profile();
  return { accessToken, user };
});

export const logout = createAsyncThunk('auth/logout', () =>
  authService.logout(),
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
      if (state.status === 'failed') {
        state.status = 'idle';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          action.payload ?? action.error.message ?? 'Failed to sign in.';
        state.accessToken = null;
        state.user = null;
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          action.payload ?? action.error.message ?? 'Failed to register.';
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.accessToken = null;
        state.user = null;
      })
      .addMatcher(isAnyOf(logout.fulfilled, logout.rejected), (state) => {
        state.status = 'idle';
        state.error = null;
        state.accessToken = null;
        state.user = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;
