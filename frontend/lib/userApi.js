/**
 * User 도메인 API (아티스트 목록, 프로필 등)
 */
import { request } from "@/lib/api";

export function getProfile() {
  return request("/api/user/profile");
}

export function getArtists(params = {}) {
  const query = {};
  if (params.nickname != null) query.nickname = params.nickname;
  if (params.page != null) query.page = params.page;
  if (params.size != null) query.size = params.size;
  return request("/api/user/artists", { query });
}
