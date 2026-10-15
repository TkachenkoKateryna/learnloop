import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { selectIsAuthenticated } from '../store/authSelectors';

// Entry point for "/" and unknown URLs: logged-in users go to the app,
// everyone else to the login page.
const HomeRedirect = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return <Navigate to={isAuthenticated ? '/books' : '/login'} replace />;
};

export default HomeRedirect;
