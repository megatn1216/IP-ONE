import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import titleImg from "../assets/ip-one-title.png";
import "../styles/login.css";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const state = location.state;
    const path = state?.from?.pathname;
    return path || "/status/network";
  }, [location.state]);

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(id.trim(), password);
      if (!res.ok) {
        setError(res.message || "로그인에 실패했습니다.");
        return;
      }
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginShell">
        <div className="loginCard">
          <img className="loginTitle" src={titleImg} alt="IP-ONE" />

          <form className="loginForm" onSubmit={onSubmit}>
            <input
              className="loginInput"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="ID"
              autoComplete="username"
            />
            <input
              className="loginInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
            />

            {error ? <div className="loginError">{error}</div> : null}

            <button className="loginButton" type="submit" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <div className="loginFooter">
          <div>(주)케이티 경기도 성남시 분당구 불정로 90</div>
          <div>Copyright 2025 kt corp.All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
