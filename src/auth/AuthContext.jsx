// src/auth/AuthContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { loginWithIdPassword, logoutWithTokens } from "../api/authApi.js";
import { setAuthToken } from "../api/httpClient.js";

const AUTH_STORAGE_KEY = "ipone_auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  // 최초 진입 시 localStorage에서 세션 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.accessToken) {
          setAuth(parsed);
          setAuthToken(parsed.accessToken);
          console.log("[AuthContext] restored session from storage:", parsed);
        }
      }
    } catch (e) {
      console.warn("[AuthContext] failed to restore session:", e);
    } finally {
      setIsBootstrapped(true);
    }
  }, []);

  const login = useCallback(async (loginId, password) => {
    console.log("loginId", loginId, password);
    const result = await loginWithIdPassword({ loginId, password });
    console.log("[AuthContext] login result:", result);

    if (!result.ok) return result;

    const nextAuth = {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };

    setAuth(nextAuth);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    } catch (e) {
      console.warn("[AuthContext] failed to persist session:", e);
    }

    setAuthToken(result.accessToken);

    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    if (!auth?.accessToken) {
      // 이미 로그아웃된 상태로 취급
      setAuth(null);
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
      setAuthToken(null);
      return { ok: true };
    }

    const payload = {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    };

    let result;
    try {
      result = await logoutWithTokens(payload);
      console.log("[AuthContext] logout result:", result);
    } catch (e) {
      console.warn("[AuthContext] logout request failed:", e);
      result = { ok: false, message: "로그아웃 요청에 실패했습니다." };
    }

    // 서버 처리 결과와 관계 없이 클라이언트 세션은 정리
    setAuth(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
    setAuthToken(null);

    return result ?? { ok: true };
  }, [auth]);

  return (
    <AuthContext.Provider
      value={{
        auth,
        user: auth?.user ?? null,
        isAuthenticated: !!auth?.accessToken,
        isBootstrapped,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
