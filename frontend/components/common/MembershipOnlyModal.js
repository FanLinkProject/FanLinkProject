"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";

const DEFAULT_TITLE = "멤버십 전용 콘텐츠";
const DEFAULT_DESCRIPTION_1 = "이 콘텐츠는 멤버십 가입자만 이용할 수 있습니다.";
const DEFAULT_DESCRIPTION_2 = "가입 즉시 라이브와 전용 콘텐츠를 모두 이용하실 수 있습니다.";
const DEFAULT_BENEFITS = [
  "멤버 전용 라이브 시청",
  "전용 게시물·공지 열람",
  "이벤트·굿즈 선공개",
];

/**
 * 유료/멤버십 전용 콘텐츠 접근 불가 시 공통 안내 모달.
 * - isOpen, onClose 필수
 * - artistId: 결제 페이지 쿼리용 (문자열 또는 숫자). 있으면 CTA 시 /candy/payment?artistId=... 로 이동
 * - artistName, contentLabel, benefits, priceLabel 선택
 */
export default function MembershipOnlyModal({
  isOpen,
  open,
  onClose,
  artistId,
  artistName,
  contentLabel = "라이브",
  benefits = DEFAULT_BENEFITS,
  priceLabel,
}) {
  const router = useRouter();
  const openState = isOpen ?? open ?? false;

  const handleEscape = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!openState) return;
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openState, handleEscape]);

  const handleCta = () => {
    onClose?.();
    if (artistId != null && artistId !== "") {
      router.push(`/candy/payment?artistId=${encodeURIComponent(String(artistId))}`);
    } else {
      router.push("/");
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!openState) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-modal-title"
    >
      <Surface
        variant="primary"
        className="relative w-full max-w-md shadow-[0_24px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1) 헤더 */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <h2 id="membership-modal-title" className="text-xl font-bold text-white">
              {DEFAULT_TITLE}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 size-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* 2) 본문: 설명 + 혜택 */}
        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-white/85 leading-relaxed">{DEFAULT_DESCRIPTION_1}</p>
            <p className="text-sm text-white/85 leading-relaxed">{DEFAULT_DESCRIPTION_2}</p>
          </div>
          {Array.isArray(benefits) && benefits.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
              {benefits.map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="shrink-0 size-5 rounded-full bg-violet-500/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-violet-300 text-[12px]">check</span>
                  </span>
                  <span className="text-sm text-white/90">{text}</span>
                </div>
              ))}
            </div>
          )}
          {priceLabel && (
            <p className="text-xs text-white/55 text-center">{priceLabel}</p>
          )}
        </div>

        {/* 3) 푸터: CTA */}
        <div className="flex flex-col gap-3 p-6 pt-0">
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={handleCta}
          >
            멤버십 가입하기
          </Button>
        </div>
      </Surface>
    </div>
  );
}
