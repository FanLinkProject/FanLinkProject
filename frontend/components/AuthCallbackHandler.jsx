"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { exchangeOAuthCode } from "@/lib/authApi";
import { getProfile } from "@/lib/userApi";

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

    const routeAfterProfile = async () => {
      try {
        const profile = await getProfile();
        if (profile?.needsProfileComplete) {
          router.replace("/signup/oauth-complete");
          return;
        }
      } catch (_) {
        // If profile fetch fails, force login to avoid hidden broken session states.
        router.replace("/login?error=oauth2_failed");
        return;
      }
      router.replace("/home");
    };

    const persistTokens = (accessToken, refreshToken) => {
      const token = accessToken?.startsWith("Bearer")
        ? accessToken
        : `Bearer ${accessToken || ""}`;
      if (token.trim()) {
        localStorage.setItem("accessToken", token);
      }
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
    };

    const clearAuthParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("accessToken");
      url.searchParams.delete("refreshToken");
      url.searchParams.delete("tokenType");
      window.history.replaceState({}, "", url.pathname || "/");
    };

    const code = params.get("code");
    if (code) {
      clearAuthParams();
      exchangeOAuthCode(code)
        .then((tokenResponse) => {
          persistTokens(tokenResponse?.accessToken, tokenResponse?.refreshToken);
          return routeAfterProfile();
        })
        .catch(() => {
          router.replace("/login?error=oauth2_failed");
        });
      return;
    }

    // Legacy fallback for old redirect format (?accessToken=...&refreshToken=...)
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (accessToken) {
      clearAuthParams();
      persistTokens(accessToken, refreshToken);
      routeAfterProfile();
    }
  }, [router, pathname]);

  return null;
}
