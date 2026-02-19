/**
 * IVS 도메인 API (Playback Token 발급).
 * - POST /api/ivs/playback-token
 * JWT(로그인 토큰)와 IVS Playback Token은 별개. 서버가 liveSessionId 기반으로 권한 검증 후 토큰 서명.
 */
import { request } from "@/lib/api";

/**
 * IVS Playback Token 발급 (라이브 시청 시 플레이어에 전달)
 * @param {number} liveSessionId
 * @param {number} [ttlSeconds=300] - 60~600
 * @returns {Promise<{ token: string; expiresAt: string; ttlSeconds: number; recommendedRefreshInSeconds: number }>}
 */
export function createPlaybackToken(liveSessionId, ttlSeconds = 300) {
  return request("/api/ivs/playback-token", {
    method: "POST",
    body: { liveSessionId, ttlSeconds: ttlSeconds ?? 300 },
  });
}
