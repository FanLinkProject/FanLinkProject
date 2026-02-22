"use client";

import { getTicketStatus, getDaysUntilSaleStart, formatDateTime } from "@/lib/concertUtils";
import Button from "@/components/ui/Button";

export function ConcertInfoCards({ concert }) {
  if (!concert) return null;
  const status = getTicketStatus(concert);
  const dday = getDaysUntilSaleStart(concert);

  const ctaLabel =
    status === "OPEN" ? "예매하기" : status === "UPCOMING" ? (dday != null ? `예매 시작 D-${dday}` : "예매 예정") : "예매 마감";
  const ctaDisabled = status === "CLOSED";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.04]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-3">일정</h3>
        <p className="text-white font-medium">시작 {formatDateTime(concert.startDateTime)}</p>
        <p className="text-white/70 text-sm mt-1">종료 {formatDateTime(concert.endDateTime)}</p>
        <p className="text-white/55 text-xs mt-2">타임존 {concert.timezone || "Asia/Seoul"}</p>
      </div>
      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.04]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-3">예매</h3>
        <p className="text-white/80 text-sm">
          선예매 {concert.presaleTicketCount ?? 0}장 · 일반 {concert.saleTicketCount ?? 0}장
        </p>
        <p className="text-white/55 text-xs mt-1">
          선예매 {formatDateTime(concert.presaleStartDateTime)} ~ {formatDateTime(concert.presaleEndDateTime)}
        </p>
        <p className="text-white/55 text-xs">일반 {formatDateTime(concert.saleStartDateTime)} ~ {formatDateTime(concert.saleEndDateTime)}</p>
        <Button
          variant="primary"
          className="mt-4 w-full"
          disabled={ctaDisabled}
          href={ctaDisabled ? undefined : "#"}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
