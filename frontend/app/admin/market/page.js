"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

const ADMIN_MARKET_RETURN = "/admin/market";

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

function ProductCard({ product }) {
  const imgUrl = getProductImageUrl(product);
  return (
    <Link
      href={`/market/products/${product.id}`}
      onClick={() =>
        typeof window !== "undefined" &&
        sessionStorage.setItem("productDetailReturnPath", ADMIN_MARKET_RETURN)
      }
      className="flex flex-col group h-full"
    >
      <Surface variant="card" className="p-5 flex flex-col h-full">
        <div className="aspect-square rounded-xl overflow-hidden mb-6 relative">
          {imgUrl ? (
            <img
              src={imgUrl}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200 ease-out"
              alt={product.name}
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/30">image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 px-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-white/55 uppercase tracking-widest">
              {product.artistName || (product.artistId == null ? "FanLink" : "아티스트")}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
          <p className="text-xl font-black text-violet-300">{formatPrice(product)}</p>
        </div>
        <div className="mt-6">
          <span className="block w-full py-3.5 bg-white/[0.06] border border-white/[0.08] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gradient-to-r hover:from-violet-500 hover:to-fuchsia-500 hover:border-transparent transition-all text-center">
            상세보기
          </span>
        </div>
      </Surface>
    </Link>
  );
}

export default function AdminMarketPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts({ market: true })
      .then((list) => setAllProducts(Array.isArray(list) ? list : []))
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = allProducts.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.artistName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupStores = [];
  const seenGroups = new Set();
  for (const p of allProducts) {
    if (p.groupId && !seenGroups.has(p.groupId)) {
      seenGroups.add(p.groupId);
      groupStores.push({
        id: p.groupId,
        name: p.groupName || "그룹",
        type: "group",
        products: allProducts.filter((x) => x.groupId === p.groupId),
      });
    }
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
      <header className="flex items-center gap-4 mb-6">
        <Link
          href="/admin"
          className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/5"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">마켓 (관리자)</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            전체 굿즈 조회
          </p>
        </div>
      </header>

      <div className="w-full mb-16 relative group">
        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-white/55 group-focus-within:text-violet-300 transition-colors">
          search
        </span>
        <input
          type="text"
          placeholder="상품명 또는 아티스트 이름을 검색하세요"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#201a33] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/[0.1] placeholder:text-white/40 transition-all font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        />
      </div>

      <div className="space-y-10">
        <div className="flex items-center justify-between px-2">
          <SectionTitle>전체 굿즈 탐색</SectionTitle>
          {searchTerm && (
            <p className="text-sm text-white/55 font-medium">
              &apos;<span className="text-violet-300 font-bold">{searchTerm}</span>&apos; 검색 결과{" "}
              <span className="text-white font-bold">{filteredProducts.length}</span>건
            </p>
          )}
        </div>
        {loading ? (
          <p className="text-white/55 py-12">로딩 중...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <Surface
                variant="primary"
                className="col-span-full py-24 text-center border-dashed border-white/[0.08]"
              >
                <span className="material-symbols-outlined text-5xl text-white/30 mb-4 block">
                  search_off
                </span>
                <p className="text-white/55 font-medium italic">
                  검색 결과와 일치하는 상품이 없습니다.
                </p>
              </Surface>
            )}
          </div>
        )}
      </div>

      {!searchTerm && groupStores.length > 0 && (
        <div className="space-y-16 pt-12 border-t border-white/10">
          <div className="space-y-10">
            <SectionTitle className="px-2 mb-8">그룹별 스토어</SectionTitle>
            {groupStores.map((store) => {
              const preview = store.products.slice(0, 4);
              if (preview.length === 0) return null;
              return (
                <div key={`group-${store.id}`} className="space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <Link
                      href={`/artists/${store.id}/market`}
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("artistMarketReturnPath", ADMIN_MARKET_RETURN);
                        }
                      }}
                      className="flex items-center gap-4 group"
                    >
                      <div className="size-10 rounded-2xl border border-white/[0.08] bg-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/50">groups</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white group-hover:text-violet-300 transition-colors">
                          {store.name}
                        </h3>
                        <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                          그룹 공식 스토어
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-white/55 group-hover:text-violet-300 group-hover:translate-x-1 transition-all">
                        chevron_right
                      </span>
                    </Link>
                    <Link
                      href={`/artists/${store.id}/market`}
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("artistMarketReturnPath", ADMIN_MARKET_RETURN);
                        }
                      }}
                      className="text-xs font-bold text-violet-300 hover:text-violet-200"
                    >
                      전체 상품 보기
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {preview.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
