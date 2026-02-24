"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const NOTICES_LIMIT = 20;

function formatTimestamp(instant) {
  if (!instant) return "";
  try {
    const date = new Date(instant);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNext, setHasNext] = useState(false);
  const [lastId, setLastId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);

  const fetchNotices = useCallback((lastPostId = null) => {
    const query = { limit: NOTICES_LIMIT };
    if (lastPostId) query.lastPostId = lastPostId;
    return request("/api/artist-posts/notices", { query });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotices()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.content ?? [];
        setNotices(list);
        setHasNext(list.length === NOTICES_LIMIT);
        if (list.length > 0) setLastId(list[list.length - 1].id);
      })
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, [fetchNotices]);

  const loadMore = useCallback(() => {
    if (!hasNext || loadingMore || !lastId) return;
    setLoadingMore(true);
    fetchNotices(lastId)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.content ?? [];
        setNotices((prev) => [...prev, ...list]);
        setHasNext(list.length === NOTICES_LIMIT);
        if (list.length > 0) setLastId(list[list.length - 1].id);
      })
      .finally(() => setLoadingMore(false));
  }, [hasNext, lastId, loadingMore, fetchNotices]);

  useEffect(() => {
    if (!hasNext) return;
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNext, loadMore]);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">공지 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            플랫폼 전체 공지사항을 조회합니다.
          </p>
        </div>
        <Button variant="primary" href="/admin/notices/new" className="text-xs uppercase tracking-widest">
          공지 작성
        </Button>
      </header>

      <div className="space-y-4">
        {loading ? (
          <Surface variant="primary" className="py-12 text-center">
            <p className="text-white/55">불러오는 중...</p>
          </Surface>
        ) : notices.length === 0 ? (
          <Surface variant="primary" className="p-8">
            <p className="text-sm text-white/55">등록된 공지가 없습니다.</p>
          </Surface>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/posts/${notice.id}?type=ARTIST`}
                className="block"
              >
                <Surface variant="primary" className="p-6 hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-black uppercase">
                      공지
                    </span>
                    <span className="text-[11px] font-bold text-white/55">
                      {formatTimestamp(notice.createdAt)}
                    </span>
                    {notice.writerNickname && (
                      <span className="text-[11px] text-white/60">
                        {notice.writerNickname}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white mb-1 line-clamp-2">
                    {notice.title ||
                      (notice.content
                        ? `${(notice.content || "").slice(0, 60)}${(notice.content || "").length > 60 ? "..." : ""}`
                        : "공지")}
                  </h3>
                  {notice.content && (
                    <p className="text-sm text-white/70 line-clamp-2 mt-1">
                      {notice.content}
                    </p>
                  )}
                  <span className="inline-block mt-3 text-[10px] font-black text-violet-300 uppercase tracking-widest">
                    자세히 보기
                  </span>
                </Surface>
              </Link>
            ))}
            <div ref={bottomRef} className="py-4">
              {loadingMore && (
                <p className="text-white/40 text-xs text-center">불러오는 중...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
