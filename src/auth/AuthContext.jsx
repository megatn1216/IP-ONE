// src/auth/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loginWithIdPassword,
  logoutWithTokens,
  verifySecondPassword,
} from "../api/authApi.js";
import { setAuthToken } from "../api/httpClient.js";

const AUTH_STORAGE_KEY = "ipone_auth";

const AuthContext = createContext(null);

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  // 부팅 시 로컬스토리지 복구
  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? safeParse(raw) : null;

    if (parsed?.accessToken) {
      setAuth(parsed);
      setAuthToken(parsed.accessToken);
    } else {
      setAuth(null);
      setAuthToken(null);
    }

    setIsBootstrapped(true);
  }, []);

  const persistAuth = useCallback((nextAuth) => {
    if (nextAuth?.accessToken) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
      setAuthToken(nextAuth.accessToken);
      setAuth(nextAuth);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
      setAuth(null);
    }
  }, []);

  /**
   * 1차 로그인
   * - 서버 인증 후 토큰을 받지만, 로컬 저장은 하지 않음 (2차 성공 시 저장/갱신)
   * - 반환: { ok, token, refreshToken, user, message }
   */
  const login = useCallback(async ({ loginId, password }) => {
    const res = await loginWithIdPassword({ loginId, password });
    if (!res?.ok) return res;

    return {
      ok: true,
      token: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
    };
  }, []);

  /**
   * 2차 인증
   * - header token + body secondPassword로 서버 검증
   * - 성공 시 새 토큰을 받아 동일 키(AUTH_STORAGE_KEY)로 저장/갱신
   */
  const verifySecond = useCallback(
      async ({ token, secondPassword }) => {
        const res = await verifySecondPassword({ token, secondPassword });
        if (!res?.ok) return res;

        persistAuth({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
        });

        return { ok: true };
      },
      [persistAuth]
  );

  const logout = useCallback(async () => {
    const accessToken = auth?.accessToken || "";
    const refreshToken = auth?.refreshToken || "";

    // 서버 로그아웃 실패여부와 관계없이, 클라이언트는 즉시 로그아웃 처리
    await logoutWithTokens({ accessToken, refreshToken });
    persistAuth(null);
  }, [auth, persistAuth]);

  const value = useMemo(
      () => ({
        auth,
        user: auth?.user || null,
        accessToken: auth?.accessToken || "",
        refreshToken: auth?.refreshToken || "",
        isAuthenticated: !!auth?.accessToken,
        isBootstrapped,
        login,
        verifySecond,
        logout,
      }),
      [auth, isBootstrapped, login, verifySecond, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
