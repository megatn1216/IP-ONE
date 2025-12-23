import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function RequireAuth() {
  const { isAuthenticated, isBootstrapped } = useAuth();
  const location = useLocation();

  if (!isBootstrapped) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
