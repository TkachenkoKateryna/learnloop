import { configureStore } from '@reduxjs/toolkit';
// Reducers are imported from their slice files, not the feature barrels, so
// the store doesn't pull in feature modules that import the store back.
import { booksReducer } from '../features/books/store/booksSlice';
import { authReducer } from '../features/authentication/store/authSlice';

export const store = configureStore({
  reducer: {
    books: booksReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
