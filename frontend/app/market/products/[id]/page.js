"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProduct, getProductsByArtist } from "@/lib/productApi";
import { getProfile } from "@/lib/userApi";
import { createCandyOrder } from "@/lib/orderApi";
import { createCandySubscription } from "@/lib/subscriptionApi";
import { request } from "@/lib/api";
import { apiGet } from "@/lib/api";
import { isArtistOrGroupAccount } from "@/lib/authRedirect";

function getProductImages(product) {
  return (product.attachments || []).filter(
    (a) => a?.url && a.category === "PRODUCT_IMAGE"
  );
}

function getDescribeImages(product) {
  return (product.attachments || []).filter(
    (a) => a?.url && a.category === "PRODUCT_DESCRIBE_IMAGE"
  );
}

function getProductImageUrl(product) {
  const rep = product.attachments?.find(
    (a) => a.mediaAssetId === product.representativeMediaAssetId
  );
  if (rep?.url) return rep.url;
  const images = getProductImages(product);
  return images[0]?.url || product.attachments?.[0]?.url || null;
}

function ProductImageCarousel({ images }) {
  const scrollRef = useRef(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const count = images.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIdx(Math.min(Math.max(idx, 0), count - 1));
  }, [count]);

  const goTo = useCallback((idx) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * idx, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.querySelectorAll("video").forEach((video, idx) => {
      if (idx !== currentIdx) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIdx]);

  if (count === 0) {
    return (
      <div className="aspect-square rounded-[3rem] overflow-hidden bg-white/5 border border-white/[0.06] flex items-center justify-center text-white/30">
        <span className="material-symbols-outlined text-8xl">image</span>
      </div>
    );
  }

  if (count === 1) {
    const att = images[0];
    const isVideo = att.contentType?.startsWith("video/");
    return (
      <div className="aspect-square rounded-[3rem] overflow-hidden bg-black/20 border border-white/[0.06]">
        {isVideo ? (
          <video src={att.url} controls preload="metadata" className="w-full h-full object-contain" />
        ) : (
          <img src={att.url} alt="" className="w-full h-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-square rounded-[3rem] border border-white/[0.06]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {images.map((att, idx) => {
          const isVideo = att.contentType?.startsWith("video/");
          return (
            <div key={att.mediaAssetId || idx} className="w-full h-full shrink-0 snap-center bg-black/20">
              {isVideo ? (
                <video src={att.url} controls preload="metadata" className="w-full h-full object-contain" />
              ) : (
                <img src={att.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          );
        })}
      </div>

      {currentIdx > 0 && (
        <button
          type="button"
          onClick={() => goTo(currentIdx - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
      )}
      {currentIdx < count - 1 && (
        <button
          type="button"
          onClick={() => goTo(currentIdx + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goTo(idx)}
            className={`rounded-full transition-all ${
              idx === currentIdx ? "w-6 h-2 bg-white" : "size-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
        {currentIdx + 1} / {count}
      </span>
    </div>
  );
}

function formatPrice(product) {
  if (product.paymentMethod === "CANDY_ONLY" && product.candyPrice > 0) {
    return `${product.candyPrice?.toLocaleString()} 캔디`;
  }
  return `${product.price?.toLocaleString()}원`;
}

function formatSaleStartForMessage(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
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
  const [isFollowing, setIsFollowing] = useState(null); // null: 로딩/플랫폼상품, true/false: 아티스트 상품
  const [isFollowingGroup, setIsFollowingGroup] = useState(false); // 소속 멤버 상품: 그룹 팔로우 시 구매 가능
  const [concert, setConcert] = useState(null); // 티켓 상품일 때 공연 기간 정보
  const [hidePurchaseUI, setHidePurchaseUI] = useState(false); // 그룹/아티스트 계정: 구매·장바구니·팔로우 안내 숨김

  useEffect(() => {
    setHidePurchaseUI(isArtistOrGroupAccount());
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("productDetailReturnPath");
    if (saved) setReturnPath(saved);
  }, []);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((p) => {
        setProduct(p);
        if (p.concertId != null) {
          apiGet(`/api/concerts/${p.concertId}`)
            .then((c) => setConcert(c))
            .catch(() => setConcert(null));
        } else {
          setConcert(null);
        }
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

  // 아티스트 상품인 경우 팔로우 여부 조회 (artistId가 null이면 플랫폼 상품 → 구매 가능)
  // 소속 멤버 DM: 그룹 팔로우 시에도 구매 가능 (isFollowingGroup)
  useEffect(() => {
    if (!product) {
      setIsFollowing(null);
      setIsFollowingGroup(false);
      return;
    }
    if (product.artistId == null) {
      setIsFollowing(true);
      setIsFollowingGroup(false);
      return;
    }
    request(`/api/user/artists/${product.artistId}/dashboard`)
      .then((data) => {
        setIsFollowing(data?.followStatus?.isFollowing ?? false);
        setIsFollowingGroup(data?.followStatus?.isFollowingGroup ?? false);
      })
      .catch(() => {
        setIsFollowing(false);
        setIsFollowingGroup(false);
      });
  }, [product?.id, product?.artistId]);

  const handleBack = () => {
    router.push(returnPath);
  };

  const isTicketProduct = product?.concertId != null;
  const isPresaleTicket = isTicketProduct && product?.isMembershipOnly === true;
  const ticketSaleStartIso = concert
    ? (isPresaleTicket ? concert.presaleStartDateTime : concert.saleStartDateTime)
    : null;
  const ticketSaleStartTime = ticketSaleStartIso ? new Date(ticketSaleStartIso).getTime() : null;
  const now = Date.now();
  const ticketPeriodAllowed = !isTicketProduct || (ticketSaleStartTime != null && now >= ticketSaleStartTime);
  const ticketDisabledMessage =
    isTicketProduct && !ticketPeriodAllowed
      ? ticketSaleStartIso
        ? `${formatSaleStartForMessage(ticketSaleStartIso)}부터 구매 가능`
        : "예매 기간 확인 중..."
      : null;

  const canPurchase = (product?.artistId == null || isFollowing === true || isFollowingGroup === true) && ticketPeriodAllowed;
  const followTooltip = "해당 아티스트 또는 소속 그룹을 팔로우한 후 구매 및 장바구니 담기가 가능합니다.";
  const purchaseDisabledTooltip = ticketDisabledMessage || (!canPurchase ? followTooltip : undefined);

  const handleAddToCart = () => {
    if (!canPurchase) return;
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
    if (!canPurchase) return;
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

  const productImages = getProductImages(product);
  const describeImages = getDescribeImages(product);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-white/55 hover:text-violet-300 transition-colors font-bold text-xs uppercase tracking-widest"
      >
        <span className="material-symbols-outlined">arrow_back</span> 돌아가기
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 bg-[#201a33] rounded-[3.5rem] p-12 border border-white/[0.08]">
        <div>
          <ProductImageCarousel images={productImages} />
        </div>
        <div className="flex flex-col">
          {product.artistId != null ? (
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
          ) : (
            <div className="flex items-center gap-4 mb-8 w-fit">
              <div className="size-12 rounded-2xl border border-white/[0.1] bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/50">redeem</span>
              </div>
              <div>
                <h4 className="text-base font-black text-white">FanLink</h4>
                <p className="text-[10px] text-white/55 uppercase tracking-widest font-black">캔디로 구매</p>
              </div>
            </div>
          )}
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">{product.name}</h1>
          <p className="text-3xl font-black text-violet-300 mb-10">{formatPrice(product)}</p>
          {!hidePurchaseUI && (
            <>
              <div
                className={`mt-12 flex gap-4 ${!canPurchase ? "cursor-not-allowed" : ""}`}
                title={purchaseDisabledTooltip}
              >
                <button
                  type="button"
                  onClick={handleBuyNowClick}
                  disabled={!canPurchase}
                  title={purchaseDisabledTooltip}
                  className={`flex-1 py-5 rounded-3xl font-black text-base uppercase tracking-widest text-center transition-all ${
                    canPurchase
                      ? "bg-violet-500/90 text-white hover:brightness-110"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  {ticketDisabledMessage || "지금 바로 구매하기"}
                </button>
                {!isCandyOnly && !isTicketProduct && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canPurchase}
                    title={purchaseDisabledTooltip}
                    className={`size-16 rounded-3xl border flex items-center justify-center transition-all ${
                      canPurchase
                        ? "border-white/[0.08] text-white/55 hover:bg-white/[0.06] hover:text-violet-300"
                        : "border-white/[0.06] text-white/30 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined">shopping_cart</span>
                  </button>
                )}
              </div>
              {!canPurchase && product.artistId != null && !ticketDisabledMessage && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-amber-400/90 flex items-start gap-2">
                    <span className="material-symbols-outlined text-lg shrink-0">info</span>
                    <span>{followTooltip}</span>
                  </p>
                  <p className="text-sm">
                    <Link href={`/artists/${product.artistId}`} className="text-amber-400/90 underline hover:text-amber-300">
                      아티스트 페이지에서 팔로우하기 →
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {describeImages.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-2xl font-black text-white px-2">상세 정보</h3>
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {describeImages.map((a) => {
              const isVideo = a.contentType?.startsWith("video/");
              return isVideo ? (
                <video
                  key={a.mediaAssetId}
                  src={a.url}
                  controls
                  preload="metadata"
                  className="w-full rounded-2xl border border-white/[0.06]"
                />
              ) : (
                <img
                  key={a.mediaAssetId}
                  src={a.url}
                  alt=""
                  className="w-full rounded-2xl border border-white/[0.06]"
                />
              );
            })}
          </div>
        </section>
      )}

      {sameArtistProducts.length > 0 && (
        <section>
          <h3 className="text-2xl font-black text-white mb-8 px-2">{(product.artistName || "아티스트")}의 다른 굿즈</h3>
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
                  <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-1">{p.artistName || (p.artistId == null ? "FanLink" : "아티스트")}</p>
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
