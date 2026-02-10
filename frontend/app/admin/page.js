"use client";

import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

function KPIBox({ label, value, icon, color }) {
  return (
    <Surface variant="primary" className="p-6 flex flex-col justify-between h-36">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-white/55 uppercase tracking-widest">{label}</span>
        <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
    </Surface>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header>
        <SectionTitle className="text-2xl font-bold">System Administrator</SectionTitle>
        <p className="text-sm text-white/55 font-medium mt-1">플랫폼 전체 운영 현황과 지표를 관리합니다.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox label="전체 회원수" value="45,820명" icon="group" color="text-white/80" />
        <KPIBox label="활성 아티스트" value="342명" icon="brush" color="text-violet-300" />
        <KPIBox label="미처리 신고" value="15건" icon="report" color="text-red-400/90" />
        <KPIBox label="정산 대기" value="8건" icon="payments" color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-8 space-y-8">
          <Surface variant="primary" className="overflow-hidden">
            <h3 className="text-lg font-black text-white mb-6 px-8 pt-8">최근 정산 요청</h3>
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 px-8 border-t border-white/[0.06] first:border-t-0 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={`https://picsum.photos/seed/artist${i}/100/100`}
                      className="size-10 rounded-xl border border-white/[0.08]"
                      alt=""
                    />
                    <div>
                      <p className="font-bold text-white">아티스트_{i}</p>
                      <p className="text-[10px] text-white/55 font-black uppercase">요청일: 2025.02.21</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white tabular-nums">1,200,000원</p>
                    <Link
                      href="/admin/settlements"
                      className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                    >
                      승인 대기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        </section>

        <aside className="lg:col-span-4 space-y-8">
          <Surface variant="primary" className="p-8">
            <h3 className="text-lg font-black text-white mb-6">운영 공지</h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-bold text-white/80 hover:text-violet-300 cursor-pointer transition-colors line-clamp-1">
                    시스템 정기 점검 안내 (2025년 3월)
                  </p>
                  <p className="text-[10px] text-white/55 font-medium">2025.02.20</p>
                </div>
              ))}
            </div>
            <Button href="/admin/notices" variant="primary" className="w-full mt-6 py-3 text-[10px] uppercase tracking-widest">
              공지 관리
            </Button>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
