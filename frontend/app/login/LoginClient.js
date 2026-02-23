// app/login/LoginClient.js
"use client";

import { BASE_URL } from "@/lib/api";
import { login as loginApi } from "@/lib/authApi";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ForgotPasswordModal from "@/components/common/ForgotPasswordModal";

function SocialLoginButton({ provider, onClick }) {
  const configs = {
    google: {
      label: "Google로 계속하기",
      color: "#FFFFFF",
      textColor: "#000000",
      border: "border-white/20",
    },
    kakao: {
      label: "카카오로 계속하기",
      color: "#FEE500",
      textColor: "#000000",
      border: "border-transparent",
    },
    naver: {
      label: "네이버로 계속하기",
      color: "#03C75A",
      textColor: "#FFFFFF",
      border: "border-transparent",
    },
    instagram: {
      label: "Instagram으로 계속하기",
      color: "transparent",
      textColor: "#FFFFFF",
      border: "border-transparent",
      gradient:
        "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    },
  };

  const config = configs[provider];
  const isInstagram = provider === "instagram";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: isInstagram ? undefined : config.color,
        backgroundImage: isInstagram ? config.gradient : undefined,
        color: config.textColor,
      }}
      className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity border ${config.border}`}
    >
      {config.label}
    </button>
  );
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ 이제 Suspense로 감싸진 Client 컴포넌트 안에서 사용
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ✅ OAuth 실패 등 쿼리로 전달된 에러 메시지 표시 후 URL 정리
  //    (searchParams는 렌더마다 객체가 바뀔 수 있어 get 결과만 쓰는 편이 안전)
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "oauth2_failed") {
      setError("소셜 로그인이 실패했습니다. 다시 시도해 주세요.");
      // ✅ 에러 쿼리 제거: 로그인 페이지 URL을 깨끗하게 유지
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();

      // ✅ 클라이언트 검증
      if (!email || !password) {
        setError("이메일과 비밀번호를 모두 입력해주세요.");
        return;
      }

      setError("");

      try {
        // ✅ 서버 로그인 호출
        const data = await loginApi(email, password);

        // ✅ accessToken 형식 통일: "Bearer ..." 형태로 저장
        const token = data.accessToken?.startsWith("Bearer")
          ? data.accessToken
          : `Bearer ${data.accessToken || ""}`;

        localStorage.setItem("accessToken", token);

        // ✅ refreshToken이 있다면 함께 저장 (백엔드 정책에 따라 사용)
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }

        localStorage.setItem("userEmail", email);

        // ✅ 현재는 이메일 prefix로 role 추정 (임시 로직)
        //    가능하면 백엔드 응답 role을 신뢰하는 형태로 교체 권장.
        let role = "FAN";
        if (email.startsWith("artist")) role = "ARTIST";
        if (email.startsWith("group")) role = "GROUP";
        if (email.startsWith("admin")) role = "ADMIN";

        // ✅ role에 따라 이동
        if (role === "ADMIN") router.push("/admin");
        else router.push("/home");
      } catch (err) {
        // ✅ authApi 에러 형태에 맞춘 사용자 메시지 처리
        const msg =
          err?.data?.message ||
          (err?.status === 401
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : "로그인이 실패했습니다. 다시 시도해 주세요.");
        setError(msg);
      }
    },
    [email, password, router]
  );

  const handleOAuth = useCallback((provider) => {
    const registrationId = provider;

    // ✅ OAuth2 Authorization endpoint로 리다이렉트
    //    BASE_URL은 백엔드 도메인/프록시 환경에 맞게 설정되어 있어야 함.
    window.location.href = `${BASE_URL}/oauth2/authorization/${registrationId}`;
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[#0b0814]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/home" className="inline-flex items-center gap-3 text-violet-300 mb-4">
            <span className="material-symbols-outlined text-4xl font-black fill-icon">
              rocket_launch
            </span>
            <h1 className="text-3xl font-black tracking-tighter text-white">FanLink</h1>
          </Link>
          <p className="text-white/55 font-medium italic">아티스트와 팬을 잇는 가장 가까운 공간</p>
        </div>

        <div className="bg-[#201a33] rounded-[2.5rem] p-10 border border-white/[0.08]">
          <h2 className="text-xl font-bold text-white mb-8 text-center">로그인</h2>

          {/* ✅ 이메일 로그인 */}
          <form onSubmit={handleLogin} className="space-y-6 mb-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="artist@.. / group@.. / admin@.. / fan@.."
                className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
              />
            </div>

            {error && <p className="text-[11px] text-red-400 font-bold px-1">{error}</p>}

            <button
              type="submit"
              className="w-full py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all"
            >
              로그인하기
            </button>
          </form>

          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <span className="relative px-4 bg-[#201a33] text-[10px] font-black text-white/50 uppercase tracking-widest">
              OR
            </span>
          </div>

          {/* ✅ 소셜 로그인 */}
          <div className="space-y-4">
            <SocialLoginButton provider="google" onClick={() => handleOAuth("google")} />
            <SocialLoginButton provider="kakao" onClick={() => handleOAuth("kakao")} />
            <SocialLoginButton provider="naver" onClick={() => handleOAuth("naver")} />
            <SocialLoginButton provider="instagram" onClick={() => handleOAuth("instagram")} />
          </div>

          <div className="mt-8 text-center space-y-2">
            <p className="text-xs font-bold text-white/55">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-violet-300 hover:underline">
                회원가입
              </Link>
            </p>
            <p className="text-xs font-bold text-white/55">
              비밀번호를 잃어버리셨나요?{" "}
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-violet-300 hover:underline"
              >
                비밀번호 찾기
              </button>
            </p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
