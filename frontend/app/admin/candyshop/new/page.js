"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";

/** 충전되는 캔디 수 = 상품 가격 / 100 */
function candyAmount(price) {
  return price ? Math.floor(Number(price) / 100) : 0;
}

export default function AdminCandyShopNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    price: 5000,
    isSubscription: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = Number(form.price) || 0;
    if (!form.name.trim()) {
      alert("상품명을 입력하세요.");
      return;
    }
    if (price <= 0) {
      alert("가격을 입력하세요. (100원당 1캔디)");
      return;
    }
    setLoading(true);
    try {
      await createProduct({
        artistId: null,
        name: form.name.trim(),
        price,
        candyPrice: 0,
        type: "CASH",
        paymentMethod: "CASH_ONLY",
        isSubscription: form.isSubscription,
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

  const amount = candyAmount(form.price);

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto space-y-10">
      <Link
        href="/admin/candyshop"
        className="inline-flex items-center gap-2 text-white/55 hover:text-violet-300 text-sm font-bold"
      >
        <span className="material-symbols-outlined">arrow_back</span> 캔디샵으로
      </Link>
      <SectionTitle className="text-2xl font-bold">캔디 충전 상품 등록</SectionTitle>
      <Surface variant="primary" className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">상품명</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 100 캔디 수량 충전"
              className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-medium text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">가격 (원)</label>
            <input
              type="number"
              min={100}
              step={100}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
              className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
            />
            <p className="text-xs text-white/55 mt-1">
              충전 캔디 수: {amount.toLocaleString()}개 (가격 ÷ 100)
            </p>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white/80">정기결제 상품</label>
            <Toggle
              checked={form.isSubscription}
              onChange={(checked) => setForm((f) => ({ ...f, isSubscription: checked }))}
            />
          </div>
          <p className="text-[10px] text-white/45">
            정기결제 상품은 카드 자동 결제로 매월 충전됩니다.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => router.push("/admin/candyshop")}
            >
              취소
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
              {loading ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
