"use client";

import { BASE_URL } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

function SocialLoginButton({ provider, onClick }) {
  const configs = {
    kakao: {
      label: "카카오로 계속하기",
      color: "#FEE500",
      textColor: "#000000",
    },
    google: {
      label: "Google로 계속하기",
      color: "#FFFFFF",
      textColor: "#000000",
    },
  };
  const config = configs[provider];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: config.color, color: config.textColor }}
      className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity border ${provider === "google" ? "border-white/20" : "border-transparent"}`}>
      {config.label}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }
    setError("");
    try {
      const { data } = await axios.post(`${BASE_URL}/api/auth/login`, {
        email,
        password,
      });
      const token = data.accessToken?.startsWith("Bearer")
        ? data.accessToken
        : `Bearer ${data.accessToken}`;
      localStorage.setItem("accessToken", token);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      // 현재 로그인한 계정 이메일을 저장해 메인 홈 등에서 식별에 사용
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
        err.response?.data?.message ||
        err.response?.status === 401
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인에 실패했습니다. 다시 시도해주세요.";
      setError(msg);
    }
  };

  const handleOAuth = (provider) => {
    const registrationId = provider === "kakao" ? "kakao" : "google";
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

          <div className="space-y-4 mb-8">
            <SocialLoginButton provider="kakao" onClick={() => handleOAuth("kakao")} />
            <SocialLoginButton provider="google" onClick={() => handleOAuth("google")} />
          </div>

          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <span className="relative px-4 bg-[#201a33] text-[10px] font-black text-white/50 uppercase tracking-widest">OR</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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

          <div className="mt-8 text-center">
            <div className="p-4 bg-white/[0.04] border border-white/[0.06] rounded-2xl mb-4 text-[10px] text-white/55 font-medium">
              <p>데모 로그인 가이드:</p>
              <p>아티스트: artist@ / 그룹: group@ / 관리자: admin@ / 팬: fan@</p>
            </div>
            <p className="text-xs font-bold text-white/55">
              계정이 없으신가요? <Link href="/signup" className="text-violet-300 hover:underline">회원가입</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
