"use client";

import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";

export default function PaymentTestPage() {
  const [clientKey, setClientKey] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    // 1. 백엔드에서 Client Key 가져오기
    fetch("http://localhost:8080/api/v1/payments/config")
      .then((res) => res.json())
      .then((data) => {
        setClientKey(data.clientKey);
        console.log("Client Configure Loaded:", data);
      })
      .catch((err) => console.error("Config Load Error:", err));

    // 2. 상품 목록 가져오기
    fetch("http://localhost:8080/api/v1/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        if (data.length > 0) setSelectedProduct(data[0]); // 첫 번째 상품 기본 선택
      })
      .catch((err) => console.error("Product Load Error:", err));
  }, []);

  const handlePayment = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
      window.location.href = "/login";
      return;
    }

    if (!clientKey) {
      alert("클라이언트 키를 불러오는 중입니다...");
      return;
    }

    if (!selectedProduct) {
      alert("결제할 상품을 선택해주세요.");
      return;
    }

    try {
      const tossPayments = await loadTossPayments(clientKey);

      // 1. 주문 생성 요청 (백엔드)
      const orderRes = await fetch("http://localhost:8080/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedProduct.name,
          totalAmount: selectedProduct.price,
          totalCandyAmount: 0,
          orderItems: [
            {
              productId: selectedProduct.id,
              quantity: 1
            }
          ]
        })
      });

      if (!orderRes.ok) {
        throw new Error("주문 생성 실패");
      }

      const orderData = await orderRes.json();
      const tossOrderId = orderData.orderNo;

      console.log(`Created Order: orderNo=${tossOrderId}, amount=${selectedProduct.price}`);

      console.log(`Created Order: orderNo=${tossOrderId}, amount=${selectedProduct.price}`);

      // 2. 결제 요청 (Toss)
      // 2. 결제 요청 (Toss)
      if (selectedProduct.isSubscription) {
        if (selectedProduct.paymentMethod === "CANDY_ONLY") {
          // 캔디 구독: 백엔드 즉시 호출
          const confirm = window.confirm(`${selectedProduct.candyPrice} 캔디를 사용하여 구독하시겠습니까?`);
          if (!confirm) return;

          const res = await fetch(`http://localhost:8080/api/v1/subscriptions/candy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              productId: selectedProduct.id
            })
          });

          const data = await res.json();
          if (res.ok) {
            alert("구독이 완료되었습니다!");
            window.location.href = "/payment/success?isCandy=true"; // 간단 성공 페이지 이동
          } else {
            throw new Error(data.message || "구독 실패");
          }
        } else {
          // 카드 구독: 빌링키 발급 요청 (카드 등록)
          await tossPayments.requestBillingAuth("카드", {
            customerKey: "test_customer_" + Date.now(), // 실제로는 유저 고유 ID 사용
            successUrl: window.location.origin + `/payment/success?productId=${selectedProduct.id}`,
            failUrl: window.location.origin + "/payment/fail",
          });
        }
      } else {
        // 일반 상품: 즉시 결제 승인 요청
        await tossPayments.requestPayment("카드", {
          amount: selectedProduct.price,
          orderId: tossOrderId,
          orderName: selectedProduct.name,
          customerName: "테스트 유저",
          successUrl: window.location.origin + "/payment/success",
          failUrl: window.location.origin + "/payment/fail",
        });
      }

    } catch (err) {
      console.error("Payment Request Failed:", err);
      alert("결제 요청 실패: " + err.message);
    }
  };

  return (
    <div style={{ padding: "50px" }}>
      <h1>💸 결제 테스트 화면</h1>
      <p>현재 설정된 Client Key: {clientKey ? clientKey : "로딩중..."}</p>

      <div style={{ marginTop: "30px" }}>
        <h3>🛍️ 상품 선택</h3>
        {products.length === 0 ? (
          <p>상품 목록을 불러오는 중이거나 상품이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", color: "black" }}>
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                style={{
                  border: selectedProduct?.id === product.id ? "2px solid #3182f6" : "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "20px",
                  cursor: "pointer",
                  width: "200px",
                  backgroundColor: selectedProduct?.id === product.id ? "#f0f7ff" : "white",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                }}
              >
                <h4>{product.name}</h4>
                <p style={{ fontSize: "14px", color: "#666" }}>{product.type}</p>
                <h3 style={{ marginTop: "10px" }}>
                  {product.paymentMethod === "CANDY_ONLY"
                    ? `${product.candyPrice.toLocaleString()} 캔디`
                    : `${product.price.toLocaleString()}원`}
                </h3>
                {product.isSubscription && <span style={{ color: "red", fontSize: "12px" }}>[구독 상품]</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "10px", color: "black" }}>
        <h3>💳 결제 예정 금액</h3>
        <h2>
          {selectedProduct
            ? (selectedProduct.paymentMethod === "CANDY_ONLY"
              ? `${selectedProduct.candyPrice.toLocaleString()} 캔디`
              : `${selectedProduct.price.toLocaleString()}원`)
            : "0원"}
        </h2>
      </div>

      <button
        onClick={handlePayment}
        disabled={!selectedProduct || !clientKey}
        style={{
          marginTop: "20px",
          padding: "15px 30px",
          backgroundColor: (!selectedProduct || !clientKey) ? "#ccc" : "#3182f6",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: (!selectedProduct || !clientKey) ? "not-allowed" : "pointer",
          fontSize: "18px",
          fontWeight: "bold"
        }}
      >
        {selectedProduct ? `${selectedProduct.name} 결제하기` : "상품을 선택해주세요"}
      </button>
    </div>
  );
}
