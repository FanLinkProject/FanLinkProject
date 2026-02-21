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
