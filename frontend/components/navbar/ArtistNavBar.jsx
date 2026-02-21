"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import { getDefaultAvatarUrl } from "@/lib/avatar";

const BASE_URL = "http://localhost:8080";
function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function getRoleFromToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  if (!pure) return null;
  try {
    const base64Url = pure.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

/** Artist 영역 NavBar. 아티스트 메인 홈은 /home. */
export default function ArtistNavBar({ showSidebarToggle, sidebarOpen, onSidebarToggle }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [isGroupRole, setIsGroupRole] = useState(false);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    setIsGroupRole(getRoleFromToken() === "ROLE_GROUP");
    axios
      .get(`${BASE_URL}/api/user/profile`, { headers })
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, [pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 h-16 bg-[#0b0814]/95 backdrop-blur-md border-b border-white/[0.06] z-50 flex items-center justify-between ${showSidebarToggle ? "pl-2 pr-6 lg:pr-12" : "px-6 lg:px-12"}`}>
      {showSidebarToggle ? (
        <button
          type="button"
          onClick={onSidebarToggle}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0 mr-2"
          aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}>
          <span className="material-symbols-outlined text-xl">
            {sidebarOpen ? "chevron_left" : "menu"}
          </span>
        </button>
      ) : null}
      <Link
        href="/home"
        className="flex items-center gap-3 text-violet-300 cursor-pointer shrink-0 hover:opacity-90">
        <span className="material-symbols-outlined text-3xl font-black fill-icon">
          rocket_launch
        </span>
        <h2 className="text-xl font-black tracking-tighter text-white">
          FanLink
        </h2>
        <span
          className={`ml-2 inline-flex items-center justify-center leading-none px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest text-white ${
            isGroupRole ? "bg-[#c4b5fd]/90 text-[#2a1b45]" : "bg-violet-500/80"
          }`}
        >
          {isGroupRole ? "GROUP" : "ARTIST"}
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-10 ml-12 mr-auto">
        <Link
          href="/home"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname === "/home"
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          홈
        </Link>
      </nav>

      <div className="flex items-center gap-6 shrink-0">
        <Link
          href="/dm/artist"
          className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors"
          aria-label="DM">
          <span className="material-symbols-outlined">send</span>
        </Link>

        <Link
          href="/notifications"
          className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors relative"
          aria-label="알림">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-violet-400 rounded-full border-2 border-[#0b0814]" />
        </Link>

        <Link
          href="/mypage"
          className="flex items-center gap-3 pl-2 cursor-pointer group"
          aria-label="마이페이지">
          <img
            src={profile?.profileImageUrl || getDefaultAvatarUrl(profile?.nickname)}
            alt="프로필"
            className="size-9 rounded-full border border-white/20 group-hover:border-violet-400/50 transition-colors object-cover"
          />
        </Link>
      </div>
    </header>
  );
}
