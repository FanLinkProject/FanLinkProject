// Modified/Added files:
// - app/artist-console/live/page.js (start button -> navigate to create page)
// - app/artist-console/live/create/page.js (live creation form, POST /api/live-sessions)
// - app/artist-console/live/[id]/page.js (artist live progress screen)

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, getToken } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";

export default function ArtistLiveCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("MEMBERS_ONLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isTitleInvalid = !title.trim() || title.length > 60;

  const handleCancel = () => {
    router.push("/artist-console/live");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTitleInvalid || submitting) return;

    setError("");
    setSubmitting(true);

    const token = getToken();
    if (!token) {
      setError("로그인이 필요합니다.");
      setSubmitting(false);
      return;
    }

    try {
      // 현재 로그인한 아티스트의 channelArn 조회 후 라이브 세션 생성에 사용
      const channelArnRaw = await apiGet("/api/artist/me/channel-arn");
      const channelArn =
        typeof channelArnRaw === "string"
          ? channelArnRaw
          : (channelArnRaw?.channelArn ?? "");
      if (!channelArn.trim()) {
        setError("아티스트 채널 정보를 불러올 수 없습니다. 관리자에게 문의해 주세요.");
        setSubmitting(false);
        return;
      }

      const res = await apiPost("/api/live-sessions", {
        channelArn: channelArn.trim(),
        title: title.trim(),
        isPaid: visibility === "MEMBERS_ONLY",
      });

      const sessionId = res?.id;
      if (sessionId == null) {
        setError("세션 ID를 받지 못했습니다.");
        setSubmitting(false);
        return;
      }

      router.push(`/artist-console/live/${sessionId}`);
    } catch (e) {
      setError(e?.message ?? "라이브 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white tracking-tight">라이브 시작</h1>
        <p className="text-sm text-white/60">
          방송 제목과 공개 범위를 설정하고 라이브를 시작하세요.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <Surface
        variant="primary"
        className="rounded-2xl border border-white/6 bg-[#201a33] p-6 sm:p-8 space-y-6"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              라이브 제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 컴백 기념 라이브"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-500/60"
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className={isTitleInvalid && title.trim().length === 0 ? "text-red-300" : "text-white/40"}>
                필수 입력 항목입니다.
              </span>
              <span className="text-white/40">{title.length}/60</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/90">공개 범위</h3>
            <div className="inline-flex rounded-full bg-black/40 border border-white/10 p-1">
              <button
                type="button"
                onClick={() => setVisibility("MEMBERS_ONLY")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  visibility === "MEMBERS_ONLY"
                    ? "bg-violet-500 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                멤버십 전용
              </button>
              <button
                type="button"
                onClick={() => setVisibility("PUBLIC")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  visibility === "PUBLIC"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                전체 공개
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="px-5 py-2.5 text-sm"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
              disabled={submitting || isTitleInvalid}
            >
              {submitting ? "생성 중..." : "라이브 생성하기"}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
