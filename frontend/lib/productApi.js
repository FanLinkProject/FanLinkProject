/**
 * Product 도메인 API
 */
import { request, BASE_URL } from "@/lib/api";

export function getProducts(params = {}) {
  const query = {};
  if (params.artistId != null) query.artistId = params.artistId;
  if (params.artistIds?.length) query.artistIds = params.artistIds.join(",");
  if (params.market === true) query.market = "true";
  return request("/api/products", { query });
}

export function getProductsByArtist(artistId) {
  return request(`/api/products/by-artist/${artistId}`);
}

export function getCandyRechargeProducts() {
  return request("/api/candy-recharge/products");
}

export function getProduct(id) {
  return request(`/api/products/${id}`);
}

export function createProduct(body) {
  return request("/api/products", { method: "POST", body });
}

export function updateProduct(id, body) {
  return request(`/api/products/${id}`, { method: "PUT", body });
}

export function deleteProduct(id) {
  return request(`/api/products/${id}`, { method: "DELETE" });
}
