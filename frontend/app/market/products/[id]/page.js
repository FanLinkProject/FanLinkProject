"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MOCK_PRODUCTS, MOCK_ARTISTS } from "@/lib/mockData";

export default function ProductDetailPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;

  const [product, setProduct] = useState(null);
  const [artist, setArtist] = useState(null);

  useEffect(() => {
    const p = MOCK_PRODUCTS.find((x) => x.id === id);
    setProduct(p || MOCK_PRODUCTS[0]);
    if (p) {
      const a = MOCK_ARTISTS.find((x) => x.id === p.artistId);
      setArtist(a || MOCK_ARTISTS[0]);
    }
  }, [id]);

  if (!product || !artist) return null;

  const subscribedArtists = MOCK_ARTISTS.filter((a) => a.isSubscribed && a.id !== artist.id);
  const sameArtistProducts = MOCK_PRODUCTS.filter(
    (p) => p.artistId === artist.id && p.id !== product.id
  );
  const subscribedProducts = MOCK_PRODUCTS.filter((p) =>
    subscribedArtists.some((a) => a.id === p.artistId)
  );
  const otherProducts = MOCK_PRODUCTS.filter(
    (p) => p.artistId !== artist.id && !subscribedArtists.some((a) => a.id === p.artistId)
  );

  function ProductGrid({ products }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/market/products/${p.id}`}
            className="bg-[#201a33] rounded-[2.5rem] p-4 border border-white/[0.08] hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] transition-all group"
          >
            <div className="aspect-square rounded-3xl overflow-hidden mb-4 bg-white/5">
              <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
            </div>
            <div className="px-1">
              <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-1">{p.artistName}</p>
              <h4 className="text-sm font-bold text-white truncate mb-1">{p.name}</h4>
              <p className="text-base font-black text-violet-300">{p.price}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16">
      <Link
        href="/market"
        className="flex items-center gap-2 text-white/55 hover:text-violet-300 transition-colors font-bold text-xs uppercase tracking-widest"
      >
        <span className="material-symbols-outlined">arrow_back</span> 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 bg-[#201a33] rounded-[3.5rem] p-12 border border-white/[0.08]">
        <div className="aspect-square rounded-[3rem] overflow-hidden bg-white/5 border border-white/[0.06]">
          <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
        </div>
        <div className="flex flex-col">
          <Link href={`/artists/${artist.id}`} className="flex items-center gap-4 mb-8 cursor-pointer group w-fit">
            <img src={artist.avatar} className="size-12 rounded-2xl border border-white/[0.1]" alt="" />
            <div>
              <h4 className="text-base font-black text-white group-hover:text-violet-300 transition-colors">{artist.name}</h4>
              <p className="text-[10px] text-white/55 uppercase tracking-widest font-black">OFFICIAL MERCHANDISE</p>
            </div>
          </Link>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">{product.name}</h1>
          <p className="text-3xl font-black text-violet-300 mb-10">{product.price}</p>
          <div className="h-px bg-white/[0.06] mb-10" />
          <div className="flex-1">
            <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55 mb-5">상세 설명</h5>
            <p className="text-white/75 leading-relaxed text-lg font-medium">
              {product.description || "이 상품은 아티스트가 직접 참여하여 제작된 공식 굿즈입니다. 고품질 소재와 유니크한 디자인으로 소장 가치가 높습니다."}
            </p>
          </div>
          <div className="mt-12 flex gap-4">
            <Link
              href="/checkout"
              className="flex-1 py-5 bg-violet-500/90 text-white rounded-3xl font-black text-base hover:brightness-110 transition-all uppercase tracking-widest text-center"
            >
              지금 바로 구매하기
            </Link>
            <button
              type="button"
              className="size-16 rounded-3xl border border-white/[0.08] flex items-center justify-center text-white/55 hover:bg-white/[0.06] hover:text-violet-300 transition-all"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-20 pt-10">
        {sameArtistProducts.length > 0 && (
          <section>
            <h3 className="text-2xl font-black text-white mb-8 px-2">{artist.name}의 다른 굿즈</h3>
            <ProductGrid products={sameArtistProducts} />
          </section>
        )}
        {subscribedProducts.length > 0 && (
          <section>
            <h3 className="text-2xl font-black text-white mb-8 px-2">내가 구독 중인 아티스트의 굿즈</h3>
            <ProductGrid products={subscribedProducts} />
          </section>
        )}
        {otherProducts.length > 0 && (
          <section>
            <h3 className="text-2xl font-black text-white mb-8 px-2">다른 아티스트의 인기 굿즈</h3>
            <ProductGrid products={otherProducts} />
          </section>
        )}
      </div>
    </div>
  );
}
