"use client";

import { KakaoSingleMarkerMap } from "@/components/map/KakaoSingleMarkerMap";
import Button from "@/components/ui/Button";

/**
 * 장소 정보 단일 블록 (Hero에는 장소 미표시, 여기서만 표시)
 * location: { latitude, longitude, placeName?, fullAddress? }
 */
export function LocationSection({ location, venueNameFallback, mapModeUrl }) {
  const placeName = location?.placeName ?? venueNameFallback ?? "장소";
  const hasCoords = location?.latitude != null && location?.longitude != null;
  const kakaoMapUrl = hasCoords
    ? `https://map.kakao.com/link/map/${encodeURIComponent(placeName)},${location.latitude},${location.longitude}`
    : null;

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.04] p-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/55 mb-3">장소</h2>
      <p className="text-white font-semibold">{placeName}</p>
      {location?.fullAddress && (
        <p className="text-white/60 text-sm mt-1">{location.fullAddress}</p>
      )}
      {hasCoords && (
        <div className="mt-4 h-64 rounded-2xl overflow-hidden border border-white/10">
          <KakaoSingleMarkerMap location={location} className="h-full w-full" hideAddress />
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-4">
        {kakaoMapUrl && (
          <a
            href={kakaoMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10"
          >
            <span className="material-symbols-outlined text-lg">directions</span>
            길찾기
          </a>
        )}
        {mapModeUrl && (
          <Button variant="ghost" href={mapModeUrl} className="text-violet-400 hover:text-violet-300">
            <span className="material-symbols-outlined text-lg mr-1">map</span>
            주변 공연 보기
          </Button>
        )}
      </div>
    </section>
  );
}
