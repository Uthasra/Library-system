import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, adminOnly }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (adminOnly && !isAdmin) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="text-[18px] font-semibold text-ink-800">This page is for administrators</h2>
        <p className="mt-2 text-[14px] text-ink-400">
          Ask an administrator if you need the library rules changed.
        </p>
      </div>
    );
  }
  return children;
}
