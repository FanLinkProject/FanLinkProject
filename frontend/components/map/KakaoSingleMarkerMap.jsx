"use client";

import { useRef, useEffect, useState } from "react";
import { loadKakaoMap } from "@/lib/kakaoMapLoader";

/**
 * 단일 좌표 마커 지도 (콘서트 상세 등).
 * location: { latitude, longitude, placeName?, fullAddress? }
 * hideAddress: true면 장소명/주소 텍스트 미표시 (상위에서 표시할 때)
 */
export function KakaoSingleMarkerMap({ location, className = "", hideAddress = false }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location?.latitude == null || location?.longitude == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError("");
    setLoading(true);
    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        kakao.maps.load(() => {
          if (cancelled || !containerRef.current) return;
          const pos = new kakao.maps.LatLng(
            Number(location.latitude),
            Number(location.longitude)
          );
          const map = new kakao.maps.Map(containerRef.current, {
            center: pos,
            level: 3,
          });
          new kakao.maps.Marker({ position: pos, map });
          setLoading(false);
        });
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "지도를 불러올 수 없습니다.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [location?.latitude, location?.longitude]);

  if (location?.latitude == null || location?.longitude == null) {
    return (
      <div
        className={`rounded-xl border border-white/[0.08] bg-white/5 flex items-center justify-center text-white/45 text-sm ${className}`}
        style={{ minHeight: 200 }}
      >
        위치 정보가 없습니다.
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-200 text-sm ${className}`}
        style={{ minHeight: 200 }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className={`h-full w-full ${className}`.trim()}>
      {!hideAddress && (location.placeName || location.fullAddress) && (
        <div className="mb-2 text-sm text-white/80">
          {location.placeName && (
            <p className="font-medium text-white">{location.placeName}</p>
          )}
          {location.fullAddress && (
            <p className="text-white/55">{location.fullAddress}</p>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[200px] rounded-xl overflow-hidden border border-white/10 bg-[#16102a]"
      />
      {loading && (
        <div
          className="flex items-center justify-center text-white/45 text-sm rounded-xl border border-white/[0.08]"
          style={{ minHeight: 200 }}
        >
          지도 로딩 중...
        </div>
      )}
    </div>
  );
}
