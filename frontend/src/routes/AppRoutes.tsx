import { Route, Routes } from 'react-router-dom';
import SignUpPage from '../pages/authentication/SignUpPage';
import LoginPage from '../pages/authentication/LoginPage';
import ForgotPasswordPage from '../pages/authentication/ForgotPasswordPage';
import ResetPasswordPage from '../pages/authentication/ResetPasswordPage';
import BookAdminPage from '../pages/books/BookAdminPage';
import AppLayout from '../components/layout/AppLayout';
import {
  GuestOnly,
  HomeRedirect,
  RequireAuth,
} from '../features/authentication';

const AppRoutes = () => (
  <Routes>
    <Route element={<GuestOnly />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Route>
    {/* Open to everyone: the emailed link must work while logged in too. */}
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route path="/books" element={<BookAdminPage />} />
      </Route>
    </Route>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="*" element={<HomeRedirect />} />
  </Routes>
);

export default AppRoutes;
