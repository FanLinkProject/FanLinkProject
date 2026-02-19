"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductsByArtist } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

function getProductImageUrl(product) {
  const rep = product.attachments?.find(
    (a) => a.mediaAssetId === product.representativeMediaAssetId
  );
  if (rep?.url) return rep.url;
  return product.attachments?.[0]?.url || null;
}

function formatPrice(product) {
  if (product.paymentMethod === "CANDY_ONLY" && product.candyPrice > 0) {
    return `${product.candyPrice?.toLocaleString()} 캔디`;
  }
  return `${product.price?.toLocaleString()}원`;
}

function ProductCard({ product, artist }) {
  const imgUrl = getProductImageUrl(product);
  return (
    <Surface variant="card" className="p-5 flex flex-col h-full">
      <div className="aspect-square rounded-xl overflow-hidden mb-4 relative">
        {imgUrl ? (
          <img src={imgUrl} className="w-full h-full object-cover" alt={product.name} />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-white/30">image</span>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[10px] font-black text-white/55 uppercase tracking-widest truncate mb-2">
          {product.artistName || "아티스트"}
        </span>
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-xl font-black text-violet-300 tabular-nums mt-auto">{formatPrice(product)}</p>
      </div>
      <Link
        href={`/market/products/${product.id}`}
        onClick={() => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("productDetailReturnPath", window.location.pathname);
          }
        }}
        className="block w-full mt-4 py-3 text-[11px] uppercase tracking-widest text-center font-bold rounded-full bg-[#6d28d9] text-white hover:brightness-110 transition-all"
      >
        상세보기
      </Link>
    </Surface>
  );
}

const RETURN_PATH_KEY = "artistMarketReturnPath";

export default function ArtistMarketPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;
  const router = useRouter();

  const [artist, setArtist] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnPath, setReturnPath] = useState(`/artists/${id}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(RETURN_PATH_KEY);
      if (saved && saved.startsWith("/")) {
        setReturnPath(saved);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const numId = typeof id === "string" && /^\d+$/.test(id) ? parseInt(id, 10) : id;
    if (typeof numId !== "number" || isNaN(numId)) {
      setLoading(false);
      return;
    }
    getProductsByArtist(numId)
      .then((list) => {
        setProducts(Array.isArray(list) ? list : []);
        if (list?.length > 0) {
          const isGroupStore = list.some((p) => p.groupId === numId);
          const storeName = isGroupStore
            ? (list.find((p) => p.groupId === numId)?.groupName || "그룹")
            : (list[0].artistName || "아티스트");
          setArtist({ id: numId, name: storeName, avatar: null, cover: null, isGroup: isGroupStore });
        } else {
          setArtist({ id: numId, name: "아티스트", avatar: null, cover: null, isGroup: false });
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  const artistName = artist?.name || "아티스트";

  const handleBack = () => {
    router.push(returnPath);
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center justify-center size-10 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/55 hover:text-violet-300 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <SectionTitle className="text-2xl font-bold">
            {artistName} {artist?.isGroup ? "그룹 공식 스토어" : "개인 스토어"}
          </SectionTitle>
          <p className="text-xs text-white/55 font-bold uppercase tracking-widest mt-1">
            Total {products.length} Items
          </p>
        </div>
      </div>

      <header className="relative h-48 rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0814]/90 via-[#0b0814]/40 to-transparent" />
        <div className="absolute inset-0 flex items-center px-12 gap-8">
          <div className="size-24 rounded-2xl border-2 border-white/[0.08] bg-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white/50 text-4xl">person</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">
              {artistName} {artist?.isGroup ? "그룹" : "개인"} 굿즈 스토어
            </h2>
            <p className="text-white/70 font-medium mt-1 italic">
              아티스트의 감성이 담긴 공식 굿즈를 확인하세요.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} artist={artist} />
        ))}
        {products.length === 0 && (
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
        </Surface>
      </footer>
    </div>
  );
}
