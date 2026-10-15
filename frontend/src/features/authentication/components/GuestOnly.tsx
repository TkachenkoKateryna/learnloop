import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { selectIsAuthenticated } from '../store/authSelectors';

const GuestOnly = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/books" replace />;
  }

  return <Outlet />;
};

export default GuestOnly;
