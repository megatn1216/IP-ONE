// src/api/authApi.js
import httpClient from "./httpClient.js";

/**
 * POST /api/auth/login
 * body: { loginId, password }
 */
export async function loginWithIdPassword({ loginId, password }) {
  try {
    const res = await httpClient.post("/api/auth/login", {
      loginId,
      password,
    });

    const data = res.data;
    const ret = data?.return || data || {};

    return {
      ok: true,
      accessToken: ret.accessToken,
      refreshToken: ret.refreshToken,
      user: {
        loginId: ret.loginId || loginId,
        role: ret.role || "USER",
      },
    };
  } catch (err) {
    const status = err?.response?.status;
    return status === 404
        ? { ok: false, message: "ID/PW를 확인해주세요" }
        : status === 401
            ? { ok: false, message: "인증을 실패하였습니다." }
            : { ok: false, message: "로그인에 실패했습니다." };
  }
}

/**
 * POST /api/auth/verifysecond
 * header: Authorization: Bearer {token}
 * body: { secondPassword }
 */
export async function verifySecondPassword({ token, secondPassword }) {
  try {
    const res = await httpClient.post(
        "/api/auth/verifysecond",
        { secondPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ 변경 포인트
          },
        }
    );

    const data = res.data;
    const ret = data?.return || data || {};

    return {
      ok: true,
      accessToken: ret.accessToken,
      refreshToken: ret.refreshToken,
      user: {
        loginId: ret.loginId || "",
        role: ret.role || "USER",
      },
    };
  } catch (err) {
    const status = err?.response?.status;
    return status === 401 || status === 403
        ? { ok: false, message: "2차 인증을 실패하였습니다." }
        : { ok: false, message: "2차 인증에 실패했습니다." };
  }
}

/**
 * POST /api/auth/logout
 * body: { accessToken, refreshToken }
 */
export async function logoutWithTokens({ accessToken, refreshToken }) {
  try {
    const res = await httpClient.post("/api/auth/logout", {
      accessToken,
      refreshToken,
    });

    return { ok: res.status === 200 };
  } catch (err) {
    const status = err?.response?.status;
    return status === 401
        ? { ok: false, message: "인증을 실패하였습니다." }
        : { ok: false, message: "로그아웃에 실패했습니다." };
  }
}