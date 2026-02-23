"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { createOrder } from "@/lib/orderApi";
import { getPaymentConfig } from "@/lib/paymentApi";
import { getProduct } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const DEFAULT_SHIPPING_FEE = 3000;

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

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");
  const quantityParam = parseInt(searchParams.get("quantity") || "1", 10);
  const isCandyRecharge = searchParams.get("candyRecharge") === "1";

  const [items, setItems] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [returnPath, setReturnPath] = useState("/cart");
  const [shippingFee, setShippingFee] = useState(DEFAULT_SHIPPING_FEE);
  const [shippingInfo, setShippingInfo] = useState({
    recipientName: "",
    recipientPhone: "",
    zipCode: "",
    address: "",
    detailAddress: "",
    countryCode: "KR",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("checkoutReturnPath");
      setReturnPath(saved && saved.startsWith("/") ? saved : "/cart");
    }
  }, []);

  useEffect(() => {
    let rawItems = [];
    if (productIdParam) {
      rawItems = [{ productId: parseInt(productIdParam, 10), quantity: Math.max(1, quantityParam) }];
    } else {
      rawItems = JSON.parse(localStorage.getItem("cart") || "[]");
    }
    const list = Array.isArray(rawItems) ? rawItems : [];
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
  }, [productIdParam, quantityParam]);

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
  const totalAmount = totalCash + (hasShippableItem ? shippingFee : 0);

  const orderName =
    cashItems.length === 0
      ? "주문"
      : cashItems.length === 1
        ? productDetails[cashItems[0].productId]?.name || "상품"
        : `${productDetails[cashItems[0].productId]?.name || "상품"} 외 ${cashItems.length - 1}건`;

  const handlePayment = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (cashItems.length === 0) {
      alert("결제할 현금 상품이 없습니다.");
      return;
    }

    setPaying(true);
    try {
      const config = await getPaymentConfig();
      const parsedShippingFee = Number(config?.shippingFee);
      const effectiveShippingFee = Number.isFinite(parsedShippingFee)
        ? parsedShippingFee
        : shippingFee;
      if (effectiveShippingFee !== shippingFee) {
        setShippingFee(effectiveShippingFee);
      }
      const effectiveTotalAmount =
        totalCash + (hasShippableItem ? effectiveShippingFee : 0);
      if (!config?.clientKey) {
        throw new Error("결제 설정을 불러올 수 없습니다.");
      }

      const orderItems = cashItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity || 1,
      }));
      const payloadShipping = {
        recipientName: shippingInfo.recipientName.trim(),
        recipientPhone: shippingInfo.recipientPhone.trim(),
        zipCode: shippingInfo.zipCode.trim(),
        address: shippingInfo.address.trim(),
        detailAddress: shippingInfo.detailAddress.trim(),
        countryCode: shippingInfo.countryCode.trim().toUpperCase(),
      };

      if (hasShippableItem) {
        if (
          !payloadShipping.recipientName ||
          !payloadShipping.recipientPhone ||
          !payloadShipping.zipCode ||
          !payloadShipping.address ||
          !payloadShipping.detailAddress
        ) {
          alert("배송지 정보를 모두 입력해 주세요.");
          setPaying(false);
          return;
        }
        if (!/^[A-Z]{2}$/.test(payloadShipping.countryCode)) {
          alert("국가 코드는 ISO 2자리 형식(KR, US 등)으로 입력해 주세요.");
          setPaying(false);
          return;
        }
      }

      const { orderNo } = await createOrder({
        name: orderName,
        totalAmount: effectiveTotalAmount,
        totalCandyAmount: 0,
        orderItems,
        recipientName: hasShippableItem ? payloadShipping.recipientName : null,
        recipientPhone: hasShippableItem ? payloadShipping.recipientPhone : null,
        zipCode: hasShippableItem ? payloadShipping.zipCode : null,
        address: hasShippableItem ? payloadShipping.address : null,
        detailAddress: hasShippableItem ? payloadShipping.detailAddress : null,
        countryCode: hasShippableItem ? payloadShipping.countryCode : null,
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "checkoutPendingIds",
          JSON.stringify(cashItems.map((i) => i.productId))
        );
      }

      const tossPayments = await loadTossPayments(config.clientKey);
      await tossPayments.requestPayment("카드", {
        amount: effectiveTotalAmount,
        orderId: orderNo,
        orderName,
        customerName: "구매자",
        successUrl: config.successUrl,
        failUrl: config.failUrl,
      });
    } catch (err) {
      console.error("Payment failed:", err);
      alert("결제 요청 실패: " + (err.message || "알 수 없는 오류"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-12">
      <header className="flex items-center gap-4">
        <Link
          href={returnPath}
          className="size-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/[0.04]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">
            {isCandyRecharge ? "캔디 충전" : "굿즈 결제"}
          </SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            {isCandyRecharge
              ? "결제 후 캔디가 즉시 충전됩니다."
              : "현금 결제를 통해 상품 주문을 완료합니다."}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <Surface variant="primary" className="p-8 space-y-6">
            <h3 className="font-black text-lg text-white">주문 상품</h3>
            {loading ? (
              <p className="text-white/55">로딩 중...</p>
            ) : (
              <div className="space-y-4">
                {cashItems.map((item) => {
                  const p = productDetails[item.productId];
                  const imgUrl = getProductImageUrl(p);
                  return (
                    <div key={item.productId} className="flex gap-4 p-4 bg-[#201a33] rounded-2xl">
                      <div className="size-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/30">image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{p?.name}</h4>
                        <p className="text-xs text-white/55">{p?.artistName}</p>
                        <p className="text-sm text-violet-300 font-bold mt-1">
                          {formatPrice(p)} × {item.quantity || 1}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {cashItems.length === 0 && !loading && (
                  <p className="text-white/55">결제할 현금 상품이 없습니다.</p>
                )}
              </div>
            )}
          </Surface>

          {hasShippableItem && (
            <Surface variant="primary" className="p-8 space-y-6">
              <h3 className="font-black text-lg text-white">배송지 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="수령인"
                  className="px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                  value={shippingInfo.recipientName}
                  onChange={(e) =>
                    setShippingInfo((prev) => ({
                      ...prev,
                      recipientName: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="연락처"
                  className="px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                  value={shippingInfo.recipientPhone}
                  onChange={(e) =>
                    setShippingInfo((prev) => ({
                      ...prev,
                      recipientPhone: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="우편번호"
                  className="px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                  value={shippingInfo.zipCode}
                  onChange={(e) =>
                    setShippingInfo((prev) => ({
                      ...prev,
                      zipCode: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="국가코드 (예: KR, US)"
                  className="px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20 uppercase"
                  value={shippingInfo.countryCode}
                  onChange={(e) =>
                    setShippingInfo((prev) => ({
                      ...prev,
                      countryCode: e.target.value.toUpperCase(),
                    }))
                  }
                  maxLength={2}
                />
                <input
                  placeholder="주소"
                  className="col-span-full px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                  value={shippingInfo.address}
                  onChange={(e) =>
                    setShippingInfo((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="상세주소"
                  className="col-span-full px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                  value={shippingInfo.detailAddress}
                  onChange={(e) =>
                    setShippingInfo((prev) => ({
                      ...prev,
                      detailAddress: e.target.value,
                    }))
                  }
                />
              </div>
            </Surface>
          )}
        </div>

        <div className="lg:col-span-4">
          <Surface variant="primary" className="p-8 sticky top-24">
            <h3 className="font-black text-lg text-white mb-6">최종 결제 금액</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-white/55">
                <span>총 상품 금액</span>
                <span>{totalCash.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm text-white/55">
                <span>배송비</span>
                <span>{hasShippableItem ? `${shippingFee.toLocaleString()}원` : "0원"}</span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between font-black text-2xl text-violet-300">
                <span>합계</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
            <Button
              variant="primary"
              className="w-full py-5 text-base uppercase tracking-widest"
              onClick={handlePayment}
              disabled={cashItems.length === 0 || loading || paying}
            >
              {paying ? "결제 처리 중..." : "결제하기"}
            </Button>
            <p className="text-[10px] text-center text-white/45 mt-4 leading-relaxed font-medium italic">
              결제 완료 시 주문이 확정됩니다.
              <br />
              캔디 전용 상품은 별도 구독 플로우를 이용해 주세요.
            </p>
          </Surface>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/55">로딩 중...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
