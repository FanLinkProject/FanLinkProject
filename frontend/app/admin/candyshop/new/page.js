"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";

export default function AdminCandyshopNewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isSubscription, setIsSubscription] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name.trim()) {
      alert("상품명을 입력하세요.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 100) {
      alert("가격을 100원 이상 입력하세요 (100원당 1캔디).");
      return;
    }
    const candyAmount = Math.floor(priceNum / 100);
    setLoading(true);
    try {
      await createProduct({
        artistId: null,
        name: name.trim(),
        price: priceNum,
        candyPrice: candyAmount,
        type: "CASH",
        paymentMethod: "CASH_ONLY",
        isSubscription,
        quantity: 0,
        isMembershipOnly: false,
        isExclusive: false,
        isMembership: false,
        concertId: null,
        mediaAssetIds: [],
        representativeMediaAssetId: null,
      });
      router.push("/admin/candyshop");
    } catch (err) {
      alert(err?.message || "등록 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto space-y-10">
      <Link
        href="/admin/candyshop"
        className="inline-flex items-center gap-2 text-white/55 hover:text-violet-300 text-sm font-bold"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        캔디샵으로
      </Link>
      <SectionTitle className="text-2xl font-bold">캔디 충전 상품 등록</SectionTitle>
      <Surface variant="primary" className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">상품명 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white"
              placeholder="예: 캔디 100개 (단건)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">가격(원) *</label>
            <input
              type="number"
              min={100}
              step={100}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white tabular-nums"
              placeholder="100원당 1캔디"
              required
            />
            <p className="text-xs text-white/50 mt-1">입력 금액 ÷ 100 = 충전 캔디 개수</p>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white/80">정기결제 상품</label>
            <Toggle checked={isSubscription} onChange={setIsSubscription} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/candyshop")}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
