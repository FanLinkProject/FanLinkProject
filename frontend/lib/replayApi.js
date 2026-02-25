/**
 * Replay 도메인 API (다시보기 후보 목록, 발행, 조회, Access Gate).
 */
import { BASE_URL, normalizeToken, request } from "@/lib/api";

export const ReplayAccessType = { FREE: "FREE", PAID: "PAID" };

export function listByArtist(artistId) {
  return request("/api/replays", { query: { artistId } });
}

export function getCandidates(artistId) {
  const id = artistId != null ? Number(artistId) : NaN;
  if (Number.isNaN(id) || id < 1) {
    return Promise.reject(new Error("유효한 artistId가 필요합니다."));
  }
  return request("/api/replays/candidates", { query: { artistId: id } });
}

export function publish(body) {
  return request("/api/replays/publish", { method: "POST", body });
}

/** 다시보기 수동 업로드 슬롯 생성. 반환된 replayId로 REPLAY_VIDEO presign 업로드 후 complete. */
export function createManualReplay(body) {
  return request("/api/replays/manual", { method: "POST", body });
}

/** 수동 업로드 Replay 발행. 상태가 READY일 때만 가능. */
export function publishManualReplay(replayId) {
  return request(`/api/replays/${replayId}/publish-manual`, { method: "POST" });
}

export function getReplay(replayId) {
  return request(`/api/replays/${replayId}`);
}

export function deleteReplay(replayId) {
  return request(`/api/replays/${replayId}`, { method: "DELETE" });
}

/**
 * Access Gate. credentials: 'include'로 호출하면 서버가 Set-Cookie로 쿠키 발급.
 * @param {number} replayId
 */
export async function access(replayId) {
  const token = normalizeToken(
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || ""
      : "",
  );
  const res = await fetch(`${BASE_URL}/api/replays/${replayId}/access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `Access failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
