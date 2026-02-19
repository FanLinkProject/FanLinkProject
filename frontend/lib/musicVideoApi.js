/**
 * Music Video 도메인 API (아티스트별 YouTube 뮤직비디오 등록/조회/삭제).
 */
import { request } from "@/lib/api";

export function list(artistId) {
  return request(`/api/artists/${artistId}/music-videos`);
}

export function getDetail(artistId, id) {
  return request(`/api/artists/${artistId}/music-videos/${id}`);
}

export function create(artistId, body) {
  return request(`/api/artists/${artistId}/music-videos`, {
    method: "POST",
    body,
  });
}

export function remove(artistId, id) {
  return request(`/api/artists/${artistId}/music-videos/${id}`, {
    method: "DELETE",
  });
}
