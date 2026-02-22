"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";

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

export default function ArtistNoticesPage() {
    const params = useParams();
    const id = params?.id;
    const groupId = Number(id);
    const isRealGroup = !isNaN(groupId) && groupId > 0;

    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasNext, setHasNext] = useState(false);
    const [lastId, setLastId] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [artistName, setArtistName] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!isRealGroup) {
            setLoading(false);
            return;
        }
        setLoading(true);
        request("/api/artist-posts/notices", { query: { groupId, limit: NOTICES_LIMIT } })
            .then((data) => {
                const list = Array.isArray(data) ? data : (data?.content ?? []);
                setNotices(list);
                setHasNext(list.length === NOTICES_LIMIT);
                if (list.length > 0) setLastId(list[list.length - 1].id);
            })
            .catch(() => setNotices([]))
            .finally(() => setLoading(false));
    }, [groupId, isRealGroup]);

    useEffect(() => {
        if (!isRealGroup || !groupId) return;
        request(`/api/user/artists/${groupId}/dashboard`)
            .then((data) => {
                const info = data?.artistInfo || {};
                setArtistName(info.nickname || "");
            })
            .catch(() => {});
    }, [groupId, isRealGroup]);

    const loadMore = () => {
        if (!hasNext || loadingMore || !lastId) return;
        setLoadingMore(true);
        request("/api/artist-posts/notices", {
            query: { groupId, lastPostId: lastId, limit: NOTICES_LIMIT },
        })
            .then((data) => {
                const list = Array.isArray(data) ? data : (data?.content ?? []);
                setNotices((prev) => [...prev, ...list]);
                setHasNext(list.length === NOTICES_LIMIT);
                if (list.length > 0) setLastId(list[list.length - 1].id);
            })
            .finally(() => setLoadingMore(false));
    };

    useEffect(() => {
        if (!hasNext) return;
        const el = bottomRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNext, lastId, loadMore]);

    return (
        <div className="min-h-full max-w-3xl mx-auto px-8 py-8">
            <Link
                href={`/artists/${id}`}
                className="inline-flex items-center gap-2 text-white/55 hover:text-violet-300 font-bold text-xs uppercase tracking-widest transition-colors mb-6"
            >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                {artistName ? `${artistName} 페이지로` : "아티스트 페이지로"} 돌아가기
            </Link>

            <h1 className="text-2xl font-bold text-white mb-2">전체 공지사항</h1>
            {artistName && (
                <p className="text-sm text-white/55 mb-8">{artistName} 공식 공지입니다.</p>
            )}

            {loading ? (
                <Surface variant="primary" className="py-12 text-center">
                    <p className="text-white/55">불러오는 중...</p>
                </Surface>
            ) : notices.length === 0 ? (
                <Surface variant="primary" className="py-12 text-center">
                    <p className="text-white/55">등록된 공지가 없습니다.</p>
                </Surface>
            ) : (
                <div className="space-y-4">
                    {notices.map((notice) => (
                        <Link
                            key={notice.id}
                            href={`/posts/${notice.id}?type=ARTIST&groupId=${groupId}`}
                            className="block"
                        >
                            <Surface variant="primary" className="p-6 hover:border-white/[0.12] transition-colors">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 text-[10px] font-black uppercase">
                                        Notice
                                    </span>
                                    <span className="text-[11px] font-bold text-white/55">
                                        {formatTimestamp(notice.createdAt)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-white mb-1 line-clamp-2">
                                    {notice.title || (notice.content ? `${(notice.content || "").slice(0, 60)}${(notice.content || "").length > 60 ? "..." : ""}` : "공지")}
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
    );
}
