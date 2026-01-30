'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SubscriptionFailPage() {
    const searchParams = useSearchParams();
    const [errorCode, setErrorCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        setErrorCode(searchParams.get('code') || 'UNKNOWN_ERROR');
        setErrorMessage(searchParams.get('message') || '알 수 없는 오류가 발생했습니다.');
    }, [searchParams]);

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ color: 'red' }}>❌ 구독 실패</h1>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff0f0', borderRadius: '8px' }}>
                <h2>오류 정보</h2>
                <p><strong>오류 코드:</strong> {errorCode}</p>
                <p><strong>오류 메시지:</strong> {errorMessage}</p>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'left' }}>
                <h3>💡 해결 방법</h3>
                <ul>
                    <li>카드 정보를 다시 확인해주세요.</li>
                    <li>테스트 환경에서는 본인인증 시 000000을 입력하세요.</li>
                    <li>카드 한도를 확인해주세요.</li>
                    <li>문제가 계속되면 고객센터로 문의해주세요.</li>
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
                다시 시도하기
            </button>
        </div>
    );
}
