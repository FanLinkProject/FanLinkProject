"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { loadKakaoMap } from "@/lib/kakaoMapLoader";

export function KakaoPlacePicker({
  onPicked,
  initialValue = null,
  disabled = false,
}) {
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [places, setPlaces] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMap()
      .then(() => {
        if (!cancelled) setSdkReady(true);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e?.message || "카카오맵 로드 실패");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const initMap = useCallback(
    (kakao, lat, lng) => {
      if (!mapContainerRef.current || !kakao?.maps) return;
      const pos = new kakao.maps.LatLng(lat ?? 37.5665, lng ?? 126.978);
      const opts = {
        center: pos,
        level: 3,
      };
      const map = new kakao.maps.Map(mapContainerRef.current, opts);
      mapRef.current = map;
      const marker = new kakao.maps.Marker({ position: pos, map });
      markerRef.current = marker;
    },
    []
  );

  useEffect(() => {
    if (!sdkReady || typeof window === "undefined" || !window.kakao?.maps)
      return;
    window.kakao.maps.load(() => {
      const lat =
        initialValue?.latitude ??
        selectedPlace?.latitude ??
        37.5665;
      const lng =
        initialValue?.longitude ??
        selectedPlace?.longitude ??
        126.978;
      initMap(window.kakao, lat, lng);
    });
  }, [sdkReady, initMap]);

  const moveMapAndMarker = useCallback((lat, lng) => {
    if (!mapRef.current || !markerRef.current || !window.kakao?.maps) return;
    const pos = new window.kakao.maps.LatLng(lat, lng);
    mapRef.current.setCenter(pos);
    markerRef.current.setPosition(pos);
  }, []);

  const handleSearch = useCallback(
    (e) => {
      e?.preventDefault();
      const q = keyword?.trim();
      if (!q || !sdkReady || disabled) return;
      setSearching(true);
      setSearchError("");
      setPlaces([]);
      window.kakao.maps.load(() => {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(q, (data, status, pagination) => {
          setSearching(false);
          if (status === window.kakao.maps.services.Status.OK) {
            setPlaces(data || []);
            setSearchError("");
          } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
            setPlaces([]);
            setSearchError("검색 결과가 없습니다.");
          } else {
            setPlaces([]);
            setSearchError("검색에 실패했습니다.");
          }
        });
      });
    },
    [keyword, sdkReady, disabled]
  );

  const selectPlace = useCallback(
    (place) => {
      if (disabled) return;
      const lat = Number(place.y);
      const lng = Number(place.x);
      const placeId = place.id ?? "";
      const placeName = place.place_name ?? "";
      const fullAddress =
        place.road_address_name?.trim() || place.address_name?.trim() || "";

      moveMapAndMarker(lat, lng);
      const payload = {
        provider: "KAKAO",
        placeId: placeId || null,
        placeName: placeName || null,
        fullAddress: fullAddress || " ",
        latitude: lat,
        longitude: lng,
      };
      setSelectedPlace(payload);
      onPicked?.(payload);
    },
    [disabled, moveMapAndMarker, onPicked]
  );

  const resetPick = useCallback(() => {
    setSelectedPlace(null);
    setPlaces([]);
    onPicked?.(null);
  }, [onPicked]);

  if (loadError) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
        {loadError}
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/55 text-sm">
        지도 로딩 중...
      </div>
    );
  }

  const displayPlace = selectedPlace || initialValue;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
          placeholder="장소 검색 (예: 올림픽공원)"
          disabled={disabled}
          className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={disabled || searching}
          className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50"
        >
          {searching ? "검색 중..." : "검색"}
        </button>
      </div>

      {searchError && (
        <p className="text-amber-200 text-sm text-left">{searchError}</p>
      )}

      {/* 2열: 검색 결과(좌) + 지도(우), md 이상에서 항상 나란히 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="flex flex-col min-w-0 w-full">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 text-left">
            검색 결과
          </p>
          <ul className="min-h-[260px] max-h-[260px] overflow-y-auto rounded-xl border border-white/[0.08] divide-y divide-white/[0.06] text-left bg-[#16102a]/50">
            {places.length === 0 && !searching && (
              <li className="p-4 text-white/45 text-sm text-left">
                검색어를 입력한 뒤 검색하면 결과가 여기에 표시됩니다.
              </li>
            )}
            {places.map((place) => {
              const name = place.place_name ?? "";
              const addr = place.road_address_name || place.address_name || "";
              const isSelected =
                selectedPlace &&
                String(place.id || "") === String(selectedPlace.placeId || "") &&
                (place.place_name ?? "") === (selectedPlace.placeName ?? "");
              return (
                <li key={place.id || name + addr} className="text-left">
                  <button
                    type="button"
                    onClick={() => selectPlace(place)}
                    disabled={disabled}
                    className={`w-full text-left p-3 text-white text-sm disabled:opacity-50 flex flex-col items-start justify-start transition-colors rounded-lg ${
                      isSelected
                        ? "bg-violet-500/20 ring-2 ring-violet-500/50 border border-violet-500/30"
                        : "hover:bg-white/10 active:bg-white/15"
                    }`}
                  >
                    <span className="font-semibold block w-full text-left text-white">{name}</span>
                    {addr && (
                      <span className="text-white/55 text-xs block w-full truncate text-left mt-0.5">
                        {addr}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col min-w-0 w-full">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 text-left">
            지도
          </p>
          <div className="min-h-[260px] h-[260px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#16102a] shrink-0">
            <div ref={mapContainerRef} className="w-full h-full min-h-[260px]" />
          </div>
        </div>
      </div>

      {displayPlace && (
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 text-left">
            선택된 장소
          </p>
          <p className="text-white font-semibold text-left">
            {displayPlace.placeName ?? "-"}
          </p>
          <p className="text-white/55 text-sm mt-1 text-left">
            {displayPlace.fullAddress ?? "-"}
          </p>
          {initialValue?.locationId != null && !selectedPlace ? (
            <p className="text-white/45 text-xs mt-1 text-left">위치 ID: {initialValue.locationId}</p>
          ) : selectedPlace ? (
            <p className="text-white/45 text-xs mt-1 text-left">등록 시 저장됩니다.</p>
          ) : null}
          <button
            type="button"
            onClick={resetPick}
            disabled={disabled}
            className="mt-3 text-violet-400 hover:text-violet-300 text-sm font-medium"
          >
            다시 선택
          </button>
        </div>
      )}
    </div>
  );
}
