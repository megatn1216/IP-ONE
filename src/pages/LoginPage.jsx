import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import titleImg from "../assets/ip-one-title.png";
import "../styles/login.css";

export default function LoginPage() {
  const { login, verifySecond, isAuthenticated } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const state = location.state;
    const path = state?.from?.pathname;
    return path || "/status/network";
  }, [location.state]);

  const [step, setStep] = useState("PRIMARY"); // PRIMARY | SECOND
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [secondPassword, setSecondPassword] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  function resetAll() {
    setStep("PRIMARY");
    setLoginId("");
    setPassword("");
    setSecondPassword("");
    setTempToken("");
    setErrorText("");
    setLoading(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrorText("");

    if (loading) return;

    if (step === "PRIMARY") {
      if (!loginId.trim() || !password) {
        setErrorText("ID/PW를 입력해주세요");
        return;
      }

      setLoading(true);
      const res = await login({ loginId: loginId.trim(), password });
      setLoading(false);

      if (!res?.ok) {
        setErrorText(res?.message || "로그인에 실패했습니다.");
        return;
      }

      // ✅ 2차 인증 필요: 토큰은 임시로만 보관 (로컬 저장 X)
      setTempToken(res?.token || "");
      setStep("SECOND");
      setSecondPassword("");
      return;
    }

    // step === "SECOND"
    if (!secondPassword) {
      setErrorText("2차 패스워드를 입력해주세요");
      return;
    }
    if (!tempToken) {
      setErrorText("인증 토큰이 없습니다. 다시 로그인해주세요.");
      resetAll();
      return;
    }

    setLoading(true);
    const res2 = await verifySecond({ token: tempToken, secondPassword });
    setLoading(false);

    if (!res2?.ok) {
      setErrorText(res2?.message || "2차 인증에 실패했습니다.");
      return;
    }

    navigate(from, { replace: true });
  }

  const submitLabel =
      step === "PRIMARY"
          ? loading
              ? "로그인 중..."
              : "로그인"
          : loading
              ? "2차 인증 중..."
              : "2차 인증";

  return (
      <div className="loginPage">
        <div className="loginShell">
          <div className="loginCard">
            <img className="loginTitle" src={titleImg} alt="IP-ONE" />

            <form className="loginForm" onSubmit={onSubmit}>
              {step === "PRIMARY" && (
                  <>
                    <input
                        className="loginInput"
                        placeholder="ID"
                        autoComplete="username"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        disabled={loading}
                    />
                    <input
                        className="loginInput"
                        placeholder="Password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                  </>
              )}

              {step === "SECOND" && (
                  <input
                      className="loginInput"
                      placeholder="2차 패스워드"
                      type="password"
                      autoComplete="one-time-code"
                      value={secondPassword}
                      onChange={(e) => setSecondPassword(e.target.value)}
                      disabled={loading}
                  />
              )}

              {errorText && <div className="loginError">{errorText}</div>}

              {/* ✅ 로그인/2차 인증 버튼이 위 */}
              <button className="loginButton" type="submit" disabled={loading}>
                {submitLabel}
              </button>

              {/* ✅ 2차 단계에서만 '취소' 노출 + 전부 초기화 */}
              {step === "SECOND" && (
                  <button
                      type="button"
                      className="loginButton"
                      onClick={resetAll}
                      disabled={loading}
                      style={{
                        marginTop: 0,
                        background: "#d9d9d9",
                        color: "#000",
                        opacity: loading ? 0.55 : 1,
                      }}
                  >
                    취소
                  </button>
              )}
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