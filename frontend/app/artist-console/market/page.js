"use client";

import Link from "next/link";
import { MOCK_PRODUCTS, MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function ArtistMarketMgmtPage() {
  const artist = MOCK_ARTISTS[0];
  const products = MOCK_PRODUCTS.filter((p) => p.artistId === artist.id);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">상품 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">공식 스토어 상품을 등록하고 주문을 처리하세요.</p>
        </div>
        <Button variant="primary" className="text-xs uppercase tracking-widest">
          상품 등록
        </Button>
      </header>

      <div className="space-y-4">
        {products.map((product) => (
          <Surface
            key={product.id}
            variant="primary"
            className="p-8 flex gap-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
          >
            <img src={product.image} className="size-24 rounded-2xl object-cover border border-white/[0.08]" alt="" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white truncate">{product.name}</h4>
              <p className="text-xl font-black text-violet-300 tabular-nums">{product.price}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-black uppercase">
                {product.status}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="ghost" className="px-4 py-2 text-[10px] uppercase tracking-widest">
                수정
              </Button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
              >
                숨김
              </button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
