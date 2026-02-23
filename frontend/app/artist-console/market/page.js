"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProducts, getProduct, updateProduct, deleteProduct } from "@/lib/productApi";
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

function isDmProduct(product) {
  return product.isSubscription && product.paymentMethod === "CANDY_ONLY";
}

export default function ArtistMarketMgmtPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [artistId, setArtistId] = useState(null);
  const [isGroupAccount, setIsGroupAccount] = useState(false);
  const [dmEditModalOpen, setDmEditModalOpen] = useState(false);
  const [dmEditProduct, setDmEditProduct] = useState(null);
  const [dmEditCandyPrice, setDmEditCandyPrice] = useState("");
  const [dmEditLoading, setDmEditLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    const authHeader = token.startsWith("Bearer") ? token : `Bearer ${token}`;
    fetch("http://localhost:8080/api/artist/mypage", { headers: { Authorization: authHeader } })
      .then((r) => r.json())
      .then((data) => {
        const id = data?.profile?.id;
        const teamType = data?.teamInfo?.type;
        const members = data?.teamInfo?.members ?? [];
        setArtistId(id);
        setIsGroupAccount(teamType === "GROUP");
        if (!id) return [];
        if (teamType === "GROUP") {
          const artistIds = [id, ...members.map((m) => m.id).filter(Boolean)];
          return getProducts({ artistIds });
        }
        return getProducts({ artistId: id });
      })
      .then((list) => {
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [router]);

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e.message || "삭제 실패");
    }
  };

  const handleOpenDmEdit = async (product) => {
    setDmEditLoading(true);
    try {
      const detail = await getProduct(product.id);
      setDmEditProduct(detail);
      setDmEditCandyPrice(String(detail.candyPrice ?? 0));
      setDmEditModalOpen(true);
    } catch (e) {
      alert(e.message || "상품 정보를 불러올 수 없습니다.");
    } finally {
      setDmEditLoading(false);
    }
  };

  const handleCloseDmEditModal = () => {
    setDmEditModalOpen(false);
    setDmEditProduct(null);
    setDmEditCandyPrice("");
  };

  const handleDmEditSubmit = async (e) => {
    e.preventDefault();
    if (!dmEditProduct) return;
    const candyPrice = Number(dmEditCandyPrice);
    if (!Number.isFinite(candyPrice) || candyPrice < 1) {
      alert("캔디 개수를 1 이상으로 입력해 주세요.");
      return;
    }
    setDmEditLoading(true);
    try {
      const mediaAssetIds = dmEditProduct.attachments?.map((a) => a.mediaAssetId) ?? [];
      await updateProduct(dmEditProduct.id, {
        artistId: dmEditProduct.artistId,
        name: dmEditProduct.name,
        price: dmEditProduct.price ?? 0,
        candyPrice,
        type: dmEditProduct.type ?? "SETTLEMENT_CANDY",
        paymentMethod: dmEditProduct.paymentMethod ?? "CANDY_ONLY",
        isSubscription: true,
        quantity: 0,
        isMembershipOnly: dmEditProduct.isMembershipOnly ?? false,
        isExclusive: dmEditProduct.isExclusive ?? true,
        isMembership: dmEditProduct.isMembership ?? false,
        concertId: dmEditProduct.concertId ?? null,
        mediaAssetIds,
        representativeMediaAssetId: dmEditProduct.representativeMediaAssetId ?? null,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === dmEditProduct.id ? { ...p, candyPrice } : p))
      );
      handleCloseDmEditModal();
    } catch (err) {
      alert(err?.message || "수정 실패");
    } finally {
      setDmEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">상품 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">공식 스토어 상품을 등록하고 주문을 처리하세요.</p>
        </div>
        <div className="flex gap-2">
          {isGroupAccount && (
            <Button
              variant="primary"
              className="text-xs uppercase tracking-widest"
              onClick={() => router.push("/artist-console/market/dm/new")}
            >
              DM 상품 등록
            </Button>
          )}
          <Button
            variant="primary"
            className="text-xs uppercase tracking-widest"
            onClick={() => router.push("/artist-console/market/new")}
          >
            상품 등록
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        {products.map((product) => (
          <Surface
            key={product.id}
            variant="primary"
            className="p-8 flex gap-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
          >
            <div className="size-24 rounded-2xl overflow-hidden bg-white/5 border border-white/[0.08] flex-shrink-0">
              {getProductImageUrl(product) ? (
                <img src={getProductImageUrl(product)} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  <span className="material-symbols-outlined">image</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white truncate">{product.name}</h4>
              <p className="text-xl font-black text-violet-300 tabular-nums">{formatPrice(product)}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-black uppercase">
                {product.isSubscription ? "구독" : "판매중"}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                className="px-4 py-2 text-[10px] uppercase tracking-widest"
                onClick={() =>
                  isDmProduct(product)
                    ? handleOpenDmEdit(product)
                    : router.push(`/artist-console/market/${product.id}/edit`)
                }
                disabled={dmEditLoading}
              >
                수정
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(product.id)}
                className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
              >
                삭제
              </button>
            </div>
          </Surface>
        ))}
        {products.length === 0 && (
          <Surface variant="primary" className="py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">inventory_2</span>
            <p className="text-white/55 font-medium italic">등록된 상품이 없습니다.</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => router.push("/artist-console/market/new")}
            >
              상품 등록
            </Button>
          </Surface>
        )}
      </div>

      {/* DM 상품 수정 모달: 캔디 개수만 변경 */}
      {dmEditModalOpen && dmEditProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={handleCloseDmEditModal}
        >
          <div
            className="bg-[#1a1525] border border-white/10 rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">DM 상품 수정</h3>
            <p className="text-sm text-white/70 mb-2">{dmEditProduct.name}</p>
            <form onSubmit={handleDmEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">캔디 개수</label>
                <input
                  type="number"
                  min={1}
                  value={dmEditCandyPrice}
                  onChange={(e) => setDmEditCandyPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-[#201a33] border border-white/[0.06] rounded-xl text-white tabular-nums"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={handleCloseDmEditModal}>
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={dmEditLoading}>
                  {dmEditLoading ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
