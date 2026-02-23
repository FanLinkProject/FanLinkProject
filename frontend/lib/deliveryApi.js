/**
 * 배송 조회 API (인증 필요)
 */

import { request } from "./api";

/**
 * 배송 조회 (실시간 추적 포함)
 * @param {number} deliveryId
 */
export async function getDelivery(deliveryId) {
  return request(`/api/deliveries/${deliveryId}`);
}

/**
 * 배송 상태 변경 이력 조회
 * @param {number} deliveryId
 */
export async function getDeliveryHistory(deliveryId) {
  return request(`/api/deliveries/${deliveryId}/history`);
}
