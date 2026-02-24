/**
 * JWT 토큰에서 role 추출 (ROLE_USER, ROLE_ARTIST, ROLE_GROUP, ROLE_ADMIN 등)
 */
export function getRoleFromToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("accessToken");
  if (!raw) return null;
  try {
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload?.role || null;
  } catch {
    return null;
  }
}

/**
 * 그룹 또는 아티스트 계정인지 (상품 구매 불가)
 */
export function isArtistOrGroupAccount() {
  const role = getRoleFromToken();
  return role === "ROLE_GROUP" || role === "ROLE_ARTIST";
}

/**
 * 토큰 만료/없음 시 비로그인 홈으로 보냄.
 * 토큰을 제거하고 /home으로 전체 새로고침하여 게스트 홈이 로드되도록 함.
 */
export function redirectToGuestHome() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  } catch (_) {}
  window.location.href = "/home";
}
