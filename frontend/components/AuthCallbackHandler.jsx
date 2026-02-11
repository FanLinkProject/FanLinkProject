"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * OAuth 로그인 후 백엔드가 ?accessToken=...&refreshToken=... 로 리다이렉트할 때
 * URL에서 토큰을 읽어 localStorage에 저장하고 홈으로 이동
 */
export default function AuthCallbackHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (accessToken) {
      const token = accessToken.startsWith("Bearer")
        ? accessToken
        : `Bearer ${accessToken}`;
      localStorage.setItem("accessToken", token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("accessToken");
      url.searchParams.delete("refreshToken");
      url.searchParams.delete("tokenType");
      window.history.replaceState({}, "", url.pathname || "/");
      router.replace("/home");
    }
  }, [router, pathname]);

  return null;
}
