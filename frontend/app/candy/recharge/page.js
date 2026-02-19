"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { getCandyRechargeProducts } from "@/lib/productApi";
import { getPaymentConfig } from "@/lib/paymentApi";
import { createOrder } from "@/lib/orderApi";
import { getProfile } from "@/lib/userApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const CARD_PADDING = "p-6";
const CARD_MIN_HEIGHT = "min-h-[180px]";

/** 충전되는 캔디 수 = 상품 가격 / 100 */
function candyAmount(price) {
  return price ? Math.floor(Number(price) / 100) : 0;
}

function formatPrice(price) {
  return price != null ? `${Number(price).toLocaleString()}원` : "0원";
}

export default function CandyRechargePage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getCandyRechargeProducts()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
        if (arr.length > 0 && !selectedId) {
          setSelectedId(arr[0].id);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedId);
  const selectedCandyAmount = selectedProduct ? candyAmount(selectedProduct.price) : 0;

  const handleRechargeClick = async () => {
    if (!selectedProduct) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("checkoutReturnPath", "/candy/recharge");
    }

    if (selectedProduct.isSubscription) {
      setPaying(true);
      try {
        const config = await getPaymentConfig();
        if (!config?.clientKey) {
          throw new Error("결제 설정을 불러올 수 없습니다.");
        }

        const { orderNo } = await createOrder({
          name: selectedProduct.name,
          totalAmount: selectedProduct.price,
          totalCandyAmount: 0,
          orderItems: [{ productId: selectedProduct.id, quantity: 1 }],
        });

        const profile = await getProfile();
        const customerKey = profile?.id ? `customer_${profile.id}` : `customer_${Date.now()}`;

        const successUrl = `${config.successUrl}${config.successUrl.includes("?") ? "&" : "?"}orderNo=${orderNo}&productId=${selectedProduct.id}`;

        const tossPayments = await loadTossPayments(config.clientKey);
        await tossPayments.requestBillingAuth("카드", {
          customerKey,
          successUrl,
          failUrl: config.failUrl,
        });
      } catch (err) {
        console.error("결제 요청 실패:", err);
        alert(err?.message || "결제 요청에 실패했습니다.");
      } finally {
        setPaying(false);
      }
    } else {
      router.push(`/checkout?productId=${selectedProduct.id}&quantity=1&candyRecharge=1`);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center gap-4">
        <Link
          href="/mypage"
          className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/5"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">캔디 충전</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            멤버십 구독 및 유료 서비스 이용에 사용됩니다.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-white/55">상품 목록을 불러오는 중...</p>
      ) : products.length === 0 ? (
        <Surface variant="primary" className="py-16 text-center">
          <p className="text-white/55">캔디 충전 상품이 없습니다.</p>
        </Surface>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {products.map((p) => {
              const isSelected = selectedId === p.id;
              const amount = candyAmount(p.price);
              const isSubscription = p.isSubscription === true;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={[
                    "rounded-2xl border-2 transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-center text-center",
                    CARD_PADDING,
                    CARD_MIN_HEIGHT,
                    isSelected
                      ? "border-violet-500 bg-violet-500/15 shadow-[0_0_14px_rgba(150,100,255,0.2)] ring-2 ring-violet-500/30 ring-inset"
                      : "border-white/[0.06] bg-[#201a33] hover:border-white/[0.1] hover:bg-white/[0.03] hover:shadow-[0_0_10px_rgba(150,100,255,0.1)]",
                  ].join(" ")}
                >
                  <div
                    className={
                      isSelected
                        ? "size-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white mb-5"
                        : "size-12 rounded-2xl bg-white/[0.06] flex items-center justify-center text-white/55 mb-5"
                    }
                  >
                    <span className="material-symbols-outlined text-2xl">token</span>
                  </div>

                  <p
                    className="text-2xl font-black text-white leading-tight tabular-nums mb-1"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {amount.toLocaleString()} 캔디
                  </p>

                  <p
                    className="text-sm font-bold text-white/70 tabular-nums leading-tight mb-1"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatPrice(p.price)}
                  </p>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSubscription ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {isSubscription ? "정기결제" : "단건결제"}
                  </span>
                </button>
              );
            })}
          </div>

          <Surface variant="primary" className="p-10">
            <h3 className="font-black text-lg text-white mb-8">결제 정보 확인</h3>
            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-baseline gap-4">
                <span className="text-white/55 font-bold">충전 상품</span>
                <span className="text-white font-black tabular-nums shrink-0">
                  {selectedCandyAmount.toLocaleString()} 캔디
                  {selectedProduct?.isSubscription && (
                    <span className="text-amber-300/90 text-sm font-bold ml-2">(정기결제)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-baseline gap-4">
                <span className="text-white/55 font-bold">결제 금액</span>
                <span className="text-violet-300 font-black text-xl tabular-nums shrink-0">
                  {selectedProduct ? formatPrice(selectedProduct.price) : "0원"}
                </span>
              </div>
              <div className="h-px bg-white/[0.06] mt-4" />
              <p className="text-[10px] text-white/45 leading-relaxed py-2">
                * 캔디 충전 시 부가세가 포함된 금액이 결제됩니다.
                <br />* 충전된 캔디는 현금으로 직접 환불되지 않으며, 서비스 내에서만 사용 가능합니다.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full py-5 text-base uppercase tracking-widest"
              onClick={handleRechargeClick}
              disabled={paying}
            >
              {paying ? "처리 중..." : "결제 및 충전하기"}
            </Button>
          </Surface>
        </>
      )}
    </div>
  );
}
