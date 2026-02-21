"use client";

import { getTicketStatus, getDaysUntilSaleStart, formatDateShort } from "@/lib/concertUtils";

/**
 * Hero: 공연 제목 + 날짜 + 예매상태. 상단 오버레이에 목록(좌)/공유(우) 버튼.
 */
export function ConcertHero({ concert, onBack, onShare }) {
  if (!concert) return null;
  const status = getTicketStatus(concert);
  const dday = getDaysUntilSaleStart(concert);

  const statusLabel =
    status === "OPEN" ? "예매중" : status === "UPCOMING" ? (dday != null ? `예매 D-${dday}` : "예매 예정") : "마감";
  const statusClass =
    status === "OPEN" ? "bg-emerald-500/90" : status === "UPCOMING" ? "bg-amber-500/90" : "bg-white/20";

  const btnClass =
    "h-10 w-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex items-center justify-center shrink-0";

  return (
    <section className="relative rounded-3xl overflow-hidden border border-white/10 aspect-[2/1] min-h-[280px] bg-gradient-to-b from-white/[0.05] to-transparent">
      {(concert.posterImageUrl || concert.concertImageUrl) && (
        <img
          src={concert.posterImageUrl || concert.concertImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      {/* 상단 오버레이: 좌(목록) / 우(공유) 같은 줄 */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          {typeof onBack === "function" ? (
            <button type="button" onClick={onBack} className={btnClass} aria-label="목록으로">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          ) : null}
        </div>
        <div className="pointer-events-auto">
          {typeof onShare === "function" && (
            <button type="button" onClick={onShare} className={btnClass} aria-label="공유">
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          )}
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col justify-end p-10">
        <span className={`inline-block w-fit px-3 py-1 rounded-full text-sm font-medium text-white ${statusClass} mb-3`}>
          {statusLabel}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{concert.title}</h1>
        <p className="text-white/90 text-sm mt-1">{formatDateShort(concert.startDateTime)}</p>
      </div>
    </section>
  );
}
