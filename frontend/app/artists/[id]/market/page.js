"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MOCK_ARTISTS, MOCK_PRODUCTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

function ProductCard({ product, artist }) {
  return (
    <Surface variant="card" className="p-5 flex flex-col h-full">
        <div className="aspect-square rounded-xl overflow-hidden mb-4 relative">
          <img
            src={product.image}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            alt={product.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <img src={artist?.avatar} className="size-5 rounded-full border border-white/[0.08]" alt="" />
            <span className="text-[10px] font-black text-white/55 uppercase tracking-widest truncate">
              {product.artistName}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{product.name}</h3>
          <p className="text-xl font-black text-violet-300 tabular-nums mt-auto">{product.price}</p>
        </div>
        <Button variant="primary" className="w-full mt-4 py-3 text-[11px] uppercase tracking-widest" href={`/market/products/${product.id}`}>
          상세보기
        </Button>
    </Surface>
  );
}

export default function ArtistMarketPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;

  const [artist, setArtist] = useState(null);

  useEffect(() => {
    const a = MOCK_ARTISTS.find((x) => x.id === id);
    setArtist(a || MOCK_ARTISTS[0]);
  }, [id]);

  if (!artist) return null;

  const artistProducts = MOCK_PRODUCTS.filter((p) => p.artistId === artist.id);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <Link
          href={`/artists/${artist.id}`}
          className="flex items-center justify-center size-10 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/55 hover:text-violet-300 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">
            {artist.name} Official Store
          </SectionTitle>
          <p className="text-xs text-white/55 font-bold uppercase tracking-widest mt-1">
            Total {artistProducts.length} Items
          </p>
        </div>
      </div>

      <header className="relative h-48 rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <img src={artist.cover} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0814]/90 via-[#0b0814]/40 to-transparent" />
        <div className="absolute inset-0 flex items-center px-12 gap-8">
          <img
            src={artist.avatar}
            className="size-24 rounded-2xl border-2 border-white/[0.08] shadow-lg"
            alt=""
          />
          <div>
            <h2 className="text-3xl font-black text-white">{artist.name} 굿즈 스토어</h2>
            <p className="text-white/70 font-medium mt-1 italic">
              아티스트의 감성이 담긴 공식 굿즈를 확인하세요.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {artistProducts.map((product) => (
          <ProductCard key={product.id} product={product} artist={artist} />
        ))}
        {artistProducts.length === 0 && (
          <Surface variant="primary" className="col-span-full py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">inventory_2</span>
            <p className="text-white/55 font-medium italic">등록된 상품이 없습니다.</p>
          </Surface>
        )}
      </div>

      <footer className="pt-20 pb-10 border-t border-white/[0.06]">
        <Surface variant="secondary" className="p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-lg font-bold text-white mb-1">안전한 공식 스토어</h4>
            <p className="text-sm text-white/70 font-medium">
              FanLink는 아티스트와 팬을 잇는 안전한 정품 구매를 보장합니다.
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" className="text-xs">결제 안내</Button>
            <Button variant="ghost" className="text-xs">배송 및 교환</Button>
          </div>
        </Surface>
      </footer>
    </div>
  );
}
