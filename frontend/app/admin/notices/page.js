"use client";

import Link from "next/link";
import { MOCK_NOTICES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function AdminNoticesPage() {
  const notices = MOCK_NOTICES;
  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">공지 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">플랫폼 전체 공지사항을 작성하고 관리합니다.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" className="text-xs uppercase tracking-widest">
            공지 작성
          </Button>
          <Button variant="ghost" href="/admin" className="text-xs uppercase tracking-widest">
            대시보드
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        {notices.map((notice) => (
          <Surface
            key={notice.id}
            variant="primary"
            className="p-8 flex items-center justify-between hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
          >
            <div>
              <h3 className="text-lg font-bold text-white">{notice.title}</h3>
              <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mt-1">{notice.date}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="px-4 py-2 text-[10px] uppercase tracking-widest">
                수정
              </Button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
              >
                삭제
              </button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
