"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const CONCERTS_API = "http://localhost:8080/api/concerts";

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

export default function NewConcertPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      const payload = parseJwt(token);
      if (payload?.userId != null) setUserId(payload.userId);
      else if (payload?.sub != null && /^\d+$/.test(String(payload.sub))) setUserId(Number(payload.sub));
    }
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

  // select-artists에서 돌아온 뒤: 저장해 둔 폼 초안 복원 + 추가 아티스트 병합
  useEffect(() => {
    try {
      const draftRaw = sessionStorage.getItem("concertNewDraft");
      if (draftRaw) {
        sessionStorage.removeItem("concertNewDraft");
        const draft = JSON.parse(draftRaw);
        if (draft && typeof draft === "object") {
          if (draft.title != null) setTitle(String(draft.title));
          if (draft.description != null) setDescription(String(draft.description));
          if (draft.startDateTime != null) setStartDateTime(String(draft.startDateTime));
          if (draft.endDateTime != null) setEndDateTime(String(draft.endDateTime));
          if (draft.timezone != null) setTimezone(String(draft.timezone));
          if (draft.venueName != null) setVenueName(String(draft.venueName));
          if (draft.locationId != null) setLocationId(String(draft.locationId));
          if (draft.posterMediaAssetId != null) setPosterMediaAssetId(String(draft.posterMediaAssetId));
          if (draft.presaleTicketCount != null) setPresaleTicketCount(String(draft.presaleTicketCount));
          if (draft.saleTicketCount != null) setSaleTicketCount(String(draft.saleTicketCount));
          if (draft.presaleStartDateTime != null) setPresaleStartDateTime(String(draft.presaleStartDateTime));
          if (draft.presaleEndDateTime != null) setPresaleEndDateTime(String(draft.presaleEndDateTime));
          if (draft.saleStartDateTime != null) setSaleStartDateTime(String(draft.saleStartDateTime));
          if (draft.saleEndDateTime != null) setSaleEndDateTime(String(draft.saleEndDateTime));
          if (Array.isArray(draft.selectedArtists) && draft.selectedArtists.length > 0) {
            setSelectedArtists(draft.selectedArtists.map((a) => ({ id: a.id, nickname: a.nickname ?? "", profileImageUrl: a.profileImageUrl ?? null })));
          }
        }
      }
      const raw = sessionStorage.getItem("concertAddArtists");
      if (raw) {
        sessionStorage.removeItem("concertAddArtists");
        const added = JSON.parse(raw);
        if (Array.isArray(added) && added.length > 0) {
          setSelectedArtists((prev) => {
            const byId = new Map(prev.map((a) => [a.id, a]));
            added.forEach((a) => byId.set(a.id, { id: a.id, nickname: a.nickname, profileImageUrl: a.profileImageUrl }));
            return Array.from(byId.values());
          });
        }
      }
    } catch (_) {}
  }, []);

  const [presaleTicketCount, setPresaleTicketCount] = useState("");
  const [saleTicketCount, setSaleTicketCount] = useState("");
  const [presaleStartDateTime, setPresaleStartDateTime] = useState("");
  const [presaleEndDateTime, setPresaleEndDateTime] = useState("");
  const [saleStartDateTime, setSaleStartDateTime] = useState("");
  const [saleEndDateTime, setSaleEndDateTime] = useState("");

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
    setError("");
    if (!title.trim()) {
      setError("공연 제목을 입력해주세요.");
      return;
    }
    if (!startDateTime) {
      setError("공연 시작 시간을 입력해주세요.");
      return;
    }
    if (!endDateTime) {
      setError("공연 종료 시간을 입력해주세요.");
      return;
    }
    if (!venueName.trim()) {
      setError("장소명을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const posterId = toNum(posterMediaAssetId);
      const rawIds = [
        ...(userId != null && Number.isInteger(Number(userId)) ? [Number(userId)] : []),
        ...selectedArtists.map((a) => Number(a.id)),
      ].filter((id) => id > 0 && Number.isInteger(id));
      const artistIds = rawIds.length > 0 ? [...new Set(rawIds)] : undefined;

      await axios.post(
        CONCERTS_API,
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
        sessionStorage.removeItem("concertNewDraft");
      } catch (_) {}
      router.push("/artist-console/concerts");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errorCode || err.message || "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" href="/artist-console/concerts" className="size-10 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">새 공연 등록</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">공연 정보와 예매 일정을 입력하세요.</p>
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/90 text-sm">
          {error}
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
              placeholder="없으면 비워두세요"
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
                  sessionStorage.setItem("concertSelectArtistsReturn", "/artist-console/concerts/new");
                  sessionStorage.setItem(
                    "concertNewDraft",
                    JSON.stringify({
                      title,
                      description,
                      startDateTime,
                      endDateTime,
                      timezone,
                      venueName,
                      locationId,
                      posterMediaAssetId,
                      presaleTicketCount,
                      saleTicketCount,
                      presaleStartDateTime,
                      presaleEndDateTime,
                      saleStartDateTime,
                      saleEndDateTime,
                      selectedArtists: selectedArtists.map((a) => ({ id: a.id, nickname: a.nickname, profileImageUrl: a.profileImageUrl })),
                    })
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
            {loading ? "저장 중…" : "공연 등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}
