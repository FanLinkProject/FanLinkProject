"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";
import { createProduct, getProducts } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getDefaultAvatarUrl } from "@/lib/avatar";

export default function NewDmProductPage() {
  const router = useRouter();
  const [mypage, setMypage] = useState(null);
  const [existingProducts, setExistingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [candyPrice, setCandyPrice] = useState("");

  const rawMembers = mypage?.teamInfo?.members ?? [];
  const groupId = mypage?.profile?.id;
  const members = rawMembers.filter((m) => m.id != null && m.id !== groupId);
  const isGroup = mypage?.teamInfo?.type === "GROUP";

  const memberIdsWithDm = useMemo(() => {
    return new Set(
      existingProducts
        .filter((p) => p.paymentMethod === "CANDY_ONLY" && p.isSubscription && p.artistId != null)
        .map((p) => p.artistId)
    );
  }, [existingProducts]);

  useEffect(() => {
    request("/api/artist/mypage")
      .then((data) => {
        setMypage(data);
        if (data?.teamInfo?.type !== "GROUP") {
          router.replace("/artist-console/market");
          return;
        }
        const gid = data?.profile?.id;
        const raw = data?.teamInfo?.members ?? [];
        const first = raw.find((m) => m.id != null && m.id !== gid);
        if (first) setMemberId(first.id);
        const ids = [gid, ...raw.map((m) => m.id).filter(Boolean)];
        return getProducts({ artistIds: ids }).then((list) => {
          setExistingProducts(Array.isArray(list) ? list : []);
        });
      })
      .catch(() => router.replace("/artist-console/market"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!mypage || mypage?.teamInfo?.type !== "GROUP") return;
    const ids = [mypage?.profile?.id, ...(mypage?.teamInfo?.members ?? []).map((m) => m.id).filter(Boolean)];
    getProducts({ artistIds: ids })
      .then((list) => setExistingProducts(Array.isArray(list) ? list : []))
      .catch(() => setExistingProducts([]));
  }, [mypage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = Number(candyPrice);
    if (!memberId || !members.length) {
      alert("소속 멤버를 선택해 주세요.");
      return;
    }
    if (memberIdsWithDm.has(memberId)) {
      alert("해당 아티스트에는 이미 DM 상품이 등록되어 있습니다.");
      return;
    }
    if (!Number.isFinite(price) || price < 1) {
      alert("캔디 가격을 입력해 주세요 (1 이상).");
      return;
    }
    const member = members.find((m) => m.id === memberId);
    const productName = member ? `${member.nickname}와 1:1 DM` : "DM 구독";

    setSubmitLoading(true);
    try {
      await createProduct({
        artistId: memberId,
        name: productName,
        price: 0,
        candyPrice: price,
        type: "SETTLEMENT_CANDY",
        paymentMethod: "CANDY_ONLY",
        isSubscription: true,
        quantity: 0,
        isMembershipOnly: false,
        isExclusive: true,
        isMembership: false,
        concertId: null,
        mediaAssetIds: [],
        representativeMediaAssetId: null,
      });
      router.push("/artist-console/market");
    } catch (err) {
      alert(err.message || "등록 실패");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading || !isGroup) {
    return (
      <div className="p-8 lg:p-12 max-w-2xl mx-auto">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto space-y-10">
      <Link
        href="/artist-console/market"
        className="inline-flex items-center gap-2 text-white/55 hover:text-violet-300 text-sm font-bold"
      >
        <span className="material-symbols-outlined">arrow_back</span> 상품 관리로
      </Link>
      <SectionTitle className="text-2xl font-bold">DM 상품 등록</SectionTitle>
      <Surface variant="primary" className="p-8">
        <p className="text-sm text-white/70 mb-6">
          소속 아티스트와의 1:1 DM 구독 상품을 등록합니다. 선택한 멤버 ID로 상품이 연결되며, 구독·단독 상품으로 등록됩니다.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-white/80 mb-3">소속 아티스트 선택 *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {members.map((m) => {
                const hasDm = memberIdsWithDm.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={hasDm}
                    onClick={() => !hasDm && setMemberId(m.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-colors flex flex-col min-h-[120px] ${
                      hasDm
                        ? "border-white/[0.06] bg-white/[0.02] opacity-60 cursor-not-allowed"
                        : memberId === m.id
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                    }`}
                  >
                    <img
                      src={m.profileImageUrl || getDefaultAvatarUrl()}
                      alt=""
                      className="size-12 rounded-xl object-cover border border-white/[0.08] mb-2 shrink-0"
                    />
                    <p className="font-medium text-white text-sm truncate">{m.nickname}</p>
                    {hasDm && (
                      <p className="text-[10px] text-white/50 mt-auto pt-2">이미 DM 상품 등록됨</p>
                    )}
                  </button>
                );
              })}
            </div>
            {members.length === 0 && (
              <p className="text-white/50 text-sm">소속 멤버가 없습니다. 그룹 멤버를 먼저 등록해 주세요.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">캔디 가격 (월 구독) *</label>
            <input
              type="number"
              value={candyPrice}
              onChange={(e) => setCandyPrice(e.target.value)}
              className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white"
              min="1"
              placeholder="예: 500"
              required
            />
            <p className="text-xs text-white/55 mt-1">캔디로 결제되는 월 구독 가격입니다.</p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={submitLoading || members.length === 0 || (memberId && memberIdsWithDm.has(memberId))}
            >
              {submitLoading ? "등록 중..." : "등록"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/artist-console/market")}>
              취소
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
