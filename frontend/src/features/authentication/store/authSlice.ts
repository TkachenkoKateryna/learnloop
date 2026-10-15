import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { User } from '../types/auth';
import { login, logout, refreshSession } from './authThunks';

interface AuthState {
  user: User | null;
}

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(refreshSession.rejected, (state, action) => {
        // Only log out when the server rejected the session. If it couldn't
        // be reached, keep the user - the next request will try again.
        if (action.payload === 'unauthorized') {
          state.user = null;
        }
      })
      .addMatcher(
        isAnyOf(login.fulfilled, refreshSession.fulfilled),
        (state, action) => {
          state.user = action.payload;
        },
      )
      .addMatcher(isAnyOf(logout.fulfilled, logout.rejected), (state) => {
        state.user = null;
      });
  },
});

export const authReducer = authSlice.reducer;
