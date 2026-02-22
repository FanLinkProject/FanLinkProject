"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProduct } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const SHIPPING_FEE = 3000;

function getProductImageUrl(product) {
  const rep = product?.attachments?.find(
    (a) => a.mediaAssetId === product.representativeMediaAssetId
  );
  if (rep?.url) return rep.url;
  return product?.attachments?.[0]?.url || null;
}

function formatPrice(product) {
  if (!product) return "0원";
  if (product.paymentMethod === "CANDY_ONLY" && product.candyPrice > 0) {
    return `${product.candyPrice?.toLocaleString()} 캔디`;
  }
  return `${product.price?.toLocaleString()}원`;
}

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem("cart") || "[]");
    const list = Array.isArray(raw) ? raw : [];
    setItems(list);

    const ids = [...new Set(list.map((i) => i.productId))];
    Promise.all(ids.map((id) => getProduct(id).catch(() => null)))
      .then((products) => {
        const map = {};
        products.forEach((p, i) => {
          if (p && ids[i]) map[ids[i]] = p;
        });
        setProductDetails(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateQuantity = (productId, delta) => {
    const p = productDetails[productId];
    if (p?.isMembership) return; // 멤버십 상품은 수량 변경 불가
    setItems((prev) => {
      const next = prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
          : item
      );
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
  };

  const cashItems = items.filter((i) => {
    const p = productDetails[i.productId];
    return p && p.paymentMethod !== "CANDY_ONLY" && (p.price || 0) > 0;
  });
  const totalCash = cashItems.reduce((acc, item) => {
    const p = productDetails[item.productId];
    const price = p?.price || 0;
    return acc + price * (item.quantity || 1);
  }, 0);
  // 배송비: 플랫폼·멤버십·티켓 제외한 배송 필요 상품이 있을 때만 (캔디 충전 등 artistId=null 제외)
  const hasShippableItem = cashItems.some((i) => {
    const p = productDetails[i.productId];
    return p && p.artistId != null && !p.isMembership && !p.concertId;
  });
  const totalAmount = totalCash + (hasShippableItem ? SHIPPING_FEE : 0);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <SectionTitle className="text-2xl font-bold">장바구니</SectionTitle>
        <Link
          href="/market"
          className="text-sm font-bold text-white/55 hover:text-violet-300 transition-colors"
        >
          계속 쇼핑하기
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <p className="text-white/55">로딩 중...</p>
          ) : items.length === 0 ? (
            <Surface variant="primary" className="py-20 text-center">
              <span className="material-symbols-outlined text-6xl text-white/30 mb-4 block">
                shopping_cart
              </span>
              <p className="text-white/55 italic">장바구니가 비어 있습니다.</p>
              <Link
                href="/market"
                className="inline-block mt-6 py-3 px-6 bg-violet-500/80 text-white rounded-2xl font-bold text-sm hover:brightness-110"
              >
                마켓 둘러보기
              </Link>
            </Surface>
          ) : (
            items.map((item) => {
              const p = productDetails[item.productId];
              const imgUrl = getProductImageUrl(p);
              const isCandy = p?.paymentMethod === "CANDY_ONLY";
              const isMembership = p?.isMembership === true;
              return (
                <Surface key={item.productId} variant="primary" className="p-6 flex gap-6">
                  <div className="size-24 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/5 shrink-0">
                    {imgUrl ? (
                      <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/30">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white truncate">{item.name || p?.name}</h4>
                      <p className="text-xs text-white/55 font-medium uppercase tracking-widest">
                        {p?.artistName || "아티스트"}
                      </p>
                    </div>
                    <div className="flex items-stretch justify-between min-h-[56px]">
                      {isMembership ? (
                        <span className="text-sm font-bold text-white/70 flex items-center">수량 1</span>
                      ) : (
                        <div className="flex items-center gap-3 bg-white/[0.06] rounded-xl p-1 border border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="size-8 rounded-lg hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/80"
                          >
                            <span className="material-symbols-outlined text-lg">remove</span>
                          </button>
                          <span className="text-sm font-black w-6 text-center text-white">
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="size-8 rounded-lg hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/80"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                          </button>
                        </div>
                      )}
                      <div className="text-right flex flex-col justify-center items-end gap-0.5 min-w-0">
                        <p className="font-black text-violet-300 leading-tight">
                          {isCandy
                            ? formatPrice(p)
                            : `${((p?.price || 0) * (item.quantity || 1)).toLocaleString()}원`}
                        </p>
                        {!isCandy && (item.quantity || 1) > 1 && (
                          <p className="text-[10px] text-white/50 leading-tight">
                            {(p?.price || 0).toLocaleString()}원 × {item.quantity || 1}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-white/45 hover:text-red-400/90 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </Surface>
              );
            })
          )}
        </div>

        <div className="lg:col-span-4">
          <Surface variant="primary" className="p-8 sticky top-24">
            <h3 className="font-black text-lg text-white mb-6">주문 요약</h3>
            <div className="space-y-4 mb-8">
              {cashItems.length > 0 && (
                <div className="space-y-2 pb-4 border-b border-white/[0.06]">
                  {cashItems.map((item) => {
                    const p = productDetails[item.productId];
                    const qty = item.quantity || 1;
                    const subtotal = (p?.price || 0) * qty;
                    return (
                      <div key={item.productId} className="flex justify-between text-sm text-white/70">
                        <span className="truncate pr-2">
                          {item.name || p?.name} × {qty}
                        </span>
                        <span className="shrink-0">{subtotal.toLocaleString()}원</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between text-sm text-white/55">
                <span>상품 금액</span>
                <span>{totalCash.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm text-white/55">
                <span>배송비</span>
                <span>{hasShippableItem ? `${SHIPPING_FEE.toLocaleString()}원` : "0원"}</span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between font-black text-xl text-violet-300">
                <span>총 결제 금액</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
            <Button
              href={cashItems.length > 0 ? "/checkout" : "#"}
              variant="primary"
              disabled={cashItems.length === 0}
              className="w-full py-4 text-sm uppercase tracking-widest"
              onClick={() => {
                if (cashItems.length > 0 && typeof window !== "undefined") {
                  sessionStorage.setItem("checkoutReturnPath", "/cart");
                }
              }}
            >
              주문하기
            </Button>
          </Surface>
        </div>
      </div>
    </div>
  );
}
