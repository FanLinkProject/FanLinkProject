"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getProfile } from "@/lib/userApi";

/**
 * OAuth 로그인 후 백엔드가 ?accessToken=...&refreshToken=... 로 리다이렉트할 때
 * URL에서 토큰을 읽어 localStorage에 저장한 뒤,
 * 프로필 조회하여 needsProfileComplete 이면 추가정보 입력 페이지로, 아니면 홈으로 이동
 */
export default function AuthCallbackHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError === "oauth2_failed") {
      router.replace("/login?error=oauth2_failed");
      return;
    }

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

      getProfile()
        .then((profile) => {
          if (profile.needsProfileComplete) {
            router.replace("/signup/oauth-complete");
          } else {
            router.replace("/home");
          }
        })
        .catch(() => {
          router.replace("/home");
        });
    }
  }, [router, pathname]);

  return null;
}
