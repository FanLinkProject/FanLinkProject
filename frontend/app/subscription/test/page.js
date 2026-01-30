'use client';

import { useEffect, useState } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

export default function SubscriptionTestPage() {
    const [tossPayments, setTossPayments] = useState(null);
    const [payment, setPayment] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [products, setProducts] = useState([]);
    const [userId, setUserId] = useState('1'); // 테스트용 기본값
    const [isPaymentReady, setIsPaymentReady] = useState(false);
    const [initError, setInitError] = useState(null);

    useEffect(() => {
        async function initTossPayments() {
            try {
                const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
                console.log('Initializing Toss Payments...');
                console.log('Client Key:', clientKey);

                if (!clientKey) {
                    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 설정되지 않았습니다.');
                }

                const tossPaymentsInstance = await loadTossPayments(clientKey);
                console.log('Toss Payments loaded:', tossPaymentsInstance);

                const paymentInstance = tossPaymentsInstance.payment({ customerKey: `customer-${userId}` });
                console.log('Payment instance created:', paymentInstance);

                setTossPayments(tossPaymentsInstance);
                setPayment(paymentInstance);
                setIsPaymentReady(true);
                console.log('Toss Payments initialization complete!');
            } catch (error) {
                console.error('Toss Payments 초기화 실패:', error);
                setInitError(error.message);
            }
        }

        initTossPayments();
    }, [userId]);

    useEffect(() => {
        // 구독 상품 목록 조회
        async function fetchProducts() {
            try {
                const response = await fetch('http://localhost:8080/api/v1/products');
                const data = await response.json();
                // 구독 상품만 필터링
                const subscriptionProducts = data.filter(p => p.isSubscription);
                setProducts(subscriptionProducts);
            } catch (error) {
                console.error('상품 조회 실패:', error);
            }
        }

        fetchProducts();
    }, []);

    const handleCashSubscription = async () => {
        console.log('handleCashSubscription called');
        console.log('payment:', payment);
        console.log('selectedProduct:', selectedProduct);

        if (!selectedProduct) {
            alert('상품을 선택해주세요');
            return;
        }

        if (!payment) {
            alert('Toss Payments SDK가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        try {
            // Toss Payments 빌링키 발급 요청
            await payment.requestBillingAuth({
                method: 'CARD',
                successUrl: `${window.location.origin}/subscription/success?productId=${selectedProduct.id}&userId=${userId}`,
                failUrl: `${window.location.origin}/subscription/fail`,
                customerEmail: 'test@example.com',
                customerName: '홍길동',
            });
        } catch (error) {
            console.error('빌링키 발급 실패:', error);
            alert('빌링키 발급 중 오류가 발생했습니다.');
        }
    };

    const handleCandySubscription = async () => {
        if (!selectedProduct) {
            alert('상품을 선택해주세요');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/v1/subscriptions/candy?userId=' + userId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '구독 생성 실패');
            }

            const data = await response.json();
            alert('캔디 구독이 성공적으로 생성되었습니다!');
            console.log('구독 정보:', data);
        } catch (error) {
            console.error('캔디 구독 실패:', error);
            alert('캔디 구독 중 오류가 발생했습니다: ' + error.message);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'black' }}>
            <h1>구독 테스트 페이지</h1>

            {/* SDK 초기화 상태 표시 */}
            {initError && (
                <div style={{ padding: '20px', marginBottom: '20px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
                    <h3 style={{ color: 'red' }}>⚠️ 초기화 오류</h3>
                    <p>{initError}</p>
                    <p>환경 변수가 설정되어 있는지 확인하세요: NEXT_PUBLIC_TOSS_CLIENT_KEY</p>
                </div>
            )}

            {!isPaymentReady && !initError && (
                <div style={{ padding: '20px', marginBottom: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                    <p>⏳ Toss Payments SDK 초기화 중...</p>
                </div>
            )}

            {isPaymentReady && (
                <div style={{ padding: '20px', marginBottom: '20px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
                    <p>✅ Toss Payments SDK 초기화 완료</p>
                </div>
            )}

            <div style={{ marginBottom: '30px' }}>
                <label>
                    유저 ID:
                    <input
                        type="number"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        style={{ marginLeft: '10px', padding: '5px' }}
                    />
                </label>
            </div>

            <h2>구독 상품 목록</h2>
            {products.length === 0 ? (
                <p>구독 상품이 없습니다. test-data.sql을 먼저 실행해주세요.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {products.map((product) => (
                        <div
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            style={{
                                padding: '20px',
                                border: selectedProduct?.id === product.id ? '3px solid #4CAF50' : '1px solid #ddd',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: selectedProduct?.id === product.id ? '#f0f8f0' : 'white',
                                color: 'black',
                            }}
                        >
                            <h3>{product.name}</h3>
                            <p>상품 ID: {product.id}</p>
                            <p>타입: {product.type}</p>
                            <p>결제 방식: {product.paymentMethod}</p>
                            {product.price && <p>가격: {product.price.toLocaleString()}원</p>}
                            {product.candyPrice && <p>캔디 가격: {product.candyPrice.toLocaleString()} 캔디</p>}
                            {product.artistId && <p>아티스트 ID: {product.artistId} (정산 대상)</p>}
                        </div>
                    ))}
                </div>
            )}

            {selectedProduct && (
                <div style={{ marginTop: '30px' }}>
                    <h2>선택된 상품: {selectedProduct.name}</h2>

                    {selectedProduct.paymentMethod === 'CASH_ONLY' ? (
                        <div>
                            <p>현금 정기결제 상품입니다. 빌링키를 발급받아야 합니다.</p>
                            <button
                                onClick={handleCashSubscription}
                                style={{
                                    padding: '15px 30px',
                                    fontSize: '18px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                카드 등록하고 구독하기
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p>캔디 결제 구독 상품입니다. 매월 {selectedProduct.candyPrice} 캔디가 차감됩니다.</p>
                            <p style={{ color: 'red' }}>
                                ⚠️ 현재 유저의 캔디 잔액을 확인하세요. 부족하면 구독이 실패합니다.
                            </p>
                            <button
                                onClick={handleCandySubscription}
                                style={{
                                    padding: '15px 30px',
                                    fontSize: '18px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                캔디로 구독하기
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', color: 'black' }}>
                <h3>테스트 안내</h3>
                <ul>
                    <li>현금 구독: 카드 등록 후 자동으로 첫 결제가 진행됩니다.</li>
                    <li>캔디 구독: 유저의 캔디 잔액에서 즉시 차감됩니다.</li>
                    <li>테스트 환경에서는 본인인증 시 000000을 입력하세요.</li>
                    <li>테스트 키 사용 시 실제 결제는 이루어지지 않습니다.</li>
                </ul>
            </div>
        </div>
    );
}
