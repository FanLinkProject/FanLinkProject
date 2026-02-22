/**
 * 공통 API 클라이언트 (fetch 기반, axios 미사용).
 * - BASE_URL / WS_CHAT_URL
 * - Bearer 토큰 정규화 + localStorage 토큰 로드
 * - apiFetch (query 지원) / apiGet / apiPost / apiPatch
 * - (호환) request() 제공: 기존 dev 코드 그대로 사용할 수 있게 래핑
 */

/** Vercel 등에서는 환경 변수 NEXT_PUBLIC_API_BASE_URL 로 API 서버 주소 지정 */
export const BASE_URL =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL
        ? process.env.NEXT_PUBLIC_API_BASE_URL
        : "https://api.fanlink.site";

/** STOMP/SockJS 엔드포인트 (라이브챗 등) */
export const WS_CHAT_URL = `${BASE_URL.replace(/\/$/, "")}/ws-chat`;

/**
 * 사용자 입력 토큰을 "Bearer <token>" 형태로 통일.
 * 이미 "Bearer " 접두어가 있어도 제거 후 다시 붙여 정규화.
 */
export function normalizeToken(raw) {
    if (raw == null || typeof raw !== "string") return "";
    const t = raw.trim().replace(/^Bearer\s+/i, "").trim();
    return t ? `Bearer ${t}` : "";
}

/**
 * localStorage에서 accessToken 또는 token을 가져와 Bearer 형태로 반환.
 * "use client"에서만 호출 (브라우저 환경).
 */
export function getToken() {
    if (typeof window === "undefined") return "";
    const raw =
        window.localStorage.getItem("accessToken") ??
        window.localStorage.getItem("token") ??
        "";
    return normalizeToken(raw);
}

/** query 객체를 URLSearchParams로 안전하게 변환 */
function toQueryString(query) {
    if (!query || typeof query !== "object") return "";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        // 배열 지원: { a: [1,2] } -> a=1&a=2
        if (Array.isArray(v)) v.forEach((vv) => params.append(k, String(vv)));
        else params.append(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
}

/** 응답 바디를 content-type에 따라 파싱 (204/no-content 안전) */
async function parseBody(res) {
    if (res.status === 204) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        return await res.json().catch(() => null);
    }
    // text/plain, text/html 등
    return await res.text().catch(() => "");
}

/**
 * 에러 응답 메시지를 구분해 throw.
 * - e.status / e.data / e.code / e.isAuth / e.isForbidden 제공
 */
function throwApiError(res, data) {
    const msg =
        (data && typeof data.message === "string" && data.message) ||
        (typeof data === "string" && data) ||
        `HTTP ${res.status}`;

    const e = new Error(msg);
    e.status = res.status;
    e.code = res.status;
    e.data = data;

    if (res.status === 401) e.isAuth = true;
    if (res.status === 403) e.isForbidden = true;

    throw e;
}

/**
 * 공통 fetch: Authorization 자동 첨부, query 지원, 401/403 분기 throw.
 *
 * @param {string} method - GET, POST, PATCH, etc.
 * @param {string} path - /api/... 또는 절대 URL
 * @param {object} [body] - JSON body
 * @param {{
 *   token?: string,
 *   query?: object,
 *   headers?: Record<string, string>,
 * }} [opts]
 */
export async function apiFetch(method, path, body, opts = {}) {
    const token = opts.token != null ? normalizeToken(opts.token) : getToken();

    const base =
        path.startsWith("http")
            ? path
            : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    const url = `${base}${toQueryString(opts.query)}`;

    const headers = {
        ...(body != null && method !== "GET" ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: token } : {}),
        ...(opts.headers || {}),
    };

    const res = await fetch(url, {
        method,
        headers,
        ...(body != null && method !== "GET" ? { body: JSON.stringify(body) } : {}),
        ...(opts.signal != null ? { signal: opts.signal } : {}),
    });

    const data = await parseBody(res);
    if (!res.ok) throwApiError(res, data);
    return data;
}

export function apiGet(path, opts) {
    return apiFetch("GET", path, undefined, opts);
}

export function apiPost(path, body, opts) {
    return apiFetch("POST", path, body, opts);
}

export function apiPatch(path, body, opts) {
    return apiFetch("PATCH", path, body, opts);
}

export function apiPut(path, body, opts) {
    return apiFetch("PUT", path, body, opts);
}

/**
 * ✅ (호환) dev 코드의 request() 시그니처를 유지
 * - 내부적으로 apiFetch를 사용하도록 통합
 *
 * @param {string} path
 * @param {{ method?: string; body?: object; query?: object }} options
 */
export async function request(path, { method = "GET", body, query } = {}) {
    return apiFetch(method, path, body, { query });
}
