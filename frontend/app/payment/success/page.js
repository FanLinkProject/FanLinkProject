"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

function clearCartForPaidItems() {
  try {
    const raw = sessionStorage.getItem("checkoutPendingIds");
    if (!raw) return;
    const paidIds = new Set(JSON.parse(raw).map((id) => String(id)));
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const next = Array.isArray(cart) ? cart.filter((item) => !paidIds.has(String(item.productId))) : [];
    localStorage.setItem("cart", JSON.stringify(next));
    sessionStorage.removeItem("checkoutPendingIds");
  } catch (_) {}
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const productId = searchParams.get("productId");
  const isCandy = searchParams.get("isCandy");
  const authKey = searchParams.get("authKey");
  const customerKey = searchParams.get("customerKey");
  const orderNo = searchParams.get("orderNo");

  const status = searchParams.get("status");
  const message = searchParams.get("message");
  const code = searchParams.get("code");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (isCandy) {
      setResult({ orderNo: null });
      setLoading(false);
      return;
    }

    // 0. 백엔드 리다이렉트 (성공)
    if (status === "SUCCESS") {
      clearCartForPaidItems();
      setResult({
        orderNo: orderNo,
        orderId: orderId,
        amount: amount,
        status: "DONE",
      });
      setLoading(false);
      return;
    }

    // 0. 백엔드 리다이렉트 (실패)
    if (code || message) {
      setResult({ error: message || "결제 실패", code: code });
      setLoading(false);
      return;
    }

    if (paymentKey && orderId && amount) {
      // 1. 일반 결제 승인 (직접 호출 시 - 레거시 또는 테스트용)
      fetch(`http://localhost:8080/api/payments/confirm?paymentKey=${paymentKey}&orderId=${orderId}&amount=${amount}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      })
        .then(processResponse)
        .catch(handleError);
    } else if (authKey && customerKey && productId) {
      // 2. 빌링키 발급 및 구독 생성 (현금 정기결제) - 직접 호출 시
      fetch(`http://localhost:8080/api/subscriptions/cash?userId=0`, { // userId는 토큰에서 추출
        // 일단 요청 보내고 400 뜨면 백엔드 수정.
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: productId,
          authKey: authKey,
          customerKey: customerKey,
          orderNo: orderNo
        })
      })
        .then(processResponse)
        .catch(handleError);
    } else {
      setLoading(false);
    }

    function processResponse(res) {
      return res.json().then(data => {
        if (!res.ok) throw new Error(data.message || "Unknown Error");
        clearCartForPaidItems();
        setResult(data);
        setLoading(false);
        console.log("Success:", data);
      });
    }

    function handleError(err) {
      console.error("Failed:", err);
      setResult({ error: err.message });
      setLoading(false);
    }
  }, [paymentKey, orderId, amount, authKey, customerKey, productId, isCandy, status, message, code, orderNo]);

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-2xl mx-auto text-center">
        <p className="text-white/55">결제 승인 처리 중입니다...</p>
      </div>
    );
  }

  // 구독 결제(현금 정기결제) 또는 캔디 구독 후에는 항상 마켓으로 돌아가기
  const isFromSubscription = status === "SUCCESS" && isCandy === "false";
  const isFromCandySubscription = isCandy === "1" || isCandy === "true";
  const returnPath = (isFromSubscription || isFromCandySubscription) ? "/market" : (searchParams.get("returnPath") || "/market");

  if (result?.error) {
    return (
      <div className="p-8 lg:p-12 max-w-2xl mx-auto text-center space-y-8">
        <div className="py-16">
          <span className="material-symbols-outlined text-8xl text-red-400/80 mb-6 block">error</span>
          <h1 className="text-4xl font-black text-white mb-4">결제 실패</h1>
          <p className="text-white/70 font-medium mt-2">{result.error}</p>
          {result.code && <p className="text-white/50 text-sm mt-2">코드: {result.code}</p>}
        </div>
        <Link
          href={returnPath.startsWith("/") ? returnPath : "/market"}
          className="inline-flex items-center gap-2 py-5 px-10 bg-white/[0.08] border border-white/[0.12] text-white rounded-3xl font-black text-base hover:bg-white/[0.12] transition-all uppercase tracking-widest"
        >
          돌아가기
        </Link>
      </div>
    );
  }

  const displayOrderNo = result?.orderNo ?? orderNo;

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto text-center space-y-8">
      <div className="py-16">
        <span className="material-symbols-outlined text-8xl text-emerald-400/80 mb-6 block">check_circle</span>
        <h1 className="text-4xl font-black text-white mb-4">결제가 완료되었습니다.</h1>
        {displayOrderNo && <p className="text-white/70 font-medium mt-2">주문번호</p>}
        {displayOrderNo && <p className="text-white/90 font-mono text-sm mt-1 break-all">{displayOrderNo}</p>}
      </div>
      <Link
        href={returnPath.startsWith("/") ? returnPath : "/market"}
        className="inline-flex items-center gap-2 py-5 px-10 bg-white/[0.08] border border-white/[0.12] text-white rounded-3xl font-black text-base hover:bg-white/[0.12] transition-all uppercase tracking-widest"
      >
        돌아가기
      </Link>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/55">결제 정보를 불러오는 중...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
