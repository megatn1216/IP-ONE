// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트.
 * - AuthContext에서 세션 복원이 끝날 때까지는 렌더링을 지연하고
 * - 인증이 안 되어 있으면 /login 으로 이동시킨다.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isBootstrapped } = useAuth();
  const location = useLocation();

  // 아직 스토리지에서 세션 복원 중이면 아무것도 렌더하지 않음
  if (!isBootstrapped) {
    return null;
  }

  if (!isAuthenticated) {
    console.warn(
      "[ProtectedRoute] unauthenticated access → redirect to /login from",
      location.pathname
    );
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
