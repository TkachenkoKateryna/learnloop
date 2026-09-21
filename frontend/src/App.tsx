import { useEffect, useRef, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import SignUpPage from './pages/signup/SignUpPage';
import LoginPage from './pages/login/LoginPage';
import BookAdminPage from './pages/books/BookAdminPage';
import RequireAuth from './components/RequireAuth';
import GuestOnly from './components/GuestOnly';
import AppLayout from './components/layout/AppLayout';
import { refreshSession } from './store';
import type { AppDispatch } from './store';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const hasRestoredSession = useRef(false);

  useEffect(() => {
    if (hasRestoredSession.current) {
      return;
    }
    hasRestoredSession.current = true;

    dispatch(refreshSession()).finally(() => setIsRestoringSession(false));
  }, [dispatch]);

  if (isRestoringSession) {
    return null;
  }

  return (
    <div>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/books" element={<BookAdminPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}

export default App;
