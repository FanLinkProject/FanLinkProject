"use client";

import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function AdminNoticesPage() {
  const notices = [];
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
        {notices.length === 0 ? (
          <Surface variant="primary" className="p-8">
            <p className="text-sm text-white/55">등록된 공지가 없습니다.</p>
          </Surface>
        ) : null}
      </div>
    </div>
  );
}
