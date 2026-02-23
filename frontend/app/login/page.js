// app/login/page.js
import { Suspense } from "react";
import LoginClient from "./LoginClient";

// ✅ App Router에서 useSearchParams()는 CSR 전용 값이라
//    빌드/SSR 시점에는 확정 불가 → Suspense boundary 필요.
//    따라서 page(서버 컴포넌트)에서 Suspense로 감싸고,
//    실제 searchParams 사용은 클라이언트 컴포넌트로 분리한다.
export default function LoginPage() {
    return (
        // ✅ fallback은 로딩 동안 보여줄 UI. 필요하면 스켈레톤/로더로 교체 가능.
        <Suspense fallback={<div />}>
            <LoginClient />
        </Suspense>
    );
}
