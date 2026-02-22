"use client";

import { BASE_URL } from "@/lib/api";
import { login as loginApi } from "@/lib/authApi";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
      gradient: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
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
      className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity border ${config.border}`}>
      {config.label}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // OAuth 실패 등 쿼리로 전달된 에러 메시지 표시 후 URL 정리
  useEffect(() => {
    if (typeof window === "undefined") return;
    const err = searchParams.get("error");
    if (err === "oauth2_failed") {
      setError("소셜 로그인이 실패했습니다. 다시 시도해 주세요.");
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }
    setError("");
    try {
      const data = await loginApi(email, password);
      const token = data.accessToken?.startsWith("Bearer")
        ? data.accessToken
        : `Bearer ${data.accessToken || ""}`;
      localStorage.setItem("accessToken", token);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      localStorage.setItem("userEmail", email);
      let role = "FAN";
      if (email.startsWith("artist")) role = "ARTIST";
      if (email.startsWith("group")) role = "GROUP";
      if (email.startsWith("admin")) role = "ADMIN";
      if (role === "ARTIST") router.push("/home");
      else if (role === "GROUP") router.push("/home");
      else if (role === "ADMIN") router.push("/admin");
      else router.push("/home");
    } catch (err) {
      const msg =
        err?.data?.message ||
        (err?.status === 401
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인이 실패했습니다. 다시 시도해 주세요.");
      setError(msg);
    }
  };

  const handleOAuth = (provider) => {
    const registrationId = provider;
    window.location.href = `${BASE_URL}/oauth2/authorization/${registrationId}`;
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[#0b0814]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/home" className="inline-flex items-center gap-3 text-violet-300 mb-4">
            <span className="material-symbols-outlined text-4xl font-black fill-icon">rocket_launch</span>
            <h1 className="text-3xl font-black tracking-tighter text-white">FanLink</h1>
          </Link>
          <p className="text-white/55 font-medium italic">아티스트와 팬을 잇는 가장 가까운 공간</p>
        </div>

        <div className="bg-[#201a33] rounded-[2.5rem] p-10 border border-white/[0.08]">
          <h2 className="text-xl font-bold text-white mb-8 text-center">로그인</h2>

          {/* 이메일 로그인 (위쪽) */}
          <form onSubmit={handleLogin} className="space-y-6 mb-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="artist@.. / group@.. / admin@.. / fan@.."
                className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
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
            <span className="relative px-4 bg-[#201a33] text-[10px] font-black text-white/50 uppercase tracking-widest">OR</span>
          </div>

          {/* 소셜 로그인 (아래쪽): 구글, 카카오, 네이버, 인스타 순 */}
          <div className="space-y-4">
            <SocialLoginButton provider="google" onClick={() => handleOAuth("google")} />
            <SocialLoginButton provider="kakao" onClick={() => handleOAuth("kakao")} />
            <SocialLoginButton provider="naver" onClick={() => handleOAuth("naver")} />
            <SocialLoginButton provider="instagram" onClick={() => handleOAuth("instagram")} />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-bold text-white/55">
              계정이 없으신가요? <Link href="/signup" className="text-violet-300 hover:underline">회원가입</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
