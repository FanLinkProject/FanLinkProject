"use client";

import { useState } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">회원 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">팬 및 아티스트 회원의 상태를 관리합니다.</p>
        </div>
        <div className="relative w-80">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/55">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="회원 이름 또는 이메일 검색..."
            className="w-full pl-12 pr-6 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-sm text-white placeholder:text-white/40"
          />
        </div>
      </header>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">회원 정보</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">구분</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">가입일</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <img src={`https://picsum.photos/seed/u${i}/100/100`} className="size-10 rounded-full border border-white/[0.08]" alt="" />
                    <div>
                      <p className="font-bold text-white">사용자_{i}</p>
                      <p className="text-[10px] text-white/55 font-medium">user{i}@example.com</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      i % 3 === 0 ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {i % 3 === 0 ? "ARTIST" : "FAN"}
                  </span>
                </td>
                <td className="px-8 py-6 text-sm text-white/70 font-medium">2025.01.12</td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    활성
                  </span>
                </td>
                <td className="px-8 py-6">
                  <button type="button" className="text-[10px] font-black text-red-400/90 uppercase tracking-widest hover:underline">
                    정지
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
