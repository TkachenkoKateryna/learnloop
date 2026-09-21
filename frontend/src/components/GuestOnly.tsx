import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const GuestOnly = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user) {
    return <Navigate to="/books" replace />;
  }

  return <Outlet />;
};

export default GuestOnly;
