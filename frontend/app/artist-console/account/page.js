"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function ArtistAccountPage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/user/profile`, { headers })
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, []);

  const displayName = profile?.nickname ?? profile?.name ?? "아티스트";
  const avatarUrl = profile?.profileImageUrl || getDefaultAvatarUrl(displayName);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">계정 설정</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">스튜디오 및 결제 계정 정보를 관리하세요.</p>
        </div>
        <Button variant="ghost" href="/home" className="text-xs uppercase tracking-widest">
          뒤로
        </Button>
      </header>

      <Surface variant="primary" className="p-10 space-y-8">
        <div className="flex items-center gap-6">
          <img src={avatarUrl} className="size-20 rounded-2xl border-2 border-white/[0.08] object-cover" alt="" />
          <div>
            <h3 className="text-xl font-black text-white">{displayName}</h3>
            <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mt-1">Official Artist</p>
            <Button variant="ghost" className="mt-4 px-4 py-2 text-[10px] uppercase tracking-widest">
              프로필 이미지 변경
            </Button>
          </div>
        </div>
        <div className="h-px bg-white/[0.06]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">스튜디오 이름</label>
            <input
              type="text"
              defaultValue={displayName}
              className="w-full px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">연락 이메일</label>
            <input
              type="email"
              defaultValue={profile?.email ?? ""}
              className="w-full px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>
        <Button variant="primary" className="w-full py-4 text-sm">
          저장하기
        </Button>
      </Surface>
    </div>
  );
}
