'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SubscriptionSuccessPage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        async function createSubscription() {
            const authKey = searchParams.get('authKey');
            const customerKey = searchParams.get('customerKey');
            const productId = searchParams.get('productId');
            const userId = searchParams.get('userId');

            if (!authKey || !customerKey || !productId || !userId) {
                setError('필수 파라미터가 누락되었습니다.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`http://localhost:8080/api/v1/subscriptions/cash?userId=${userId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: parseInt(productId),
                        authKey,
                        customerKey,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '구독 생성 실패');
                }

                const data = await response.json();
                setSubscription(data);
                setLoading(false);
            } catch (err) {
                console.error('구독 생성 실패:', err);
                setError(err.message);
                setLoading(false);
            }
        }

        createSubscription();
    }, [searchParams]);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h1>구독 처리중...</h1>
                <p>빌링키를 발급하고 첫 결제를 진행하고 있습니다.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h1 style={{ color: 'red' }}>구독 실패</h1>
                <p>{error}</p>
                <button
                    onClick={() => window.location.href = '/subscription/test'}
                    style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    다시 시도하기
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ color: 'green' }}>✅ 구독 성공!</h1>

            {subscription && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f8f0', borderRadius: '8px' }}>
                    <h2>구독 정보</h2>
                    <p><strong>구독 ID:</strong> {subscription.id}</p>
                    <p><strong>상품명:</strong> {subscription.productName}</p>
                    <p><strong>구독 타입:</strong> {subscription.subscriptionType}</p>
                    <p><strong>시작일:</strong> {new Date(subscription.startDate).toLocaleString()}</p>
                    <p><strong>다음 결제일:</strong> {new Date(subscription.nextPaymentDate).toLocaleString()}</p>
                    <p><strong>활성 상태:</strong> {subscription.isActive ? '활성' : '비활성'}</p>
                </div>
            )}

            <div style={{ marginTop: '30px' }}>
                <h3>💡 안내</h3>
                <ul>
                    <li>첫 결제가 완료되었습니다.</li>
                    <li>다음 결제일에 자동으로 결제됩니다.</li>
                    <li>구독은 언제든지 해지할 수 있습니다.</li>
                </ul>
            </div>

            <button
                onClick={() => window.location.href = '/subscription/test'}
                style={{
                    marginTop: '30px',
                    padding: '15px 30px',
                    fontSize: '18px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                }}
            >
                구독 테스트 페이지로 돌아가기
            </button>
        </div>
    );
}
