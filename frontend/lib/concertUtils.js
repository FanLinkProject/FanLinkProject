/**
 * 공연 목록/상세 공통: 다가오는 공연 필터, 예매 상태, 검색, 거리 계산
 */

const NOW = () => new Date();

/** endDateTime > now 이면 다가오는 공연 (endDate 등 대체 필드 허용) */
export function isUpcoming(concert) {
  const endStr = concert?.endDateTime ?? concert?.endDate;
  if (!endStr) return false;
  const end = new Date(endStr);
  return !Number.isNaN(end.getTime()) && end > NOW();
}

/** 예매 상태: OPEN(예매중) | UPCOMING(예매 예정) | CLOSED(마감) */
export function getTicketStatus(concert) {
  const now = NOW();
  const presaleStart = concert?.presaleStartDateTime ? new Date(concert.presaleStartDateTime) : null;
  const presaleEnd = concert?.presaleEndDateTime ? new Date(concert.presaleEndDateTime) : null;
  const saleStart = concert?.saleStartDateTime ? new Date(concert.saleStartDateTime) : null;
  const saleEnd = concert?.saleEndDateTime ? new Date(concert.saleEndDateTime) : null;
  const inPresale = presaleStart && presaleEnd && now >= presaleStart && now <= presaleEnd;
  const inSale = saleStart && saleEnd && now >= saleStart && now <= saleEnd;
  if (inPresale || inSale) return "OPEN";
  if (saleStart && now < saleStart) return "UPCOMING";
  return "CLOSED";
}

/** D-day (날짜만 기준, 일반 예매 시작일까지) */
export function getDaysUntilSaleStart(concert) {
  const saleStart = concert?.saleStartDateTime ? new Date(concert.saleStartDateTime) : null;
  if (!saleStart) return null;
  const now = NOW();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(saleStart.getFullYear(), saleStart.getMonth(), saleStart.getDate());
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return diff < 0 ? null : diff;
}

/** D-day (날짜만 기준, 선예매 시작일까지). 이미 지났으면 null */
export function getDaysUntilPresaleStart(concert) {
  const presaleStart = concert?.presaleStartDateTime ? new Date(concert.presaleStartDateTime) : null;
  if (!presaleStart) return null;
  const now = NOW();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(presaleStart.getFullYear(), presaleStart.getMonth(), presaleStart.getDate());
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return diff < 0 ? null : diff;
}

/** 선예매 기간이 아직 안 끝났는지 (현재 시각이 선예매 종료 전인지) */
export function isPresalePeriodNotEnded(concert) {
  const presaleEnd = concert?.presaleEndDateTime ? new Date(concert.presaleEndDateTime) : null;
  if (!presaleEnd) return false;
  return NOW() < presaleEnd;
}

/** 현재 예매 기간에 맞는 티켓 상품 반환. 선예매 기간이면 선예매 상품, 일반 기간이면 일반 상품. 없으면 null */
export function getEligibleTicketProduct(concert, products) {
  if (!concert || !Array.isArray(products) || products.length === 0) return null;
  const now = NOW();
  const presaleStart = concert?.presaleStartDateTime ? new Date(concert.presaleStartDateTime) : null;
  const presaleEnd = concert?.presaleEndDateTime ? new Date(concert.presaleEndDateTime) : null;
  const saleStart = concert?.saleStartDateTime ? new Date(concert.saleStartDateTime) : null;
  const saleEnd = concert?.saleEndDateTime ? new Date(concert.saleEndDateTime) : null;
  const inPresale = presaleStart && presaleEnd && now >= presaleStart && now <= presaleEnd;
  const inSale = saleStart && saleEnd && now >= saleStart && now <= saleEnd;
  if (inPresale) {
    return products.find((p) => p.isMembershipOnly === true || (p.name && p.name.includes("선예매"))) ?? null;
  }
  if (inSale) {
    return products.find((p) => p.isMembershipOnly === false && p.concertId != null) ?? products.find((p) => p.name && p.name.includes("일반")) ?? null;
  }
  return null;
}

/** 예매 예정(UPCOMING)일 때 표시용 문자열: "선예매 D-3", "일반 예매 D-3", "선예매 D-Day", "일반 예매 D-Day", null */
export function formatUpcomingSaleDday(concert) {
  const presaleD = getDaysUntilPresaleStart(concert);
  const saleD = getDaysUntilSaleStart(concert);
  const presaleNotEnded = isPresalePeriodNotEnded(concert);
  if (presaleNotEnded && presaleD != null) {
    return presaleD === 0 ? "선예매 D-Day" : `선예매 D-${presaleD}`;
  }
  if (saleD != null) {
    return saleD === 0 ? "일반 예매 D-Day" : `일반 예매 D-${saleD}`;
  }
  return null;
}

/** D-day (날짜만 기준, 공연 시작일까지). 이미 지난 공연이면 null, 당일이면 0(D-Day) */
export function getDaysUntilConcertStart(concert) {
  const start = concert?.startDateTime ? new Date(concert.startDateTime) : null;
  if (!start) return null;
  const now = NOW();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return diff < 0 ? null : diff;
}

/** 공연 D-day 표시 문자열: "D-3", "D-Day"(당일), null */
export function formatConcertDday(concert) {
  const d = getDaysUntilConcertStart(concert);
  if (d == null) return null;
  return d === 0 ? "D-Day" : `D-${d}`;
}

/**
 * startDateTime 기준 D-Day 라벨 (날짜만, 로컬 기준).
 * 오늘: "D-DAY", 미래: "D-N", 과거: "D+N"
 * @param {string|Date} startDateTimeISO - ISO 문자열 또는 Date
 * @returns {string}
 */
export function getDDayLabel(startDateTimeISO) {
  if (startDateTimeISO == null) return "";
  const start = typeof startDateTimeISO === "object" ? startDateTimeISO : new Date(startDateTimeISO);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

/** 공연 상태 키 (우선순위 높은 순) */
export const CONCERT_STATUS_KEYS = {
  LIVE: "LIVE",           // 공연중
  ENDED: "ENDED",         // 공연종료
  SALE: "SALE",           // 예매중
  PRESALE: "PRESALE",     // 선예매중
  SALE_UPCOMING: "SALE_UPCOMING", // 예매예정
  UPCOMING: "UPCOMING",   // 예정
};

/**
 * 공연 상태 계산 (now 기준). 우선순위: 공연중 > 공연종료 > 예매중 > 선예매중 > 예매예정 > 예정
 * @param {object} concert - startDateTime, endDateTime, presaleStartDateTime, presaleEndDateTime, saleStartDateTime, saleEndDateTime
 * @param {Date} [now] - 기준 시각 (기본값: 현재)
 * @returns {{ key: string, label: string, priority: number }}
 */
export function getConcertStatus(concert, now = new Date()) {
  const toDate = (v) => (v == null ? null : new Date(v));
  const start = toDate(concert?.startDateTime ?? concert?.startDate);
  const end = toDate(concert?.endDateTime ?? concert?.endDate);
  const presaleStart = toDate(concert?.presaleStartDateTime);
  const presaleEnd = toDate(concert?.presaleEndDateTime);
  const saleStart = toDate(concert?.saleStartDateTime);
  const saleEnd = toDate(concert?.saleEndDateTime);
  const t = now.getTime();

  const inRange = (from, to) => from != null && to != null && t >= from.getTime() && t <= to.getTime();
  const before = (date) => date != null && t < date.getTime();
  const after = (date) => date != null && t > date.getTime();

  // 1) 공연중: start <= now <= end (end 없으면 공연중 생략)
  if (start != null && end != null && t >= start.getTime() && t <= end.getTime()) {
    return { key: CONCERT_STATUS_KEYS.LIVE, label: "공연중", priority: 6 };
  }

  // 2) 공연종료: now > endDateTime (없으면 startDateTime 지나면 종료)
  const effectiveEnd = end ?? start;
  if (effectiveEnd != null && t > effectiveEnd.getTime()) {
    return { key: CONCERT_STATUS_KEYS.ENDED, label: "공연종료", priority: 5 };
  }

  // 3) 예매중
  if (inRange(saleStart, saleEnd)) {
    return { key: CONCERT_STATUS_KEYS.SALE, label: "예매중", priority: 4 };
  }

  // 4) 선예매중
  if (inRange(presaleStart, presaleEnd)) {
    return { key: CONCERT_STATUS_KEYS.PRESALE, label: "선예매중", priority: 3 };
  }

  // 5) 예매예정: now < saleStart (saleStart 존재 시)
  if (saleStart != null && before(saleStart)) {
    return { key: CONCERT_STATUS_KEYS.SALE_UPCOMING, label: "예매예정", priority: 2 };
  }

  // 6) 예정: now < startDateTime
  if (start != null && before(start)) {
    return { key: CONCERT_STATUS_KEYS.UPCOMING, label: "예정", priority: 1 };
  }

  return { key: "UNKNOWN", label: "예정", priority: 0 };
}

/**
 * 상태 배지용 라벨: "상태 · 공연 D-n" 형태. 공연 종료면 D-Day 없음.
 * 예: "예매중 · 공연 D-6", "예매 마감 · 공연 D-6", "공연종료", "예정 · 공연 D-12"
 * @param {object} concert
 * @param {Date} [now]
 * @returns {string}
 */
export function getConcertStatusBadgeLabel(concert, now = new Date()) {
  const status = getConcertStatus(concert, now);
  if (status.key === CONCERT_STATUS_KEYS.ENDED) return "공연종료";
  if (status.key === CONCERT_STATUS_KEYS.LIVE) return "공연중";

  const d = getDaysUntilConcertStart(concert);
  const suffix = d == null ? "" : d === 0 ? " · 공연 D-DAY" : ` · 공연 D-${d}`;

  if (status.key === CONCERT_STATUS_KEYS.SALE) return "예매중" + suffix;
  if (status.key === CONCERT_STATUS_KEYS.PRESALE) return "선예매중" + suffix;
  if (status.key === CONCERT_STATUS_KEYS.SALE_UPCOMING) return "예매예정" + suffix;
  if (status.key === CONCERT_STATUS_KEYS.UPCOMING) {
    const ticketStatus = getTicketStatus(concert);
    const base = ticketStatus === "CLOSED" ? "예매 마감" : "예정";
    return base + suffix;
  }
  return "예정" + suffix;
}

/** 공연이 끝났는지 (endDateTime < now) */
export function isConcertEnded(concert) {
  const endStr = concert?.endDateTime ?? concert?.endDate;
  if (!endStr) return true;
  const end = new Date(endStr);
  return !Number.isNaN(end.getTime()) && end <= NOW();
}

/** D-day (날짜만 기준, 공연 종료일까지). 이미 지났으면 null, 당일이면 0 */
export function getDaysUntilConcertEnd(concert) {
  const endStr = concert?.endDateTime ?? concert?.endDate;
  if (!endStr) return null;
  const end = new Date(endStr);
  const now = NOW();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return diff < 0 ? null : diff;
}

/** 예매 마감(CLOSED)일 때 표시: "공연 마감" | "예매 마감 · 공연 D-n" */
export function formatClosedLabel(concert) {
  if (isConcertEnded(concert)) return "공연 마감";
  const d = getDaysUntilConcertEnd(concert);
  if (d != null) return d === 0 ? "예매 마감 · 공연 D-Day" : `예매 마감 · 공연 D-${d}`;
  return "예매 마감";
}

/** 선예매 종료까지 남은 시간이 적은 순 정렬용 (예매중 종료 임박) */
export function getSoonestSaleEnd(concert) {
  const now = NOW().getTime();
  const presaleEnd = concert?.presaleEndDateTime ? new Date(concert.presaleEndDateTime).getTime() : Infinity;
  const saleEnd = concert?.saleEndDateTime ? new Date(concert.saleEndDateTime).getTime() : Infinity;
  if (presaleEnd > now && presaleEnd <= saleEnd) return presaleEnd;
  if (saleEnd > now) return saleEnd;
  return Infinity;
}

/** 아티스트 이름 문자열 (검색/표시용). 목록 DTO(artistNames) 또는 상세 DTO(artists) 지원 */
export function getArtistNames(concert) {
  if (Array.isArray(concert?.artistNames) && concert.artistNames.length > 0) {
    return concert.artistNames.filter(Boolean).join(" ");
  }
  const list = concert?.artists;
  if (!Array.isArray(list) || list.length === 0) return "";
  return list.map((a) => a?.nickname || a?.name || "").filter(Boolean).join(" ");
}

/** 카드/리스트 표시용: 최대 2명까지 "루나 · 리오", 나머지 "+N" */
export function formatArtistNamesForDisplay(artistNames, maxCount = 2) {
  const list = Array.isArray(artistNames) ? artistNames.filter(Boolean) : [];
  if (list.length === 0) return "";
  if (list.length <= maxCount) return list.join(" · ");
  return list.slice(0, maxCount).join(" · ") + " +" + (list.length - maxCount);
}

/** formatArtistNamesForDisplay와 동일(요청 alias). max 기본 2 */
export function formatArtists(artistNames, max = 2) {
  return formatArtistNamesForDisplay(artistNames, max);
}

/** 목록/상세 공통: concert에서 아티스트 이름 배열 추출 (artistNames 또는 artists) */
export function getArtistNamesArray(concert) {
  if (Array.isArray(concert?.artistNames) && concert.artistNames.length > 0) {
    return concert.artistNames.filter(Boolean);
  }
  const list = concert?.artists;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((a) => a?.nickname || a?.name || "").filter(Boolean);
}

/** 카드 메타 라인: "장소명 · 날짜" */
export function getPrimaryMeta(concert) {
  const place = (concert?.placeName ?? concert?.venueName ?? "").trim();
  const date = formatDateShort(concert?.startDateTime) || "";
  if (!place && !date) return "";
  if (!place) return date;
  if (!date) return place;
  return `${place} · ${date}`;
}

/** 검색: title, venueName, location.fullAddress, artists 포함 검색 */
export function searchConcerts(concerts, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return concerts;
  return concerts.filter((c) => {
    const title = (c.title || "").toLowerCase();
    const venue = (c.placeName || c.venueName || "").toLowerCase();
    const address = (c.fullAddress || c.location?.fullAddress || "").toLowerCase();
    const artists = getArtistNames(c).toLowerCase();
    return title.includes(q) || venue.includes(q) || address.includes(q) || artists.includes(q);
  });
}

/** Haversine 거리(km) */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** locationId 기준 그룹핑: { locationId, latitude, longitude, venueName/placeName, concerts: [] } */
export function groupByLocationId(concerts) {
  const map = new Map();
  for (const c of concerts) {
    const lid = c.locationId ?? `lat${c.latitude}_lng${c.longitude}`;
    if (!map.has(lid)) {
      map.set(lid, {
        locationId: c.locationId,
        latitude: c.latitude,
        longitude: c.longitude,
        venueName: c.placeName ?? c.venueName,
        concerts: [],
      });
    }
    map.get(lid).concerts.push(c);
  }
  return Array.from(map.values());
}

export function formatDateTime(instantStr) {
  if (!instantStr) return "-";
  return new Date(instantStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(instantStr) {
  if (!instantStr) return "-";
  return new Date(instantStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

/** 지도 뷰 지역 중심 좌표 (프론트 상수) */
export const REGION_CENTERS = {
  ALL: { lat: 37.5665, lng: 126.978 },
  SEOUL: { lat: 37.5665, lng: 126.978 },
  BUSAN: { lat: 35.1796, lng: 129.0756 },
  DAEGU: { lat: 35.8714, lng: 128.6014 },
  INCHEON: { lat: 37.4563, lng: 126.7052 },
  GWANGJU: { lat: 35.1595, lng: 126.8526 },
  DAEJEON: { lat: 36.3504, lng: 127.3845 },
  ULSAN: { lat: 35.5384, lng: 129.3114 },
  JEJU: { lat: 33.4996, lng: 126.5312 },
};

/** 지도 지역 셀렉트용 옵션 (id = REGION_CENTERS 키) */
export const REGION_OPTIONS_FOR_MAP = [
  { id: "ALL", label: "전체" },
  { id: "SEOUL", label: "서울" },
  { id: "BUSAN", label: "부산" },
  { id: "DAEGU", label: "대구" },
  { id: "INCHEON", label: "인천" },
  { id: "GWANGJU", label: "광주" },
  { id: "DAEJEON", label: "대전" },
  { id: "ULSAN", label: "울산" },
  { id: "JEJU", label: "제주" },
];

/** 지역 필터 옵션: id, label, lat, lng(지도 이동용), keyword(목록 필터용) */
export const REGION_OPTIONS = [
  { id: "all", label: "전체", keyword: null },
  { id: "seoul", label: "서울", lat: 37.5665, lng: 126.978, keyword: "서울" },
  { id: "busan", label: "부산", lat: 35.1796, lng: 129.0756, keyword: "부산" },
  { id: "daegu", label: "대구", lat: 35.8714, lng: 128.6014, keyword: "대구" },
  { id: "incheon", label: "인천", lat: 37.4563, lng: 126.7052, keyword: "인천" },
  { id: "gwangju", label: "광주", lat: 35.1595, lng: 126.8526, keyword: "광주" },
  { id: "daejeon", label: "대전", lat: 36.3504, lng: 127.3845, keyword: "대전" },
  { id: "ulsan", label: "울산", lat: 35.5384, lng: 129.3114, keyword: "울산" },
  { id: "sejong", label: "세종", lat: 36.4801, lng: 127.289, keyword: "세종" },
  { id: "gyeonggi", label: "경기", lat: 37.4138, lng: 127.5183, keyword: "경기" },
];

/** 지역 선택 시 목록 필터: placeName 또는 fullAddress에 keyword 포함 */
export function filterConcertsByRegion(concerts, regionId) {
  if (!regionId || regionId === "all") return concerts;
  const region = REGION_OPTIONS.find((r) => r.id === regionId);
  if (!region?.keyword) return concerts;
  const k = region.keyword.toLowerCase();
  return concerts.filter((c) => {
    const place = (c.placeName ?? "").toLowerCase();
    const addr = (c.fullAddress ?? "").toLowerCase();
    return place.includes(k) || addr.includes(k);
  });
}

/** 지역 id → 지도 중심 좌표 { lat, lng }. 전체면 null */
export function getRegionCenter(regionId) {
  if (!regionId || regionId === "all") return null;
  const region = REGION_OPTIONS.find((r) => r.id === regionId);
  return region?.lat != null && region?.lng != null ? { lat: region.lat, lng: region.lng } : null;
}

/** 아티스트 이름 normalize: trim, 공백 정규화, 소문자 (매칭용) */
export function normalizeArtistName(name) {
  if (name == null || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** concert.artistNames에 해당 아티스트 이름이 포함되는지 (normalize 비교) */
export function concertIncludesArtist(concert, artistDisplayName) {
  const normalized = normalizeArtistName(artistDisplayName);
  if (!normalized) return false;
  const list = getArtistNamesArray(concert);
  return list.some((n) => normalizeArtistName(n) === normalized || normalizeArtistName(n).includes(normalized) || normalized.includes(normalizeArtistName(n)));
}
