"use client";

import Link from "next/link";

/** 아티스트 프로필 이미지 URL: 여러 필드 안전 탐색 후 fallback */
function getArtistImageUrl(artist) {
  if (!artist) return null;
  const url =
    artist.profileImageUrl ??
    artist.avatarUrl ??
    artist.profileImage ??
    artist.imageUrl ??
    (typeof artist.image === "string" ? artist.image : null);
  return url && typeof url === "string" ? url.trim() : null;
}

export function ConcertArtistList({ artists }) {
  const list = Array.isArray(artists) ? artists : [];
  if (list.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold text-white/90 mb-4 px-1">출연 아티스트</h2>
      <div className="flex gap-6 overflow-x-auto pb-2">
        {list.map((a) => {
          const imageUrl = getArtistImageUrl(a);
          const displayName = a?.nickname ?? a?.name ?? "아티스트";
          const href = `/artists/${a.slug ?? a.id}`;

          return (
            <Link
              key={a.id}
              href={href}
              className="flex-shrink-0 flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/10 bg-white/[0.04] hover:border-violet-500/40 hover:bg-white/[0.06] transition-all"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-white/10 flex-shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-full border border-white/10"
                    sizes="80px"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span
                  className={`material-symbols-outlined text-white/40 text-4xl w-full h-full flex items-center justify-center ${imageUrl ? "hidden" : ""}`}
                  aria-hidden
                >
                  person
                </span>
              </div>
              <p className="text-sm text-white/80 font-medium truncate max-w-[140px] text-center">
                {displayName}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
