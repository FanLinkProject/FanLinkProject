/**
 * Payment 도메인 API
 */
import { request } from "@/lib/api";

export function getPaymentConfig() {
  return request("/api/payments/config");
}
