/**
 * 사용자·마이페이지·프로필 API (인증 필요)
 */

import { request } from "./api";

/**
 * 내 프로필 조회
 */
export async function getProfile() {
  return request("/api/user/profile");
}

/**
 * 프로필 수정 (nickname, profileImageUrl)
 */
export async function updateProfile(body) {
  return request("/api/user/profile", { method: "PUT", body });
}

/**
 * 마이페이지 통합 조회 (프로필, 구매내역, 멤버십, 팔로우 등)
 * @param {{ page?: number, size?: number }} params
 */
export async function getMypage(params = {}) {
  const query = {};
  if (params.page != null) query.page = params.page;
  if (params.size != null) query.size = params.size;
  return request("/api/user/mypage", { query: Object.keys(query).length ? query : undefined });
}

/**
 * OAuth 간편가입 후 부족한 추가 정보 저장 (name, gender, birth, phoneNumber)
 */
export async function completeOAuthProfile(body) {
  return request("/api/user/profile/complete", { method: "PUT", body });
}
