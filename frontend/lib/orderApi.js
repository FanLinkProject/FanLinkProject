/**
 * Order 도메인 API
 */
import { request } from "@/lib/api";

export function createOrder(body) {
  return request("/api/orders", { method: "POST", body });
}

export function createCandyOrder(productId, quantity = 1) {
  return request("/api/orders/candy", {
    method: "POST",
    body: { productId, quantity },
  });
}
