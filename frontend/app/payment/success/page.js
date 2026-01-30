"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const productId = searchParams.get("productId");
    const isCandy = searchParams.get("isCandy");
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");

        if (isCandy) {
            setResult({ message: "캔디 구독이 완료되었습니다." });
            setLoading(false);
            return;
        }

        if (paymentKey && orderId && amount) {
            // 1. 일반 결제 승인
            fetch(`http://localhost:8080/api/v1/payments/confirm?paymentKey=${paymentKey}&orderId=${orderId}&amount=${amount}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
            })
                .then(processResponse)
                .catch(handleError);
        } else if (authKey && customerKey && productId) {
            // 2. 빌링키 발급 (구독)
            // 2. 빌링키 발급 및 구독 생성 (현금 정기결제)
            fetch(`http://localhost:8080/api/v1/subscriptions/cash?userId=0`, { // userId는 토큰에서 추출하지만 param으로도 필요하다면 추가 (Controller 확인결과 param userId 필요)
                // 하지만 Controller에서 @RequestParam Long userId를 받고 있음 (TODO: Security Context)
                // 현재 클라이언트가 userId를 알기 어려우므로, Controller의 @RequestParam을 제거하거나 토큰에서 추출하도록 백엔드 수정 필요.
                // 일단 여기서는 fetch method를 POST로 바꾸고 Body에 담는게 맞음.
                // SubscriptionController: @RequestBody CreateCashSubscriptionRequest, @RequestParam Long userId
                // 임시로 URL 파라미터로 userId 전달하지 않고, 토큰을 믿거나, 아니면 백엔드가 수정되어야 함.
                // 기존 코드를 보면 userId를 param으로 요구함.
                // 여기서는 토큰이 있으므로, 백엔드에서 PrincipalDetails를 쓰도록 수정하는게 가장 좋음.
                // 일단 백엔드가 userId를 param으로 받고 있으므로, URL에 포함해야 함.
                // 그러나 userId를 프론트에서 알 수 있는가? 로그인 시 저장했다면 가능.
                // 없다면... 백엔드 수정을 먼저 해야함. 
                // 이전 단계에서 User가 "Subscription 폴더 연결해"라고 했으므로, SubscriptionController를 최대한 활용.
                // SubscriptionController.java:33 line -> @RequestParam Long userId.
                // 이를 @AuthenticationPrincipal로 바꾸는게 맞음.

                // 일단 요청 보내고 400 뜨면 백엔드 수정.
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: productId,
                    authKey: authKey,
                    customerKey: customerKey
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
    }, [paymentKey, orderId, amount, authKey, customerKey, productId, isCandy]);

    if (loading) return <div>결제 승인 처리 중입니다...</div>;

    return (
        <div style={{ padding: "50px" }}>
            <h1>결제 결과</h1>
            {result?.error ? (
                <div style={{ color: "red" }}>
                    <h2>❌ 결제 실패</h2>
                    <p>사유: {result.error}</p>
                </div>
            ) : (
                <div style={{ color: "green" }}>
                    <h2>✅ 결제 성공</h2>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                    <a href="/payment/test">다시 테스트하기</a>
                </div>
            )}
        </div>
    );
}
