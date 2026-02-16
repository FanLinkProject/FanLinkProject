"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const CONCERTS_API = "http://localhost:8080/api/concerts";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: token }),
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
  const artist = MOCK_ARTISTS[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  // JWT에서 사용자 ID 추출
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      const payload = parseJwt(token);
      if (payload?.userId || payload?.sub) {
        setUserId(payload.userId || payload.sub);
      }
    }
  }, []);

  // 기본 정보
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [venueName, setVenueName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [concertImageUrl, setConcertImageUrl] = useState("");

  // 티켓 정보
  const [presaleTicketCount, setPresaleTicketCount] = useState("");
  const [saleTicketCount, setSaleTicketCount] = useState("");
  const [presaleStartDateTime, setPresaleStartDateTime] = useState("");
  const [presaleEndDateTime, setPresaleEndDateTime] = useState("");
  const [saleStartDateTime, setSaleStartDateTime] = useState("");
  const [saleEndDateTime, setSaleEndDateTime] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 필수 필드 검증
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
    if (!presaleStartDateTime) {
      setError("선예매 시작 시간을 입력해주세요.");
      return;
    }
    if (!presaleEndDateTime) {
      setError("선예매 종료 시간을 입력해주세요.");
      return;
    }
    if (!saleStartDateTime) {
      setError("일반 예매 시작 시간을 입력해주세요.");
      return;
    }
    if (!saleEndDateTime) {
      setError("일반 예매 종료 시간을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 빈 문자열을 null로 변환하는 헬퍼
      const toNullIfEmpty = (value) => {
        if (value === null || value === undefined) return null;
        const trimmed = String(value).trim();
        return trimmed === "" ? null : trimmed;
      };

      const requestData = {
        title: title.trim(),
        description: toNullIfEmpty(description),
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        timezone: timezone || "Asia/Seoul",
        venueName: venueName.trim(),
        locationId: locationId && locationId.trim() ? parseInt(locationId.trim()) : null,
        concertImageUrl: toNullIfEmpty(concertImageUrl),
        presaleTicketCount: presaleTicketCount ? parseInt(presaleTicketCount) : 0,
        saleTicketCount: saleTicketCount ? parseInt(saleTicketCount) : 0,
        presaleStartDateTime: new Date(presaleStartDateTime).toISOString(),
        presaleEndDateTime: new Date(presaleEndDateTime).toISOString(),
        saleStartDateTime: new Date(saleStartDateTime).toISOString(),
        saleEndDateTime: new Date(saleEndDateTime).toISOString(),
        // artistIds는 백엔드에서 Principal의 userId를 자동으로 사용
      };

      console.log("Request Data:", JSON.stringify(requestData, null, 2)); // 디버깅용

      await axios.post(CONCERTS_API, requestData, { headers: getAuthHeaders() });
      router.push("/artist-console/concerts");
    } catch (err) {
      console.error("Error:", err.response?.data); // 디버깅용
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "공연 등록에 실패했습니다. 모든 필수 항목을 확인해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
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
              placeholder="공연 제목을 입력하세요"
              className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
              required
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">공연 설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="공연에 대한 설명을 입력하세요"
              className="w-full min-h-[120px] bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20 resize-y"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                공연 시작 시간 <span className="text-red-400">*</span>
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
                공연 종료 시간 <span className="text-red-400">*</span>
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
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                타임존 <span className="text-red-400">*</span>
              </span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                required
              >
                <option value="Asia/Seoul">Asia/Seoul (한국)</option>
                <option value="America/New_York">America/New_York (미국 동부)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (미국 서부)</option>
                <option value="Europe/London">Europe/London (영국)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (일본)</option>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">공연 이미지 URL</span>
            <input
              type="url"
              value={concertImageUrl}
              onChange={(e) => setConcertImageUrl(e.target.value)}
              placeholder="https://example.com/poster.jpg"
              className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </label>
        </Surface>

        {/* 티켓 정보 */}
        <Surface variant="primary" className="p-8 space-y-6">
          <h3 className="text-lg font-bold text-white mb-4">티켓 정보</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">선예매 티켓 수량</span>
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
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">일반 예매 티켓 수량</span>
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

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white/80">선예매 기간</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                  선예매 시작 시간 <span className="text-red-400">*</span>
                </span>
                <input
                  type="datetime-local"
                  value={presaleStartDateTime}
                  onChange={(e) => setPresaleStartDateTime(e.target.value)}
                  className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                  required
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                  선예매 종료 시간 <span className="text-red-400">*</span>
                </span>
                <input
                  type="datetime-local"
                  value={presaleEndDateTime}
                  onChange={(e) => setPresaleEndDateTime(e.target.value)}
                  className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                  required
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white/80">일반 예매 기간</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                  일반 예매 시작 시간 <span className="text-red-400">*</span>
                </span>
                <input
                  type="datetime-local"
                  value={saleStartDateTime}
                  onChange={(e) => setSaleStartDateTime(e.target.value)}
                  className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                  required
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                  일반 예매 종료 시간 <span className="text-red-400">*</span>
                </span>
                <input
                  type="datetime-local"
                  value={saleEndDateTime}
                  onChange={(e) => setSaleEndDateTime(e.target.value)}
                  className="w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                  required
                />
              </label>
            </div>
          </div>
        </Surface>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" href="/artist-console/concerts" disabled={loading}>
            취소
          </Button>
          <Button type="submit" variant="primary" className="px-8 py-3" disabled={loading}>
            {loading ? "등록 중..." : "공연 등록하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
