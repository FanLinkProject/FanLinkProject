"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

import { BASE_URL } from "@/lib/api";
const CONCERTS_API = `${BASE_URL}/api/concerts`;
const USER_PROFILE_API = `${BASE_URL}/api/user/profile`;

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const bearer = token && (token.startsWith("Bearer ") ? token : `Bearer ${token.trim()}`);
  return {
    "Content-Type": "application/json",
    ...(bearer && { Authorization: bearer }),
  };
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function toLocalDateTime(instantStr) {
  if (!instantStr) return "";
  const d = new Date(instantStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function EditConcertPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [userId, setUserId] = useState(null);

  // JWT에는 userId가 없고 subject가 이메일이므로, 프로필 API로 현재 사용자 ID 조회
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    axios
      .get(USER_PROFILE_API, { headers: getAuthHeaders() })
      .then((res) => {
        if (res?.data?.id != null) setUserId(Number(res.data.id));
      })
      .catch(() => {});
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [venueName, setVenueName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [posterMediaAssetId, setPosterMediaAssetId] = useState("");
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [presaleTicketCount, setPresaleTicketCount] = useState("");
  const [saleTicketCount, setSaleTicketCount] = useState("");
  const [presaleStartDateTime, setPresaleStartDateTime] = useState("");
  const [presaleEndDateTime, setPresaleEndDateTime] = useState("");
  const [saleStartDateTime, setSaleStartDateTime] = useState("");
  const [saleEndDateTime, setSaleEndDateTime] = useState("");
  const [initialized, setInitialized] = useState(false);
  // select-artists에서 돌아올 때 추가한 아티스트 (마운트 직후 한 번만 읽어서 fetch 완료 시 병합에 사용)
  const pendingAddedArtistsRef = useRef(null);
  // searchParams effect에서 이미 병합했으면 fetch 완료 시 selectedArtists 덮어쓰지 않음
  const mergedInSearchParamsRef = useRef(false);
  // Strict Mode 등으로 fetch가 두 번 완료될 때, 이미 저장 목록(concertEditSelectedArtists) 적용했으면 API로 덮어쓰지 않음
  const appliedSavedArtistsRef = useRef(false);

  // 마운트 시 sessionStorage에 추가 아티스트가 있으면 ref에 보관 (fetch 완료 후 병합)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("concertAddArtists");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        pendingAddedArtistsRef.current = parsed;
      }
    } catch (_) {}
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchConcert = async () => {
      try {
        setFetchError("");
        const res = await axios.get(`${CONCERTS_API}/${id}`, { headers: getAuthHeaders() });
        const c = res.data;
        setTitle(c.title ?? "");
        setDescription(c.description ?? "");
        setStartDateTime(toLocalDateTime(c.startDateTime));
        setEndDateTime(toLocalDateTime(c.endDateTime));
        setTimezone(c.timezone ?? "Asia/Seoul");
        setVenueName(c.venueName ?? "");
        setLocationId(c.location?.id != null ? String(c.location.id) : "");
        setPosterMediaAssetId("");
        let baseArtists = Array.isArray(c.artists)
          ? c.artists.map((a) => ({ id: a.id, nickname: a.nickname ?? "", profileImageUrl: null }))
          : [];
        let usedSavedArtists = false;
        try {
          const savedRaw = sessionStorage.getItem("concertEditSelectedArtists");
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (Array.isArray(saved) && saved.length >= 0) {
              baseArtists = saved.map((a) => ({ id: a.id, nickname: a.nickname ?? "", profileImageUrl: a.profileImageUrl ?? null }));
              sessionStorage.removeItem("concertEditSelectedArtists");
              usedSavedArtists = true;
            }
          }
        } catch (_) {}
        let artistsToSet = baseArtists;
        let added = pendingAddedArtistsRef.current;
        if (!added || !Array.isArray(added) || added.length === 0) {
          try {
            const raw = sessionStorage.getItem("concertAddArtists");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) added = parsed;
            }
          } catch (_) {}
        }
        if (Array.isArray(added) && added.length > 0) {
          const byId = new Map(baseArtists.map((a) => [a.id, a]));
          added.forEach((a) => byId.set(a.id, { id: a.id, nickname: a.nickname ?? "", profileImageUrl: a.profileImageUrl ?? null }));
          artistsToSet = Array.from(byId.values());
          pendingAddedArtistsRef.current = null;
        }
        if (!mergedInSearchParamsRef.current && !appliedSavedArtistsRef.current) {
          setSelectedArtists(artistsToSet);
        }
        if (usedSavedArtists) appliedSavedArtistsRef.current = true;
        else appliedSavedArtistsRef.current = false;
        mergedInSearchParamsRef.current = false;
        setPresaleTicketCount(c.presaleTicketCount != null ? String(c.presaleTicketCount) : "");
        setSaleTicketCount(c.saleTicketCount != null ? String(c.saleTicketCount) : "");
        setPresaleStartDateTime(toLocalDateTime(c.presaleStartDateTime));
        setPresaleEndDateTime(toLocalDateTime(c.presaleEndDateTime));
        setSaleStartDateTime(toLocalDateTime(c.saleStartDateTime));
        setSaleEndDateTime(toLocalDateTime(c.saleEndDateTime));
      } catch (err) {
        setFetchError(err.response?.data?.message || err.response?.status === 404 ? "공연을 찾을 수 없습니다." : "불러오기에 실패했습니다.");
      } finally {
        setInitialized(true);
      }
    };
    fetchConcert();
  }, [id]);

  // select-artists에서 돌아왔을 때: concertEditSelectedArtists가 있으면 그걸 기준으로, 없으면 현재 state 기준으로 추가 아티스트만 병합
  useEffect(() => {
    if (!id || searchParams?.get("from") !== "select-artists") return;
    try {
      let base = [];
      const savedRaw = sessionStorage.getItem("concertEditSelectedArtists");
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (Array.isArray(saved)) {
          base = saved.map((a) => ({ id: a.id, nickname: a.nickname ?? "", profileImageUrl: a.profileImageUrl ?? null }));
          // 제거는 fetch에서만 함 (fetch가 나중에 완료돼도 덮어쓰지 않도록 mergedInSearchParamsRef 사용)
        }
      }
      const raw = sessionStorage.getItem("concertAddArtists");
      const added = raw ? JSON.parse(raw) : null;
      if (Array.isArray(added) && added.length > 0) {
        mergedInSearchParamsRef.current = true;
        const byId = new Map(base.map((a) => [a.id, a]));
        added.forEach((a) => byId.set(a.id, { id: a.id, nickname: a.nickname ?? "", profileImageUrl: a.profileImageUrl ?? null }));
        setSelectedArtists(Array.from(byId.values()));
      } else if (base.length > 0) {
        mergedInSearchParamsRef.current = true;
        setSelectedArtists(base);
      }
    } catch (_) {}
  }, [id, searchParams]);

  // initialized 후 한 번 더 sessionStorage 병합 (fetch가 먼저 끝나 ref가 비었을 때 대비)
  useEffect(() => {
    if (!id || !initialized) return;
    try {
      const raw = sessionStorage.getItem("concertAddArtists");
      if (!raw) return;
      const added = JSON.parse(raw);
      if (!Array.isArray(added) || added.length === 0) return;
      setSelectedArtists((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        added.forEach((a) => byId.set(a.id, { id: a.id, nickname: a.nickname ?? "", profileImageUrl: a.profileImageUrl ?? null }));
        return Array.from(byId.values());
      });
    } catch (_) {}
  }, [id, initialized]);

  // 생성 시처럼 수정 시에도 참여 아티스트에 본인(userId)이 없으면 목록에 유지
  useEffect(() => {
    if (userId == null || !initialized) return;
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid <= 0) return;
    setSelectedArtists((prev) => {
      if (prev.some((a) => Number(a.id) === uid)) return prev;
      return [{ id: uid, nickname: "나", profileImageUrl: null }, ...prev];
    });
  }, [userId, initialized]);

  const toInstant = (localDateTimeStr) => {
    if (!localDateTimeStr || !localDateTimeStr.trim()) return null;
    return new Date(localDateTimeStr).toISOString();
  };

  const toNum = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!title.trim()) {
      setSubmitError("공연 제목을 입력해주세요.");
      return;
    }
    if (!startDateTime) {
      setSubmitError("공연 시작 시간을 입력해주세요.");
      return;
    }
    if (!endDateTime) {
      setSubmitError("공연 종료 시간을 입력해주세요.");
      return;
    }
    if (!venueName.trim()) {
      setSubmitError("장소명을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const posterId = toNum(posterMediaAssetId);
      // 본인 ID: state → 없으면 프로필 API로 조회 (JWT에는 userId가 없음)
      let uid = userId != null && Number.isInteger(Number(userId)) ? Number(userId) : null;
      if (uid == null && typeof window !== "undefined") {
        try {
          const res = await axios.get(USER_PROFILE_API, { headers: getAuthHeaders() });
          if (res?.data?.id != null) uid = Number(res.data.id);
        } catch (_) {}
      }
      const idsFromSelection = selectedArtists
        .map((a) => Number(a.id))
        .filter((id) => id > 0 && Number.isInteger(id));
      // 참여 아티스트 목록에 자신이 없으면 무조건 맨 앞에 넣어서 수정 완료되게 함
      const hasSelf = uid != null && idsFromSelection.some((id) => id === uid);
      const rawIds = hasSelf ? idsFromSelection : uid != null ? [uid, ...idsFromSelection] : idsFromSelection;
      // 본인만 있어도 최소 1명이므로 항상 배열로 전송 (undefined면 백엔드가 아티스트를 갱신하지 않음)
      const artistIds = rawIds.length > 0 ? [...new Set(rawIds)] : uid != null ? [uid] : undefined;

      await axios.put(
        `${CONCERTS_API}/${id}`,
        {
          title: title.trim(),
          description: description.trim() || null,
          startDateTime: toInstant(startDateTime),
          endDateTime: toInstant(endDateTime),
          timezone: timezone || "Asia/Seoul",
          venueName: venueName.trim(),
          locationId: toNum(locationId) || null,
          posterMediaAssetId: posterId != null && posterId > 0 ? posterId : null,
          presaleTicketCount: toNum(presaleTicketCount) ?? 0,
          saleTicketCount: toNum(saleTicketCount) ?? 0,
          presaleStartDateTime: toInstant(presaleStartDateTime),
          presaleEndDateTime: toInstant(presaleEndDateTime),
          saleStartDateTime: toInstant(saleStartDateTime),
          saleEndDateTime: toInstant(saleEndDateTime),
          artistIds,
        },
        { headers: getAuthHeaders() }
      );
      try {
        sessionStorage.removeItem("concertAddArtists");
        sessionStorage.removeItem("concertEditSelectedArtists");
      } catch (_) {}
      router.push("/artist-console/concerts");
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.response?.data?.errorCode || err.message || "수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <div className="p-8 lg:p-12 max-w-3xl mx-auto">
        <div className="text-white/55 text-center py-12">로딩 중...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" href="/artist-console/concerts" className="size-10 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/90 text-sm">
          {fetchError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" href="/artist-console/concerts" className="size-10 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">공연 수정</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">공연 정보와 예매 일정을 수정하세요.</p>
        </div>
      </header>

      {submitError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/90 text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <Surface variant="primary" className="p-8 space-y-6">
          <h3 className="text-lg font-bold text-white mb-4">기본 정보</h3>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
              공연 제목 <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2025 월드 투어"
              className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
              required
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="공연 소개 (선택)"
              className="w-full min-h-[100px] bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20 resize-y"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                시작 일시 <span className="text-red-400">*</span>
              </span>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                종료 일시 <span className="text-red-400">*</span>
              </span>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                required
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">타임존</span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="Asia/Seoul">Asia/Seoul (한국)</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                장소명 <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="예: 올림픽공원 올림픽홀"
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">위치 ID (선택)</span>
            <input
              type="number"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="위치 ID"
              min="0"
              className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">포스터 미디어 에셋 ID (선택)</span>
            <input
              type="number"
              value={posterMediaAssetId}
              onChange={(e) => setPosterMediaAssetId(e.target.value)}
              placeholder="변경 시에만 입력, 없으면 비워두세요"
              min="0"
              className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </label>
          <div className="pt-4 border-t border-white/[0.08]">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">참여 아티스트</span>
            {selectedArtists.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedArtists.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 text-white text-sm"
                  >
                    {a.nickname}
                    <button
                      type="button"
                      onClick={() => setSelectedArtists((prev) => prev.filter((x) => x.id !== a.id))}
                      className="hover:text-red-400"
                      aria-label="제거"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              className="text-violet-400 hover:text-violet-300"
              onClick={() => {
                try {
                  sessionStorage.setItem("concertSelectArtistsReturn", `/artist-console/concerts/${id}/edit`);
                  sessionStorage.setItem(
                    "concertEditSelectedArtists",
                    JSON.stringify(selectedArtists.map((a) => ({ id: a.id, nickname: a.nickname, profileImageUrl: a.profileImageUrl })))
                  );
                } catch (_) {}
                router.push("/artist-console/concerts/new/select-artists");
              }}
            >
              <span className="material-symbols-outlined align-middle mr-1">person_add</span>
              아티스트 검색하여 추가
            </Button>
          </div>
        </Surface>

        <Surface variant="primary" className="p-8 space-y-6">
          <h3 className="text-lg font-bold text-white mb-4">티켓 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">선예매 수량</span>
              <input
                type="number"
                value={presaleTicketCount}
                onChange={(e) => setPresaleTicketCount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">일반 예매 수량</span>
              <input
                type="number"
                value={saleTicketCount}
                onChange={(e) => setSaleTicketCount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">선예매 시작</span>
              <input
                type="datetime-local"
                value={presaleStartDateTime}
                onChange={(e) => setPresaleStartDateTime(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">선예매 종료</span>
              <input
                type="datetime-local"
                value={presaleEndDateTime}
                onChange={(e) => setPresaleEndDateTime(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">일반 예매 시작</span>
              <input
                type="datetime-local"
                value={saleStartDateTime}
                onChange={(e) => setSaleStartDateTime(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">일반 예매 종료</span>
              <input
                type="datetime-local"
                value={saleEndDateTime}
                onChange={(e) => setSaleEndDateTime(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
          </div>
        </Surface>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" href="/artist-console/concerts" disabled={loading}>
            취소
          </Button>
          <Button type="submit" variant="primary" className="px-8 py-3" disabled={loading}>
            {loading ? "저장 중…" : "수정 완료"}
          </Button>
        </div>
      </form>
    </div>
  );
}
