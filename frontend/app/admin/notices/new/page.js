"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

/** 관리자 플랫폼 공지 작성 (groupId 없음, isNotice=true) */
export default function AdminNoticeNewPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("내용을 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await request("/api/artist-posts", {
        method: "POST",
        body: {
          title: "",
          content: content.trim(),
          isMembershipOnly: false,
          isNotice: true,
          mediaAssetIds: [],
        },
      });
      router.push("/admin/notices");
    } catch (err) {
      console.error("공지 작성 실패", err);
      setError("공지 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">공지 작성</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            플랫폼 전체 공지사항을 작성합니다.
          </p>
        </div>
        <Button variant="ghost" href="/admin/notices" className="text-xs uppercase tracking-widest">
          목록으로
        </Button>
      </header>

      <Surface variant="primary" className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/55 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요."
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/30 resize-y"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="text-xs uppercase tracking-widest"
            >
              {loading ? "등록 중..." : "공지 등록"}
            </Button>
            <Button type="button" variant="ghost" href="/admin/notices" className="text-xs uppercase tracking-widest">
              취소
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
