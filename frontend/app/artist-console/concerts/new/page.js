"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useMediaUpload } from "@/lib/useMediaUpload";
import { MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { KakaoPlacePicker } from "@/components/concert/KakaoPlacePicker";
import { BASE_URL } from "@/lib/api";

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
  const [selectedPlaceFromPicker, setSelectedPlaceFromPicker] = useState(null);
  const [posterMediaAssetId, setPosterMediaAssetId] = useState(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState(null);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [creatorDisplayName, setCreatorDisplayName] = useState("");
  const posterFileInputRef = useRef(null);

  const effectiveArtistId = selectedArtists[0]?.id ?? userId;
  const presignItem = useMemo(
    () =>
      effectiveArtistId != null && Number.isInteger(Number(effectiveArtistId))
        ? {
            category: MediaAssetCategory.CONCERT_POSTER,
            scope: MediaAssetScope.PUBLIC,
            artistId: Number(effectiveArtistId),
            concertIdOrTemp: "tmp_concert_poster",
          }
        : null,
    [effectiveArtistId]
  );
  const { upload: uploadPoster, loading: posterUploading, error: posterUploadError } = useMediaUpload(presignItem);

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
          if (draft.selectedPlaceFromPicker != null && typeof draft.selectedPlaceFromPicker === "object") setSelectedPlaceFromPicker(draft.selectedPlaceFromPicker);
          if (draft.posterMediaAssetId != null) setPosterMediaAssetId(draft.posterMediaAssetId);
          if (draft.posterPreviewUrl != null) setPosterPreviewUrl(draft.posterPreviewUrl);
          if (draft.presaleTicketCount != null) setPresaleTicketCount(String(draft.presaleTicketCount));
          if (draft.saleTicketCount != null) setSaleTicketCount(String(draft.saleTicketCount));
          if (draft.presaleTicketPrice != null) setPresaleTicketPrice(String(draft.presaleTicketPrice));
          if (draft.saleTicketPrice != null) setSaleTicketPrice(String(draft.saleTicketPrice));
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

  // 새 공연 등록 화면 진입 시: 프로필 조회 후 개인 아티스트면 참여 아티스트에 본인 미리 선택 (그룹 계정은 비워 둠)
  // userId 의존 제거 → 마운트 시 바로 프로필 호출해 본인 세팅 보장
  useEffect(() => {
    apiGet("/api/user/profile")
      .then((profile) => {
        if (!profile?.id) return;
        if (userId == null) setUserId(profile.id);
        const isGroupAccount = profile.groupId != null && Number(profile.groupId) === Number(profile.id);
        setCreatorDisplayName(
          isGroupAccount
            ? (profile.name || profile.nickname || "그룹")
            : (profile.nickname || profile.name || "아티스트")
        );
        if (isGroupAccount) return;
        setSelectedArtists((prev) => {
          const hasSelf = prev.some((a) => Number(a.id) === Number(profile.id));
          if (hasSelf) return prev;
          return [{ id: profile.id, nickname: profile.nickname ?? "", profileImageUrl: profile.profileImageUrl ?? null }, ...prev];
        });
      })
      .catch(() => {});
  }, []);

  const [presaleTicketCount, setPresaleTicketCount] = useState("");
  const [saleTicketCount, setSaleTicketCount] = useState("");
  const [presaleTicketPrice, setPresaleTicketPrice] = useState("");
  const [saleTicketPrice, setSaleTicketPrice] = useState("");
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

  const [presaleTicketPriceError, setPresaleTicketPriceError] = useState("");
  const [saleTicketPriceError, setSaleTicketPriceError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPresaleTicketPriceError("");
    setSaleTicketPriceError("");
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
    if (!selectedPlaceFromPicker?.placeName?.trim()) {
      setError("장소를 검색하여 선택해주세요.");
      return;
    }
    if (!selectedArtists?.length) {
      setError("참여 아티스트를 1명 이상 선택해 주세요.");
      return;
    }
    const presaleCount = toNum(presaleTicketCount) ?? 0;
    const saleCount = toNum(saleTicketCount) ?? 0;
    const presalePrice = toNum(presaleTicketPrice);
    const salePrice = toNum(saleTicketPrice);
    if (presaleCount > 0 && (presalePrice == null || presalePrice <= 0)) {
      setPresaleTicketPriceError("선예매 수량이 있으면 선예매 티켓 가격을 입력해주세요.");
      return;
    }
    if (saleCount > 0 && (salePrice == null || salePrice <= 0)) {
      setSaleTicketPriceError("일반 예매 수량이 있으면 일반 예매 티켓 가격을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      let locationId = null;
      if (selectedPlaceFromPicker) {
        const res = await apiPost("/api/locations", {
          provider: selectedPlaceFromPicker.provider ?? "KAKAO",
          placeId: selectedPlaceFromPicker.placeId ?? null,
          placeName: selectedPlaceFromPicker.placeName ?? null,
          fullAddress: selectedPlaceFromPicker.fullAddress?.trim() || " ",
          latitude: selectedPlaceFromPicker.latitude,
          longitude: selectedPlaceFromPicker.longitude,
        });
        locationId = res?.locationId ?? res?.id ?? null;
        if (locationId == null) {
          setError("위치 저장 후 ID를 받지 못했습니다.");
          setLoading(false);
          return;
        }
      }

      const posterId =
        posterMediaAssetId != null && Number.isInteger(posterMediaAssetId) && posterMediaAssetId > 0
          ? posterMediaAssetId
          : null;
      const artistIds = [
        ...new Set(selectedArtists.map((a) => Number(a.id)).filter((id) => id > 0 && Number.isInteger(id))),
      ];

      await apiPost("/api/concerts", {
        title: title.trim(),
        description: description.trim() || null,
        startDateTime: toInstant(startDateTime),
        endDateTime: toInstant(endDateTime),
        timezone: timezone || "Asia/Seoul",
        venueName: (selectedPlaceFromPicker?.placeName ?? "").trim(),
        locationId,
        posterMediaAssetId: posterId != null && posterId > 0 ? posterId : null,
        presaleTicketCount: toNum(presaleTicketCount) ?? 0,
        saleTicketCount: toNum(saleTicketCount) ?? 0,
        presaleTicketPrice: toNum(presaleTicketPrice) != null ? toNum(presaleTicketPrice) : null,
        saleTicketPrice: toNum(saleTicketPrice) != null ? toNum(saleTicketPrice) : null,
        presaleStartDateTime: toInstant(presaleStartDateTime),
        presaleEndDateTime: toInstant(presaleEndDateTime),
        saleStartDateTime: toInstant(saleStartDateTime),
        saleEndDateTime: toInstant(saleEndDateTime),
        artistIds,
      });
      try {
        sessionStorage.removeItem("concertNewDraft");
      } catch (_) {}
      router.push("/artist-console/concerts");
    } catch (err) {
      setError(err?.data?.message || err?.message || "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="size-10 rounded-full">
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
                      selectedPlaceFromPicker,
                      posterMediaAssetId: posterMediaAssetId ?? undefined,
                      posterPreviewUrl: posterPreviewUrl ?? undefined,
                      presaleTicketCount,
                      saleTicketCount,
                      presaleTicketPrice,
                      saleTicketPrice,
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
          <div className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
              장소 <span className="text-red-400">*</span> (검색 후 선택)
            </span>
            <KakaoPlacePicker
              onPicked={(picked) => setSelectedPlaceFromPicker(picked ?? null)}
              disabled={loading}
            />
          </div>
          <div className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
              포스터 이미지 (선택)
            </span>
            <input
              ref={posterFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !file.type.startsWith("image/")) return;
                if (!presignItem) return;
                const result = await uploadPoster(file);
                if (result) {
                  setPosterMediaAssetId(result.mediaAssetId);
                  setPosterPreviewUrl(result.url ?? null);
                }
                e.target.value = "";
              }}
            />
            {!presignItem ? (
              <p className="text-white/55 text-sm py-2">
                포스터를 올리려면 먼저 &quot;아티스트 검색하여 추가&quot;를 하거나 로그인해 주세요.
              </p>
            ) : !posterPreviewUrl ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => posterFileInputRef.current?.click()}
                  disabled={posterUploading}
                  className="w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
                >
                  {posterUploading ? (
                    <>
                      <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                      <span className="text-sm font-bold">업로드 중…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                      <span className="text-sm font-bold">클릭하여 포스터 이미지 추가</span>
                    </>
                  )}
                </button>
                {posterUploadError && (
                  <p className="text-red-400/90 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {posterUploadError}
                    <button
                      type="button"
                      onClick={() => posterFileInputRef.current?.click()}
                      className="text-violet-400 hover:text-violet-300 text-sm underline"
                    >
                      재시도
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/20">
                <img
                  src={posterPreviewUrl}
                  alt="포스터 미리보기"
                  className="w-full max-h-80 object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => posterFileInputRef.current?.click()}
                    disabled={posterUploading}
                    className="size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
                    title="변경"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosterMediaAssetId(null);
                      setPosterPreviewUrl(null);
                      if (posterFileInputRef.current) posterFileInputRef.current.value = "";
                    }}
                    className="size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    title="삭제"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">타임존</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full max-w-xs bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="Asia/Seoul">Asia/Seoul (한국)</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </label>
        </Surface>

        <Surface variant="primary" className="p-8 space-y-6">
          <div className="flex flex-wrap items-baseline gap-2 mb-2">
            <h3 className="text-lg font-bold text-white">티켓 정보</h3>
            {creatorDisplayName && (
              <p className="text-sm text-white/55">
                티켓 상품은 &quot;{creatorDisplayName}&quot;의 마켓에 등록됩니다.
              </p>
            )}
          </div>
          <p className="text-[11px] text-amber-200/80 mb-4">
            선예매를 사용하려면 해당 아티스트(또는 그룹)의 멤버십 상품을 먼저 등록해야 합니다. 멤버십 상품이 없으면 선예매 정보 입력 후에도 등록이 불가합니다.
          </p>
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
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">선예매 티켓 가격 (원)</span>
              <input
                type="number"
                value={presaleTicketPrice}
                onChange={(e) => {
                  setPresaleTicketPrice(e.target.value);
                  setPresaleTicketPriceError("");
                }}
                placeholder="0"
                min="0"
                className={`w-full bg-[#16102a] border rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20 ${presaleTicketPriceError ? "border-red-500/60" : "border-white/[0.08]"}`}
              />
              {presaleTicketPriceError && (
                <p className="mt-1.5 text-sm text-red-400">{presaleTicketPriceError}</p>
              )}
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">일반 예매 티켓 가격 (원)</span>
              <input
                type="number"
                value={saleTicketPrice}
                onChange={(e) => {
                  setSaleTicketPrice(e.target.value);
                  setSaleTicketPriceError("");
                }}
                placeholder="0"
                min="0"
                className={`w-full bg-[#16102a] border rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20 ${saleTicketPriceError ? "border-red-500/60" : "border-white/[0.08]"}`}
              />
              {saleTicketPriceError && (
                <p className="mt-1.5 text-sm text-red-400">{saleTicketPriceError}</p>
              )}
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
          <Button variant="ghost" onClick={() => router.back()} disabled={loading}>
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
