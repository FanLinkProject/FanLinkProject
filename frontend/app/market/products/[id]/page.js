"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProduct, getProductsByArtist } from "@/lib/productApi";
import { getProfile } from "@/lib/userApi";
import { createCandyOrder } from "@/lib/orderApi";
import { createCandySubscription } from "@/lib/subscriptionApi";

function getProductImageUrl(product) {
  const rep = product.attachments?.find(
    (a) => a.mediaAssetId === product.representativeMediaAssetId
  );
  if (rep?.url) return rep.url;
  return product.attachments?.[0]?.url || null;
}

function formatPrice(product) {
  if (product.paymentMethod === "CANDY_ONLY" && product.candyPrice > 0) {
    return `${product.candyPrice?.toLocaleString()} 캔디`;
  }
  return `${product.price?.toLocaleString()}원`;
}

export default function ProductDetailPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [sameArtistProducts, setSameArtistProducts] = useState([]);
  const [returnPath, setReturnPath] = useState("/market");
  const [candyModalOpen, setCandyModalOpen] = useState(false);
  const [candyBalance, setCandyBalance] = useState(null);
  const [candyModalLoading, setCandyModalLoading] = useState(false);
  const [candyPaying, setCandyPaying] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("productDetailReturnPath");
    if (saved) setReturnPath(saved);
  }, []);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((p) => {
        setProduct(p);
        if (p.artistId) {
          return getProductsByArtist(p.artistId);
        }
        return [];
      })
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setSameArtistProducts(arr.filter((p) => p.id !== Number(id)).slice(0, 4));
      })
      .catch(() => setProduct(null));
  }, [id]);

  const handleBack = () => {
    router.push(returnPath);
  };

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        candyPrice: product.candyPrice,
        paymentMethod: product.paymentMethod,
        quantity: 1,
        artistId: product.artistId,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("장바구니에 담았습니다.");
  };

  const isCandyOnly = product?.paymentMethod === "CANDY_ONLY" && (product?.candyPrice || 0) > 0;
  const candyPrice = product?.candyPrice || 0;
  const candyTotal = candyPrice; // 캔디 상품은 수량 1 고정
  const isCandySufficient = candyBalance != null && candyBalance >= candyTotal;

  const handleBuyNowClick = () => {
    if (isCandyOnly) {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }
      setCandyModalOpen(true);
      setCandyModalLoading(true);
      getProfile()
        .then((p) => setCandyBalance(p?.candy ?? 0))
        .catch(() => setCandyBalance(0))
        .finally(() => setCandyModalLoading(false));
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("checkoutReturnPath", window.location.pathname);
      }
      router.push(`/checkout?productId=${product.id}&quantity=1`);
    }
  };

  const handleCandyConfirm = async () => {
    if (!isCandySufficient || candyPaying) return;
    setCandyPaying(true);
    try {
      if (product.isSubscription) {
        await createCandySubscription(product.id);
        setCandyModalOpen(false);
        const successParams = new URLSearchParams({ status: "SUCCESS", isCandy: "1" });
        if (product.artistId) successParams.set("returnPath", `/artists/${product.artistId}`);
        router.push(`/payment/success?${successParams.toString()}`);
      } else {
        await createCandyOrder(product.id, 1);
        setCandyModalOpen(false);
        alert("캔디 결제가 완료되었습니다.");
      }
      getProfile().then((p) => setCandyBalance(p?.candy ?? 0));
    } catch (e) {
      alert(e?.message || "결제에 실패했습니다.");
    } finally {
      setCandyPaying(false);
    }
  };

  if (!product) {
    return (
      <div className="p-8 lg:p-12">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  const imgUrl = getProductImageUrl(product);
  const describeImages = product.attachments?.filter(
    (a) => a.category === "PRODUCT_DESCRIBE_IMAGE"
  ) || product.attachments || [];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-white/55 hover:text-violet-300 transition-colors font-bold text-xs uppercase tracking-widest"
      >
        <span className="material-symbols-outlined">arrow_back</span> 돌아가기
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 bg-[#201a33] rounded-[3.5rem] p-12 border border-white/[0.08]">
        <div className="space-y-6">
          <div className="aspect-square rounded-[3rem] overflow-hidden bg-white/5 border border-white/[0.06]">
            {imgUrl ? (
              <img src={imgUrl} className="w-full h-full object-cover" alt={product.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <span className="material-symbols-outlined text-8xl">image</span>
              </div>
            )}
          </div>
          {describeImages.length > 0 && (
            <div className="space-y-4">
              <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55">상세 설명</h5>
              <div className="flex flex-col gap-4">
                {describeImages.map((a) => (
                  a.url && (
                    <img key={a.mediaAssetId} src={a.url} alt="" className="w-full rounded-2xl" />
                  )
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <Link href={`/artists/${product.artistId}`} className="flex items-center gap-4 mb-8 cursor-pointer group w-fit">
            <div className="size-12 rounded-2xl border border-white/[0.1] bg-white/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/50">person</span>
            </div>
            <div>
              <h4 className="text-base font-black text-white group-hover:text-violet-300 transition-colors">
                {product.artistName || "아티스트"}
              </h4>
              <p className="text-[10px] text-white/55 uppercase tracking-widest font-black">OFFICIAL MERCHANDISE</p>
            </div>
          </Link>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">{product.name}</h1>
          <p className="text-3xl font-black text-violet-300 mb-10">{formatPrice(product)}</p>
          {describeImages.length === 0 && (
            <div className="flex-1 mb-10">
              <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55 mb-5">상세 설명</h5>
              <p className="text-white/75 leading-relaxed text-lg font-medium">
                이 상품은 아티스트가 직접 참여하여 제작된 공식 굿즈입니다.
              </p>
            </div>
          )}
          <div className="mt-12 flex gap-4">
            <button
              type="button"
              onClick={handleBuyNowClick}
              className="flex-1 py-5 bg-violet-500/90 text-white rounded-3xl font-black text-base hover:brightness-110 transition-all uppercase tracking-widest text-center"
            >
              지금 바로 구매하기
            </button>
            {!isCandyOnly && (
              <button
                type="button"
                onClick={handleAddToCart}
                className="size-16 rounded-3xl border border-white/[0.08] flex items-center justify-center text-white/55 hover:bg-white/[0.06] hover:text-violet-300 transition-all"
              >
                <span className="material-symbols-outlined">shopping_cart</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {sameArtistProducts.length > 0 && (
        <section>
          <h3 className="text-2xl font-black text-white mb-8 px-2">{product.artistName}의 다른 굿즈</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {sameArtistProducts.map((p) => (
              <Link
                key={p.id}
                href={`/market/products/${p.id}`}
                onClick={() => sessionStorage.setItem("productDetailReturnPath", window.location.pathname)}
                className="bg-[#201a33] rounded-[2.5rem] p-4 border border-white/[0.08] hover:border-white/[0.12] transition-all group"
              >
                <div className="aspect-square rounded-3xl overflow-hidden mb-4 bg-white/5">
                  {getProductImageUrl(p) ? (
                    <img src={getProductImageUrl(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <span className="material-symbols-outlined">image</span>
                    </div>
                  )}
                </div>
                <div className="px-1">
                  <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-1">{p.artistName}</p>
                  <h4 className="text-sm font-bold text-white truncate mb-1">{p.name}</h4>
                  <p className="text-base font-black text-violet-300">{formatPrice(p)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {candyModalOpen && isCandyOnly && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !candyPaying && setCandyModalOpen(false)}
        >
          <div
            className="bg-[#201a33] rounded-[2rem] p-8 max-w-md w-full border border-white/[0.12] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-white mb-6">캔디 결제</h3>
            {candyModalLoading ? (
              <p className="text-white/55">잔액 확인 중...</p>
            ) : !isCandySufficient ? (
              <div className="space-y-6">
                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400/90 text-2xl">error</span>
                  <p className="font-bold text-red-400/90">캔디 수가 부족합니다.</p>
                </div>
                <div className="flex justify-between text-sm text-white/70">
                  <span>필요 캔디</span>
                  <span>{candyTotal.toLocaleString()} 캔디</span>
                </div>
                <div className="flex justify-between text-sm text-white/70">
                  <span>보유 캔디</span>
                  <span>{(candyBalance ?? 0).toLocaleString()} 캔디</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCandyModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl border border-white/[0.12] text-white/80 font-bold hover:bg-white/[0.06]"
                  >
                    닫기
                  </button>
                  <Link
                    href="/candy/recharge"
                    className="flex-1 py-4 rounded-2xl bg-violet-500/90 text-white font-black text-center hover:brightness-110"
                  >
                    캔디 충전하기
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/55">잔여 캔디</span>
                    <span className="text-white font-bold">{(candyBalance ?? 0).toLocaleString()} 캔디</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/55">차감 예정 캔디</span>
                    <span className="text-violet-300 font-bold">{(candyTotal).toLocaleString()} 캔디</span>
                  </div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex justify-between">
                    <span className="text-white font-bold">결제 후 잔액</span>
                    <span className="text-violet-300 font-black text-lg">
                      {((candyBalance ?? 0) - candyTotal).toLocaleString()} 캔디
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCandyModalOpen(false)}
                    disabled={candyPaying}
                    className="flex-1 py-4 rounded-2xl border border-white/[0.12] text-white/80 font-bold hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleCandyConfirm}
                    disabled={candyPaying}
                    className="flex-1 py-4 rounded-2xl bg-violet-500/90 text-white font-black hover:brightness-110 disabled:opacity-50"
                  >
                    {candyPaying ? "처리 중..." : "결제 확인"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
