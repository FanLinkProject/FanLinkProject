/**
 * 공연(Concert) API - 티켓 상품 등록 시 공연 목록 조회용
 */
import { request } from "@/lib/api";

export function getConcerts() {
  return request("/api/concerts");
}
