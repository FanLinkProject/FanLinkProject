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
