"use client";

import Link from "next/link";
import { formatDateShort, getArtistNamesArray, formatArtists, getPrimaryMeta } from "@/lib/concertUtils";

export function BottomSheetConcertList({ concerts, placeName, onClose }) {
  const list = Array.isArray(concerts) ? concerts : [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#16102a] border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[60vh] flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <h3 className="font-bold text-white">
          {placeName || "공연"} {list.length > 0 && `(${list.length})`}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/70"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-4 space-y-2">
        {list.length === 0 ? (
          <p className="text-white/55 text-sm py-4">해당 장소 공연이 없습니다.</p>
        ) : (
          list.map((c) => {
            const id = c.concertId ?? c.id;
            const subName = c.placeName ?? c.venueName;
            const imageUrl = c.concertImageUrl ?? c.posterImageUrl;
            return (
              <Link
                key={id}
                href={`/concerts/${id}`}
                className="block p-4 rounded-xl border border-white/10 hover:border-violet-500/30 bg-white/5 hover:bg-white/8 transition-all"
              >
                <div className="flex gap-3 items-center">
                  {imageUrl && (
                    <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-white truncate">{c.title}</p>
                    {getArtistNamesArray(c).length > 0 && (
                      <p className="text-white/85 text-sm mt-0.5 truncate flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-violet-400/80 text-[0.875rem] shrink-0" aria-hidden>music_note</span>
                        <span>{formatArtists(getArtistNamesArray(c))}</span>
                      </p>
                    )}
                    <p className="text-white/55 text-xs mt-0.5 truncate">{getPrimaryMeta(c) || subName}</p>
                  </div>
                  <span className="material-symbols-outlined text-white/45 shrink-0">chevron_right</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
