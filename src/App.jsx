import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layout/MainLayout.jsx";
import NetworkStatusPage from "./pages/NetworkStatusPage.jsx";
import ServerStatusPage from "./pages/ServerStatusPage.jsx";
import MonitoringPage from "./pages/MonitoringPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      {/* 로그인 페이지는 항상 공개 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 이 아래는 모두 인증 필요 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/status/network" replace />} />
          <Route path="/status/network" element={<NetworkStatusPage />} />
          <Route path="/status/server" element={<ServerStatusPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="*" element={<Navigate to="/status/network" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
