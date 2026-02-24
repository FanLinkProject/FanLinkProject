"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  getTicketStatus,
  formatUpcomingSaleDday,
  formatClosedLabel,
  haversineKm,
  formatDateShort,
  getArtistNamesArray,
  formatArtists,
  getPrimaryMeta,
} from "@/lib/concertUtils";

const CARD_WIDTH = 280;
const GAP = 16;

export function NearbyConcertCarousel({ concerts, userCoords }) {
  const list = concerts || [];
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sorted = [...list].sort((a, b) => {
    if (userCoords?.latitude != null && userCoords?.longitude != null) {
      const latA = a.latitude ?? 0;
      const lngA = a.longitude ?? 0;
      const latB = b.latitude ?? 0;
      const lngB = b.longitude ?? 0;
      const distA = haversineKm(userCoords.latitude, userCoords.longitude, latA, lngA);
      const distB = haversineKm(userCoords.latitude, userCoords.longitude, latB, lngB);
      return distA - distB;
    }
    return new Date(a.startDateTime) - new Date(b.startDateTime);
  });

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollState); ro.disconnect(); };
  }, [updateScrollState, sorted.length]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = (CARD_WIDTH + GAP) * 2;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  if (sorted.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-bold text-white">
          {userCoords ? "내 주변 공연" : "다가오는 공연"}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="size-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/[0.12] hover:text-white transition-all disabled:opacity-25 disabled:cursor-default"
            aria-label="이전"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="size-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/[0.12] hover:text-white transition-all disabled:opacity-25 disabled:cursor-default"
            aria-label="다음"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sorted.slice(0, 12).map((c) => {
          const status = getTicketStatus(c);
          const saleDdayStr = formatUpcomingSaleDday(c);
          const dist =
            userCoords && c.latitude != null && c.longitude != null
              ? haversineKm(userCoords.latitude, userCoords.longitude, c.latitude, c.longitude).toFixed(1)
              : null;
          const id = c.concertId ?? c.id;
          const placeName = c.placeName ?? c.venueName;
          const imageUrl = c.concertImageUrl ?? c.posterImageUrl;
          return (
            <Link
              key={id}
              href={`/concerts/${id}`}
              className="flex-shrink-0 w-[280px] rounded-2xl border border-white/10 bg-white/5 hover:border-violet-500/40 hover:bg-white/[0.08] transition-all overflow-hidden"
            >
              <div className="aspect-[4/3] bg-white/5 relative">
                {imageUrl && (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      status === "OPEN"
                        ? "bg-emerald-500/90 text-white"
                        : status === "UPCOMING"
                          ? "bg-amber-500/90 text-white"
                          : "bg-white/20 text-white/90"
                    }`}
                  >
                    {status === "OPEN" ? "예매중" : status === "UPCOMING" ? (saleDdayStr ?? "예매 예정") : formatClosedLabel(c)}
                  </span>
                </div>
              </div>
              <div className="p-5 text-left min-w-0">
                <h3 className="font-semibold text-white truncate">{c.title}</h3>
                {getArtistNamesArray(c).length > 0 && (
                  <p className="text-white/85 text-sm mt-1 truncate flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-violet-400/80 text-[1rem] shrink-0" aria-hidden>music_note</span>
                    <span>{formatArtists(getArtistNamesArray(c))}</span>
                  </p>
                )}
                <p className="text-white/55 text-xs mt-1 truncate">{getPrimaryMeta(c) || placeName}</p>
                {dist != null && <p className="text-violet-400/90 text-xs mt-1">{dist}km</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
