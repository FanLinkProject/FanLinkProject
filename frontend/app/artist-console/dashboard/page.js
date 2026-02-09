"use client";

import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";
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

function TodoItem({ label, count, href }) {
  return (
    <Link
      href={href}
      className="block w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
    >
      <span className="text-sm font-bold text-white/80">{label}</span>
      <span className="text-sm font-black text-violet-300 bg-violet-500/20 px-2.5 py-1 rounded-lg tabular-nums">
        {count}
      </span>
    </Link>
  );
}

export default function BusinessDashboardPage() {
  const artist = MOCK_ARTISTS[0];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">Business Studio</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">{artist.name} 그룹의 비즈니스 운영 현황입니다.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/[0.06] px-5 py-2.5 rounded-2xl border border-white/[0.06]">
          <img src={artist.avatar} className="size-8 rounded-lg border border-white/[0.08]" alt="" />
          <span className="text-sm font-bold text-white/80">{artist.name} (GROUP)</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox label="이번 달 총 매출" value="2,450,000원" icon="payments" color="text-violet-300" />
        <KPIBox label="정산 가능 금액" value="1,120,000원" icon="account_balance_wallet" color="text-emerald-400" />
        <KPIBox label="배송 대기 상품" value="5건" icon="local_shipping" color="text-white/70" />
        <KPIBox label="등록 상품 수" value="12개" icon="inventory_2" color="text-white/55" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-8 space-y-8">
          <Surface variant="primary" className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white">Members Management</h3>
              <Link href="/artist-console/members" className="text-xs font-bold text-violet-300 hover:underline">
                멤버 전체보기
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {artist.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
                >
                  <img src={member.avatar} className="size-12 rounded-xl border border-white/[0.08]" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{member.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-white/55 font-black uppercase">Active</span>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                href="/artist-console/members"
                className="flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-white/[0.08] text-white/45 hover:text-violet-300 hover:border-violet-500/30 transition-all"
              >
                <span className="material-symbols-outlined">person_add</span>
                <span className="text-xs font-black uppercase">멤버 추가</span>
              </Link>
            </div>
          </Surface>

          <Surface variant="primary" className="p-8">
            <h3 className="text-lg font-black text-white mb-6">오늘의 비즈니스 할 일</h3>
            <div className="space-y-4">
              <TodoItem label="새로운 주문 알림" count={5} href="/artist-console/orders" />
              <TodoItem label="배송 송장 입력 대기" count={2} href="/artist-console/orders" />
              <TodoItem label="미답변 상품 문의" count={3} href="/artist-console/market" />
            </div>
          </Surface>
        </section>

        <aside className="lg:col-span-4 space-y-8">
          <Surface variant="primary" className="p-8 border border-violet-500/20">
            <h3 className="text-xl font-black text-white mb-2">정산 신청하기</h3>
            <p className="text-white/60 text-sm mb-8">지난 달의 수익 정산이 준비되었습니다. 지금 신청하여 지급을 받으세요.</p>
            <Button href="/artist-console/settlement" variant="primary" className="w-full py-4 text-xs uppercase tracking-widest">
              정산 신청 바로가기
            </Button>
          </Surface>

          <Surface variant="secondary" className="p-8">
            <h3 className="text-lg font-black text-white mb-6">최근 정산 내역</h3>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white/80">2025.02.0{i} 정산</p>
                    <p className="text-[10px] text-white/55">지급 완료</p>
                  </div>
                  <span className="text-xs font-black text-white tabular-nums">1,225,000원</span>
                </div>
              ))}
            </div>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
