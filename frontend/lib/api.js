/**
 * LiveSession/ LiveChat 테스트용 공통 설정.
 * - Base URL, Bearer 토큰 정규화만 제공 (추가 라이브러리 없음).
 */

export const BASE_URL = "http://localhost:8080";

/**
 * 사용자 입력 토큰을 "Bearer <token>" 형태로 통일.
 * 이미 "Bearer " 접두어가 있어도 제거 후 다시 붙여 정규화.
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
 * 공통 API 요청 (fetch). 토큰은 localStorage.accessToken 사용.
 * @param {string} path - 경로 (예: /api/replays/candidates)
 * @param {{ method?: string; body?: object; query?: object }} options
 * @returns {Promise<object>} JSON 응답
 */
export async function request(path, { method = "GET", body, query } = {}) {
  const token = normalizeToken(
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || ""
      : "",
  );
  const qs =
    query && Object.keys(query).length
      ? `?${new URLSearchParams(query).toString()}`
      : "";
  const res = await fetch(`${BASE_URL}${path}${qs}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
