/**
 * Replay 도메인 API (다시보기 후보 목록, 발행, 조회, Access Gate).
 */
import { BASE_URL, normalizeToken, request } from "@/lib/api";

export const ReplayAccessType = { FREE: "FREE", PAID: "PAID" };

export function getCandidates(artistId) {
  return request("/api/replays/candidates", { query: { artistId } });
}

export function publish(body) {
  return request("/api/replays/publish", { method: "POST", body });
}

export function getReplay(replayId) {
  return request(`/api/replays/${replayId}`);
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
