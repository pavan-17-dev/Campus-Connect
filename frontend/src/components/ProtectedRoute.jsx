import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Redirects anonymous users to /login and returns them afterwards. */
export default function ProtectedRoute({ children, message = 'Please log in to continue.' }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, message }} />;
  }
  return children;
}
