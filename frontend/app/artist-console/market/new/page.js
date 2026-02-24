"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";
import { createProduct } from "@/lib/productApi";
import { useMediaUpload } from "@/lib/useMediaUpload";
import { MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";
import { computeTypeAndPayment } from "@/lib/productUtils";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";

export default function NewProductPage() {
  const router = useRouter();
  const [artistId, setArtistId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    price: 0,
    candyPrice: 0,
    isSubscription: false,
    quantity: 1,
    isMembershipOnly: false,
    isExclusive: false,
    isMembership: false,
    isTicket: false,
    concertId: null,
    mediaAssetIds: [],
    representativeMediaAssetId: null,
    attachmentPreviews: [],
    describeMediaAssetIds: [],
    describePreviews: [],
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const describeFileInputRef = useRef(null);

  const presignItem = {
    category: MediaAssetCategory.PRODUCT_IMAGE,
    scope: MediaAssetScope.PUBLIC,
    artistId: artistId ?? undefined,
    productIdOrTemp: "new",
    attachmentCountInProduct: form.mediaAssetIds.length + 1,
  };
  const { upload, loading: uploadLoading, error: uploadError } = useMediaUpload(presignItem);

  const describePresignItem = {
    category: MediaAssetCategory.PRODUCT_DESCRIBE_IMAGE,
    scope: MediaAssetScope.PUBLIC,
    artistId: artistId ?? undefined,
    productIdOrTemp: "new",
    attachmentCountInProduct: form.describeMediaAssetIds.length + 1,
  };
  const { upload: uploadDescribe, loading: describeLoading, error: describeError } = useMediaUpload(describePresignItem);

  useEffect(() => {
    request("/api/artist/mypage")
      .then((data) => setArtistId(data?.profile?.id))
      .catch(() => {});
  }, []);

  // 멤버십 상품 ON → 단독판매 ON+비활성화, OFF → 단독판매 OFF+활성화
  const handleMembershipChange = (checked) => {
    setForm((f) => ({
      ...f,
      isMembership: checked,
      isExclusive: checked ? true : false,
    }));
  };

  const handleAddImage = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !upload) return;
    const result = await upload(file);
    if (result?.mediaAssetId) {
      setForm((f) => ({
        ...f,
        mediaAssetIds: [...f.mediaAssetIds, result.mediaAssetId],
        representativeMediaAssetId: f.representativeMediaAssetId ?? result.mediaAssetId,
        attachmentPreviews: [
          ...f.attachmentPreviews,
          { mediaAssetId: result.mediaAssetId, url: result.url },
        ],
      }));
    }
    e.target.value = "";
  };

  const handleRemoveImage = (mediaAssetId) => {
    setForm((f) => {
      const nextIds = f.mediaAssetIds.filter((id) => id !== mediaAssetId);
      return {
        ...f,
        mediaAssetIds: nextIds,
        representativeMediaAssetId:
          f.representativeMediaAssetId === mediaAssetId
            ? nextIds[0] ?? null
            : f.representativeMediaAssetId,
        attachmentPreviews: f.attachmentPreviews.filter((p) => p.mediaAssetId !== mediaAssetId),
      };
    });
  };

  const handleSetRepresentative = (mediaAssetId) => {
    setForm((f) => ({ ...f, representativeMediaAssetId: mediaAssetId }));
  };

  const handleAddDescribeImage = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !uploadDescribe) return;
    const result = await uploadDescribe(file);
    if (result?.mediaAssetId) {
      setForm((f) => ({
        ...f,
        describeMediaAssetIds: [...f.describeMediaAssetIds, result.mediaAssetId],
        describePreviews: [
          ...f.describePreviews,
          { mediaAssetId: result.mediaAssetId, url: result.url },
        ],
      }));
    }
    e.target.value = "";
  };

  const handleRemoveDescribeImage = (mediaAssetId) => {
    setForm((f) => ({
      ...f,
      describeMediaAssetIds: f.describeMediaAssetIds.filter((id) => id !== mediaAssetId),
      describePreviews: f.describePreviews.filter((p) => p.mediaAssetId !== mediaAssetId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = Number(form.price) || 0;
    const candyPrice = Number(form.candyPrice) || 0;
    if (!form.name.trim()) {
      alert("상품명을 입력하세요.");
      return;
    }
    if (price <= 0 && candyPrice <= 0) {
      alert("가격 또는 캔디 가격을 입력하세요.");
      return;
    }
    const isSubscription = form.isSubscription;
    const isMembership = form.isMembership;
    const quantity =
      isSubscription || isMembership ? 0 : Number(form.quantity) || 1;
    const concertId = form.isTicket ? form.concertId : null;
    if (form.isTicket && !concertId) {
      alert("티켓 상품인 경우 공연을 선택해주세요.");
      return;
    }
    const { type, paymentMethod } = computeTypeAndPayment(artistId, price, candyPrice);
    setLoading(true);
    try {
      const allMediaAssetIds = [...form.mediaAssetIds, ...form.describeMediaAssetIds];
      await createProduct({
        artistId,
        name: form.name.trim(),
        price: price || 0,
        candyPrice: candyPrice || 0,
        type,
        paymentMethod,
        isSubscription,
        quantity,
        isMembershipOnly: form.isMembershipOnly,
        isExclusive: form.isExclusive,
        isMembership,
        concertId,
        mediaAssetIds: allMediaAssetIds,
        representativeMediaAssetId: form.representativeMediaAssetId,
      });
      router.push("/artist-console/market");
    } catch (err) {
      alert(err.message || "등록 실패");
    } finally {
      setLoading(false);
    }
  };

  const showQuantity = !form.isSubscription && !form.isMembership;
  const isExclusiveDisabled = form.isMembership;

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto space-y-10">
      <Link href="/artist-console/market" className="inline-flex items-center gap-2 text-white/55 hover:text-violet-300 text-sm font-bold">
        <span className="material-symbols-outlined">arrow_back</span> 상품 관리로
      </Link>
      <SectionTitle className="text-2xl font-bold">상품 등록</SectionTitle>
      <Surface variant="primary" className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">상품명 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white"
              placeholder="상품명"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">상품 이미지</label>
            <div className="flex flex-wrap gap-3">
              {form.mediaAssetIds.map((id) => {
                const preview = form.attachmentPreviews.find((p) => p.mediaAssetId === id);
                const isRep = form.representativeMediaAssetId === id;
                return (
                  <div
                    key={id}
                    className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/10 group cursor-pointer"
                    onClick={() => handleSetRepresentative(id)}
                    title={isRep ? "대표 이미지" : "클릭하여 대표 이미지로 설정"}
                  >
                    {preview?.url ? (
                      <img src={preview.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                        이미지
                      </span>
                    )}
                    {isRep && (
                      <span className="absolute bottom-0 left-0 right-0 bg-violet-600/80 text-[10px] text-center py-0.5">
                        대표
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); handleRemoveImage(id); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 z-10"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/50 hover:border-violet-500/50 hover:text-violet-300 transition-colors disabled:opacity-50"
              >
                {uploadLoading ? "..." : "+"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddImage}
              />
            </div>
            {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">상품 상세 이미지</label>
            <p className="text-xs text-white/40 mb-2">상세 설명에 사용할 이미지를 추가하세요.</p>
            <div className="flex flex-wrap gap-3">
              {form.describeMediaAssetIds.map((id) => {
                const preview = form.describePreviews.find((p) => p.mediaAssetId === id);
                return (
                  <div
                    key={id}
                    className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/10 group"
                  >
                    {preview?.url ? (
                      <img src={preview.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                        이미지
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveDescribeImage(id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 z-10"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => describeFileInputRef.current?.click()}
                disabled={describeLoading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/50 hover:border-violet-500/50 hover:text-violet-300 transition-colors disabled:opacity-50"
              >
                {describeLoading ? "..." : "+"}
              </button>
              <input
                ref={describeFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddDescribeImage}
              />
            </div>
            {describeError && <p className="text-xs text-red-400 mt-1">{describeError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">현금 가격 (원)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">캔디 가격</label>
              <input
                type="number"
                value={form.candyPrice}
                onChange={(e) => setForm((f) => ({ ...f, candyPrice: e.target.value }))}
                className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white"
                min="0"
              />
            </div>
          </div>
          <p className="text-xs text-white/55">현금 또는 캔디 중 하나만 설정하세요.</p>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <Toggle
                checked={form.isSubscription}
                onChange={(v) => setForm((f) => ({ ...f, isSubscription: v }))}
                label="구독 상품"
              />
              <Toggle
                checked={form.isMembershipOnly}
                onChange={(v) => setForm((f) => ({ ...f, isMembershipOnly: v }))}
                label="멤버십 한정 상품"
              />
              <Toggle
                checked={form.isExclusive}
                onChange={(v) => setForm((f) => ({ ...f, isExclusive: v }))}
                disabled={isExclusiveDisabled}
                label="단독 판매"
              />
              <Toggle
                checked={form.isMembership}
                onChange={handleMembershipChange}
                label="멤버십 상품"
              />
            </div>
          </div>

          {showQuantity && (
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">재고 수량</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full px-5 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl text-white"
                min="1"
              />
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "등록 중..." : "등록"}
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
