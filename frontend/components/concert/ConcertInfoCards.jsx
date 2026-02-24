"use client";

import { getTicketStatus, formatDateTime, formatUpcomingSaleDday, formatClosedLabel } from "@/lib/concertUtils";
import Button from "@/components/ui/Button";

/** API가 camelCase 또는 snake_case로 올 수 있음. 둘 다 없으면 null */
function formatDateRange(concert, startCamel, endCamel, startSnake, endSnake) {
  const startVal = concert?.[startCamel] ?? concert?.[startSnake];
  const endVal = concert?.[endCamel] ?? concert?.[endSnake];
  if (!startVal && !endVal) return null;
  return `${formatDateTime(startVal)} ~ ${formatDateTime(endVal)}`;
}

export function ConcertInfoCards({ concert, onBookClick, bookingLoading }) {
  if (!concert) return null;
  const status = getTicketStatus(concert);
  const upcomingLabel = formatUpcomingSaleDday(concert);

  const ctaLabel =
    status === "OPEN"
      ? (bookingLoading ? "확인 중..." : "예매하기")
      : status === "UPCOMING"
        ? (upcomingLabel ?? "예매 예정")
        : formatClosedLabel(concert);
  const ctaDisabled = status !== "OPEN" || bookingLoading;

  const presaleRange = formatDateRange(
    concert,
    "presaleStartDateTime",
    "presaleEndDateTime",
    "presale_start_date_time",
    "presale_end_date_time"
  );
  const saleRange = formatDateRange(
    concert,
    "saleStartDateTime",
    "saleEndDateTime",
    "sale_start_date_time",
    "sale_end_date_time"
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.04]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-3">일정</h3>
        <p className="text-white font-medium">시작 {formatDateTime(concert.startDateTime)}</p>
        <p className="text-white/70 text-sm mt-1">종료 {formatDateTime(concert.endDateTime)}</p>
      </div>
      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.04]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-3">예매</h3>
        <p className="text-white/80 text-sm">
          선예매 {concert.presaleTicketCount ?? 0}장 · 일반 {concert.saleTicketCount ?? 0}장
        </p>
        <p className="text-white/55 text-xs mt-1">
          선예매 {presaleRange ?? "기간 미정"}
        </p>
        <p className="text-white/55 text-xs">일반 {saleRange ?? "기간 미정"}</p>
        <Button
          variant="primary"
          className="mt-4 w-full"
          disabled={ctaDisabled}
          href={ctaDisabled ? undefined : undefined}
          onClick={ctaDisabled ? undefined : () => onBookClick?.(concert)}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
