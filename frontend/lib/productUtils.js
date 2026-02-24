/**
 * 상품 관련 공통 유틸리티.
 * market/new, market/[id]/edit, market/page, artists/[id]/market 에서 공유.
 */

export function computeTypeAndPayment(artistId, price, candyPrice) {
  const hasCash = price != null && price > 0;
  const hasCandy = candyPrice != null && candyPrice > 0;
  const paymentMethod = hasCash && !hasCandy ? "CASH_ONLY" : "CANDY_ONLY";
  const baseType = paymentMethod === "CASH_ONLY" ? "CASH" : "CANDY";
  const type = artistId ? `SETTLEMENT_${baseType}` : baseType;
  return { type, paymentMethod };
}

export function getProductImageUrl(product) {
  const rep = product.attachments?.find(
    (a) => a.mediaAssetId === product.representativeMediaAssetId
  );
  if (rep?.url) return rep.url;
  return product.attachments?.[0]?.url || null;
}

export function formatPrice(product) {
  if (product.paymentMethod === "CANDY_ONLY" && product.candyPrice > 0) {
    return `${product.candyPrice?.toLocaleString()} 캔디`;
  }
  return `${product.price?.toLocaleString()}원`;
}

export function isDmProduct(product) {
  return product.isSubscription && product.paymentMethod === "CANDY_ONLY";
}
