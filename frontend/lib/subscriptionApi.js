/**
 * Subscription 도메인 API
 */
import { request } from "@/lib/api";

export function createCandySubscription(productId) {
  return request("/api/subscriptions/candy", {
    method: "POST",
    body: { productId },
  });
}

/**
 * 해당 아티스트 DM 구독 여부 및 채팅방 ID 조회
 * @param {number} artistId - 아티스트(멤버) ID
 * @returns {{ hasSubscription: boolean, roomId: number|null }}
 */
export function checkDmSubscription(artistId) {
  return request(`/api/subscriptions/check-dm?artistId=${artistId}`);
}
