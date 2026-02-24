/**
 * Music Video 도메인 API (아티스트별 YouTube 뮤직비디오 등록/조회/삭제).
 */
import { request } from "@/lib/api";

export function list(artistId, keyword) {
  const query = keyword?.trim() ? `?q=${encodeURIComponent(keyword.trim())}` : "";
  return request(`/api/artists/${artistId}/music-videos${query}`);
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

/**
 * YouTube embed URL을 privacy-enhanced 모드로 변환하고 필수 파라미터를 추가.
 * youtube-nocookie.com 사용으로 쿠키 동의 에러 방지,
 * origin 파라미터로 X-Frame-Options 에러 방지.
 */
export function getSafeEmbedUrl(embedUrl) {
  if (!embedUrl) return "";
  try {
    const url = new URL(embedUrl);
    url.hostname = "www.youtube-nocookie.com";
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");
    if (typeof window !== "undefined") {
      url.searchParams.set("origin", window.location.origin);
    }
    return url.toString();
  } catch {
    return embedUrl;
  }
}
