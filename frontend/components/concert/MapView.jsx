"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { loadKakaoMap } from "@/lib/kakaoMapLoader";
import { apiGet } from "@/lib/api";
import { groupByLocationId, REGION_CENTERS, REGION_OPTIONS_FOR_MAP } from "@/lib/concertUtils";
import { BottomSheetConcertList } from "./BottomSheetConcertList";

const DEBOUNCE_MS = 300;
const MY_LOCATION_ZOOM = 6;
const REGION_MAP_LEVEL = 10;

export function MapView({ initialCenter, onMapReady }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const myLocationMarkerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [placeGroups, setPlaceGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [regionId, setRegionId] = useState("ALL");
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const regionEffectRunRef = useRef(false);
  const initialLat = initialCenter?.lat ?? initialCenter?.latitude ?? REGION_CENTERS.ALL.lat;
  const initialLng = initialCenter?.lng ?? initialCenter?.longitude ?? REGION_CENTERS.ALL.lng;
  const lat = initialLat;
  const lng = initialLng;

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => {
      if (m?.marker) m.marker.setMap(null);
      if (m?.overlay) m.overlay.setMap(null);
    });
    markersRef.current = [];
  }, []);

  const fetchInBounds = useCallback((swLat, swLng, neLat, neLng) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    apiGet("/api/concerts/in-bounds", { query: { swLat, swLng, neLat, neLng }, signal: abortRef.current.signal })
      .then((data) => {
        const list = Array.isArray(data) ? data.filter(Boolean) : [];
        const groups = groupByLocationId(list);
        setPlaceGroups(groups);
        return groups;
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setPlaceGroups([]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        setError("");
        kakao.maps.load(() => {
          if (cancelled || !containerRef.current) return;
          const center = new kakao.maps.LatLng(lat, lng);
          const map = new kakao.maps.Map(containerRef.current, {
            center,
            level: 10,
          });
          mapRef.current = map;

          const triggerFetch = () => {
            const bounds = map.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            fetchInBounds(sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng());
          };

          const onIdle = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(triggerFetch, DEBOUNCE_MS);
          };

          kakao.maps.event.addListener(map, "idle", onIdle);
          triggerFetch();
          setLoading(false);
          setMapReady(true);
          onMapReady?.(true);
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "지도를 불러올 수 없습니다.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      clearMarkers();
    };
  }, [fetchInBounds, clearMarkers, lat, lng]);

  // 지역 선택 시 지도 중심 이동 + in-bounds 재조회 (사용자가 지역을 바꾼 경우에만)
  useEffect(() => {
    const map = mapRef.current;
    const kakao = typeof window !== "undefined" ? window.kakao : null;
    if (!map || !kakao?.maps || !mapReady) return;
    if (!regionEffectRunRef.current) {
      regionEffectRunRef.current = true;
      return;
    }
    const center = REGION_CENTERS[regionId] ?? REGION_CENTERS.ALL;
    kakao.maps.load(() => {
      const pos = new kakao.maps.LatLng(center.lat, center.lng);
      map.setCenter(pos);
      map.setLevel(REGION_MAP_LEVEL);
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      fetchInBounds(sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng());
    });
  }, [regionId, mapReady, fetchInBounds]);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined" || !window.kakao?.maps) return;
    clearMarkers();
    const kakao = window.kakao;
    kakao.maps.load(() => {
      const map = mapRef.current;
      if (!map || !kakao?.maps) return;
      placeGroups.forEach((group) => {
        const pos = new kakao.maps.LatLng(group.latitude, group.longitude);
        const marker = new kakao.maps.Marker({ position: pos, map });
        const count = group.concerts?.length ?? 0;
        const content = document.createElement("div");
        content.className = "bg-violet-600 text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-white shadow";
        content.textContent = count > 99 ? "99+" : String(count);
        content.style.cursor = "pointer";
        const overlay = new kakao.maps.CustomOverlay({
          position: pos,
          content,
          yAnchor: 0,
        });
        overlay.setMap(map);
        const openSheet = () => setSelectedGroup(group);
        kakao.maps.event.addListener(marker, "click", openSheet);
        content.addEventListener("click", openSheet);
        markersRef.current.push({ marker, overlay });
      });
    });
  }, [placeGroups, clearMarkers]);

  const handleMyLocation = useCallback(() => {
    const kakao = typeof window !== "undefined" ? window.kakao : null;
    if (!kakao?.maps || !mapRef.current) {
      setLocationError("지도를 먼저 불러와 주세요.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }
    setLocationError("");
    setLocationLoading(true);
    const isSecure = typeof window !== "undefined" && window.location?.protocol === "https:";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const cLat = pos.coords.latitude;
        const cLng = pos.coords.longitude;
        kakao.maps.load(() => {
          const map = mapRef.current;
          if (!map || !kakao?.maps) {
            setLocationLoading(false);
            return;
          }
          const position = new kakao.maps.LatLng(cLat, cLng);
          map.setCenter(position);
          map.setLevel(MY_LOCATION_ZOOM);
          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setMap(null);
            myLocationMarkerRef.current = null;
          }
          const marker = new kakao.maps.Marker({ position, map });
          const imageSize = new kakao.maps.Size(22, 22);
          const imageOption = { offset: new kakao.maps.Point(11, 11) };
          const blueDot = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/mini_circle_blue.png";
          const markerImage = new kakao.maps.MarkerImage(blueDot, imageSize, imageOption);
          marker.setImage(markerImage);
          myLocationMarkerRef.current = marker;
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          fetchInBounds(sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng());
        });
        setLocationError("");
        setLocationLoading(false);
      },
      (err) => {
        const msg =
          err.code === 1
            ? "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요."
            : err.code === 2
              ? "위치를 사용할 수 없습니다. 네트워크 또는 GPS를 확인해 주세요."
              : !isSecure
                ? "위치 기능은 HTTPS 환경에서 안정적으로 동작합니다. (localhost는 가능)"
                : "위치를 가져올 수 없습니다.";
        setLocationError(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchInBounds]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 bg-[#16102a] relative">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
            지도 로딩 중...
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-4 right-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm">
            {error}
          </div>
        )}
        {/* 지역 필터: 지도 뷰 전용, 좌측 상단 */}
        {mapReady && (
          <div className="absolute top-4 left-4 z-10">
            <label htmlFor="map-region-select" className="sr-only">
              지역 선택
            </label>
            <select
              id="map-region-select"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="rounded-xl bg-[#0f0a1e]/95 border border-white/10 text-white py-2 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 backdrop-blur"
            >
              {REGION_OPTIONS_FOR_MAP.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#16102a] text-white">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* 현재 위치 버튼: 지도 위 오른쪽 하단 플로팅, SDK 로드 후에만 */}
        {mapReady && (
          <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
            {locationError && (
              <div className="max-w-[240px] p-2 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-amber-200 text-xs">
                {locationError}
              </div>
            )}
            <button
              type="button"
              onClick={handleMyLocation}
              disabled={locationLoading}
              className="h-10 w-10 rounded-full bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              title="현재 위치로 이동"
              aria-label="현재 위치로 이동"
            >
              {locationLoading ? (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-xl">my_location</span>
              )}
            </button>
          </div>
        )}
      </div>
      {selectedGroup && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setSelectedGroup(null)}
            aria-hidden
          />
          <BottomSheetConcertList
            concerts={selectedGroup.concerts}
            placeName={selectedGroup.venueName}
            onClose={() => setSelectedGroup(null)}
          />
        </>
      )}
    </div>
  );
}
