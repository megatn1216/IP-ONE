// src/api/httpClient.js
import axios from "axios";

const httpClient = axios.create({
    baseURL: "",
    timeout: 10000,
});

// 공통 토큰 설정 함수
export function setAuthToken(token) {
    if (token) {
        httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
        try {
            console.log(
                "[httpClient] setAuthToken:",
                String(token).slice(0, 15) + "..."
            );
        } catch {
            console.log("[httpClient] setAuthToken: [token set]");
        }
    } else {
        delete httpClient.defaults.headers.common.Authorization;
        console.log("[httpClient] clearAuthToken");
    }
}

// 요청 인터셉터
httpClient.interceptors.request.use(
    (config) => {
        // 1) Authorization 헤더 설정 (기존 로직 유지)
        try {
            const raw = localStorage.getItem("ipone_auth");
            if (raw) {
                const parsed = JSON.parse(raw);
                const accessToken = parsed?.accessToken;
                if (accessToken) {
                    config.headers = config.headers || {};
                    if (!config.headers.Authorization) {
                        config.headers.Authorization = `Bearer ${accessToken}`;
                    }
                }
            }
        } catch (e) {
            console.warn("[httpClient] ipone_auth parse error:", e);
        }

        // 2) FormData / JSON 에 따라 Content-Type 분기
        const isFormData = config.data instanceof FormData;
        config.headers = config.headers || {};

        if (isFormData) {
            // ✅ FormData인 경우: Content-Type을 건드리지 않는다.
            // 브라우저가 boundary 포함한 multipart/form-data 를 자동 설정한다.
            delete config.headers["Content-Type"];
            delete config.headers["content-type"];
        } else {
            // ✅ 일반 JSON 요청만 application/json 으로 세팅
            if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
                config.headers["Content-Type"] = "application/json;charset=utf-8";
            }
        }

        // 디버깅용 로그
        const ct =
            config.headers["Content-Type"] || config.headers["content-type"] || "";
        console.log(
            "[httpClient] request:",
            config.method?.toUpperCase(),
            config.url,
            "Authorization:",
            config.headers?.Authorization ? "Bearer ..." : "none",
            "Content-Type:",
            ct || "(none)"
        );

        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 / 403 발생 시 세션 정리 후 로그인 화면으로 이동
httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
            console.warn("[httpClient] auth error status:", status, "→ force logout");

            try {
                localStorage.removeItem("ipone_auth");
            } catch {
                // ignore
            }
            setAuthToken(null);

            if (
                typeof window !== "undefined" &&
                window.location?.pathname !== "/login"
            ) {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default httpClient;