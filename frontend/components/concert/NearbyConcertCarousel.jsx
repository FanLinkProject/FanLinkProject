"use client";

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

export function NearbyConcertCarousel({ concerts, userCoords }) {
  const list = concerts || [];
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

  if (sorted.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4 px-1">
        {userCoords ? "내 주변 공연" : "다가오는 공연"}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
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
