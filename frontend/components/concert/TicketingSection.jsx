"use client";

import Link from "next/link";
import {
  getTicketStatus,
  formatUpcomingSaleDday,
  getSoonestSaleEnd,
  formatDateShort,
  getArtistNamesArray,
  formatArtists,
  getPrimaryMeta,
} from "@/lib/concertUtils";
import Surface from "@/components/ui/Surface";

export function TicketingSection({ concerts, status }) {
  const list = concerts || [];
  const filtered =
    status === "OPEN"
      ? list.filter((c) => getTicketStatus(c) === "OPEN").sort((a, b) => getSoonestSaleEnd(a) - getSoonestSaleEnd(b))
      : status === "UPCOMING"
        ? list.filter((c) => getTicketStatus(c) === "UPCOMING").sort((a, b) => new Date(a.saleStartDateTime) - new Date(b.saleStartDateTime))
        : [];

  const title = status === "OPEN" ? "예매중" : "예매 예정";
  if (filtered.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4 px-1">{title}</h2>
      <div className="space-y-3">
        {filtered.map((c) => {
          const saleDdayStr = formatUpcomingSaleDday(c);
          const id = c.concertId ?? c.id;
          const placeName = c.placeName ?? c.venueName;
          const imageUrl = c.concertImageUrl ?? c.posterImageUrl;
          return (
            <Link key={id} href={`/concerts/${id}`}>
              <Surface
                variant="primary"
                className="p-5 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-all"
              >
                <div className="flex gap-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-white truncate">{c.title}</h3>
                    {getArtistNamesArray(c).length > 0 && (
                      <p className="text-white/85 text-sm mt-1 truncate flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-violet-400/80 text-[1rem] shrink-0" aria-hidden>music_note</span>
                        <span>{formatArtists(getArtistNamesArray(c))}</span>
                      </p>
                    )}
                    <p className="text-white/55 text-xs mt-1">{getPrimaryMeta(c) || placeName}</p>
                    {status === "UPCOMING" && saleDdayStr != null && (
                      <span className="text-violet-400 font-medium text-sm mt-0.5">{saleDdayStr}</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-white/45 shrink-0">chevron_right</span>
                </div>
              </Surface>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
