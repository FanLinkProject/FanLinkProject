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
