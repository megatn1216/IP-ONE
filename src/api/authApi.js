// src/api/authApi.js
import httpClient from "./httpClient.js";

/**
 * POST /api/auth/login
 * body: { loginId, password }
 *
 * 성공(HTTP 200): { accessToken, refreshToken, role, loginId } 또는
 *                 { return: { accessToken, refreshToken, role, loginId } }
 * 실패(HTTP 404): ID/PW 확인
 * 실패(HTTP 401): 인증 실패
 */
export async function loginWithIdPassword({ loginId, password }) {
  try {
    const res = await httpClient.post("/api/auth/login", {
      loginId,
      password,
    });

    console.log("[authApi] loginWithIdPassword res:", res);

    const data = res.data;
    // return 래핑이 있으면 우선 사용, 없으면 data 전체 사용
    const ret = data?.return || data || {};

    const result = {
      ok: true,
      accessToken: ret.accessToken,
      refreshToken: ret.refreshToken,
      user: {
        loginId: ret.loginId || loginId,
        role: ret.role || "USER",
      },
    };

    console.log("[authApi] loginWithIdPassword result:", result);
    return result;
  } catch (err) {
    const status = err?.response?.status;
    const result =
      status === 404
        ? { ok: false, message: "ID/PW를 확인해주세요" }
        : status === 401
        ? { ok: false, message: "인증을 실패하였습니다." }
        : { ok: false, message: "로그인에 실패했습니다." };

    console.log("[authApi] loginWithIdPassword error:", result, err);
    return result;
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

    const result = { ok: res.status === 200 };
    console.log("[authApi] logoutWithTokens result:", result);
    return result;
  } catch (err) {
    const status = err?.response?.status;
    const result = status === 401
        ? { ok: false, message: "인증을 실패하였습니다." }
        : { ok: false, message: "로그아웃에 실패했습니다." };

    console.log("[authApi] logoutWithTokens error:", result, err);
    return result;
  }
}
