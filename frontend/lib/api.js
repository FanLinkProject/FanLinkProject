/**
 * 공통 API 클라이언트 (fetch 기반, axios 미사용).
 * - BASE_URL, Bearer 토큰 정규화 및 apiFetch / apiGet / apiPost / apiPatch 제공.
 */

export const BASE_URL =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "http://localhost:8080";

/** STOMP/SockJS 엔드포인트 (라이브챗 등) */
export const WS_CHAT_URL = `${BASE_URL.replace(/\/$/, "")}/ws-chat`;

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

/**
 * 사용자 입력 토큰을 "Bearer <token>" 형태로 통일.
 */
export function normalizeToken(raw) {
  if (raw == null || typeof raw !== "string") return "";
  const t = raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
  return t ? `Bearer ${t}` : "";
}

/**
 * 401/403 등 에러 응답 메시지를 구분해 throw.
 */
function throwApiError(res, data) {
  const msg =
    (data && typeof data.message === "string" && data.message) ||
    `HTTP ${res.status}`;
  if (res.status === 401) {
    const e = new Error(msg);
    e.code = 401;
    e.isAuth = true;
    throw e;
  }
  if (res.status === 403) {
    const e = new Error(msg);
    e.code = 403;
    e.isForbidden = true;
    throw e;
  }
  const e = new Error(msg);
  e.code = res.status;
  throw e;
}

/**
 * 공통 fetch: Authorization 자동 첨부, 401/403 에러 throw.
 * @param {string} method - GET, POST, PATCH, etc.
 * @param {string} path - /api/... (앞에 슬래시)
 * @param {object} [body] - JSON body (POST/PATCH 시)
 * @param {{ token?: string }} [opts] - token 덮어쓰기
 */
export async function apiFetch(method, path, body, opts = {}) {
  const token = opts.token != null ? normalizeToken(opts.token) : getToken();
  const url = path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: token } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    ...(body != null && method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
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
