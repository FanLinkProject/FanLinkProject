"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getReplay, access } from "@/lib/replayApi";
import { request } from "@/lib/api";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { getCurrentUser } from "@/lib/postUtils";
import Surface from "@/components/ui/Surface";

function useHls(videoRef, playbackUrl, cfSigningParams) {
    useEffect(() => {
        if (!playbackUrl || !videoRef?.current) return;
        const isHls = playbackUrl.includes(".m3u8");
        if (!isHls) return;
        let hls = null;
        const qs = cfSigningParams
            ? `Policy=${cfSigningParams.policy}&Signature=${cfSigningParams.signature}&Key-Pair-Id=${cfSigningParams.keyPairId}`
            : null;
        const signedUrl = qs ? `${playbackUrl}${playbackUrl.includes("?") ? "&" : "?"}${qs}` : playbackUrl;
        const loadHls = async () => {
            try {
                const Hls = (await import("hls.js")).default;
                if (Hls.isSupported()) {
                    const hlsConfig = { enableWorker: true };
                    if (qs) {
                        hlsConfig.xhrSetup = (xhr, url) => {
                            const sep = url.includes("?") ? "&" : "?";
                            xhr.open("GET", `${url}${sep}${qs}`, true);
                        };
                    }
                    hls = new Hls(hlsConfig);
                    hls.loadSource(signedUrl);
                    hls.attachMedia(videoRef.current);
                } else if (videoRef.current?.canPlayType?.("application/vnd.apple.mpegurl")) {
                    videoRef.current.src = signedUrl;
                }
            } catch {
                videoRef.current.src = signedUrl;
            }
        };
        loadHls();
        return () => { if (hls) hls.destroy(); };
    }, [playbackUrl, videoRef, cfSigningParams]);
}

export default function ReplayWatchPage({ params }) {
    const resolvedParams = React.use(params);
    const replayId = resolvedParams?.replayId ? Number(resolvedParams.replayId) : null;

    const [replay, setReplay] = useState(null);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [cfSigningParams, setCfSigningParams] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [artistInfo, setArtistInfo] = useState(null);

    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [commentSubmitting, setCommentSubmitting] = useState(false);

    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => { setCurrentUser(getCurrentUser()); }, []);

    useEffect(() => {
        if (!replayId) { setError("replayId가 없습니다."); setLoading(false); return; }
        setLoading(true); setError(null);
        getReplay(replayId)
            .then((data) => { setReplay(data); return data; })
            .catch((e) => { setError(e?.data?.message || e.message || "다시보기 조회 실패"); setLoading(false); });
    }, [replayId]);

    useEffect(() => {
        if (!replay || playbackUrl) return;
        access(replayId)
            .then((result) => {
                setPlaybackUrl(result?.playbackUrl ?? result?.response?.playbackUrl ?? replay.playbackUrl ?? null);
                const p = result?.cfPolicy ?? result?.response?.cfPolicy;
                const s = result?.cfSignature ?? result?.response?.cfSignature;
                const k = result?.cfKeyPairId ?? result?.response?.cfKeyPairId;
                if (p && s && k) setCfSigningParams({ policy: p, signature: s, keyPairId: k });
            })
            .catch((e) => setError(e?.data?.message || e.message || "접근 권한이 없거나 구독이 필요합니다."))
            .finally(() => setLoading(false));
    }, [replay, replayId, playbackUrl]);

    useEffect(() => {
        if (!replay?.artistId) return;
        request(`/api/user/artists/${replay.artistId}/dashboard`)
            .then((data) => {
                const info = data?.artistInfo || {};
                setArtistInfo({ name: info.nickname || "", avatar: info.profileImageUrl || "" });
            })
            .catch(() => {});
    }, [replay?.artistId]);

    const loadComments = useCallback(() => {
        if (!replayId) return;
        setCommentsLoading(true);
        request(`/api/comments?targetType=LIVE&targetId=${replayId}&size=50`)
            .then((data) => setComments(data?.content || []))
            .catch(() => setComments([]))
            .finally(() => setCommentsLoading(false));
    }, [replayId]);

    useEffect(() => { if (replay) loadComments(); }, [replay]);

    useEffect(() => {
        if (!replayId) return;
        const user = getCurrentUser();
        Promise.all([
            request("/api/likes/counts", { query: { targetType: "LIVE", targetIds: String(replayId) } }).catch(() => ({})),
            user ? request("/api/likes/check", { query: { targetType: "LIVE", targetIds: String(replayId) } }).catch(() => []) : Promise.resolve([]),
        ]).then(([countRes, checkRes]) => {
            setLikeCount(countRes?.[replayId] ?? 0);
            const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
            setIsLiked(likedSet.has(replayId));
        });
    }, [replayId]);

    const handleLike = () => {
        if (!currentUser) return;
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikeCount((prev) => prev + (wasLiked ? -1 : 1));
        request("/api/likes", { method: "POST", body: { targetType: "LIVE", targetId: replayId } }).catch(() => {
            setIsLiked(wasLiked);
            setLikeCount((prev) => prev + (wasLiked ? 1 : -1));
        });
    };

    const handleCommentSubmit = async () => {
        if (!newComment.trim() || !replayId || commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            await request("/api/comments", { method: "POST", body: { targetId: replayId, targetType: "LIVE", content: newComment.trim() } });
            setNewComment("");
            loadComments();
        } catch (err) { console.error("댓글 작성 실패", err); }
        finally { setCommentSubmitting(false); }
    };

    const handleCommentDelete = async (commentId) => {
        try { await request(`/api/comments/${commentId}`, { method: "DELETE" }); loadComments(); }
        catch (err) { console.error("댓글 삭제 실패", err); }
    };

    useHls(videoRef, playbackUrl, cfSigningParams);
    const isHls = playbackUrl?.includes(".m3u8");
    const videoSrc = !isHls ? playbackUrl : undefined;

    if (loading && !replay) {
        return (
            <div className="min-h-screen bg-[#0d0b15] flex items-center justify-center">
                <p className="text-white/70">로딩 중...</p>
            </div>
        );
    }

    const isPaidError = error?.includes("구독") || error?.includes("SUBSCRIPTION");
    const backHref = replay?.artistId ? `/artists/${replay.artistId}?tab=REPLAY` : "/";

    if (error && !playbackUrl) {
        return (
            <div className="min-h-screen bg-[#0d0b15] flex flex-col items-center justify-center gap-6 p-6">
                {isPaidError ? (
                    <div className="text-center space-y-4 max-w-md">
                        <span className="material-symbols-outlined text-6xl text-violet-400/60 fill-icon">lock</span>
                        <h2 className="text-xl font-bold text-white">멤버십 전용 다시보기</h2>
                        <p className="text-white/55 text-sm leading-relaxed">
                            이 다시보기는 유료 멤버십 회원만 시청할 수 있습니다.<br />
                            멤버십에 가입하면 모든 프리미엄 콘텐츠를 즐길 수 있어요.
                        </p>
                        <Link href={backHref} className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500/90 text-white rounded-full font-bold text-sm hover:brightness-110 transition-all">
                            아티스트 페이지로 이동
                        </Link>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <span className="material-symbols-outlined text-5xl text-red-400/60">error</span>
                        <p className="text-red-400">{error}</p>
                        <Link href={backHref} className="text-white/70 hover:text-white underline text-sm">돌아가기</Link>
                    </div>
                )}
            </div>
        );
    }

    const displayTitle = replay?.title || (replay?.replayId ? `다시보기 #${replay.replayId}` : "다시보기");
    const publishedDate = replay?.publishedAt
        ? new Date(replay.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
        : null;
    const myUserId = currentUser ? (() => { try { const token = (localStorage.getItem("accessToken") || "").replace(/^Bearer\s+/i, "").trim(); return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))?.userId; } catch { return null; } })() : null;

    return (
        <div className="min-h-screen bg-[#0d0b15] flex flex-col">
            <div className="flex-1 flex flex-col items-center p-4 sm:p-8">
                <div className="w-full max-w-4xl space-y-6">
                    <Link href={backHref} className="inline-flex items-center gap-1.5 text-white/50 hover:text-violet-300 font-bold text-xs uppercase tracking-widest transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>돌아가기
                    </Link>

                    {/* 비디오 영역 */}
                    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
                        {replay?.thumbnailUrl && !playbackUrl && (
                            <div className="w-full aspect-video relative">
                                <img src={replay.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <div className="size-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-4xl fill-icon">play_arrow</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {playbackUrl && (
                            <video ref={videoRef} src={videoSrc} controls autoPlay className="w-full aspect-video bg-black" crossOrigin="use-credentials" playsInline />
                        )}
                    </div>

                    {/* 제목 + 정보 */}
                    {replay && (
                        <div className="space-y-4">
                            <h1 className="text-2xl font-extrabold text-white">{displayTitle}</h1>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    {artistInfo && (
                                        <Link href={`/artists/${replay.artistId}?tab=REPLAY`} className="flex items-center gap-3 group">
                                            <img src={artistInfo.avatar || getDefaultAvatarUrl(artistInfo.name || "?")} alt="" className="size-10 rounded-full object-cover border border-white/[0.08]" />
                                            <div>
                                                <p className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors">{artistInfo.name}</p>
                                                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Artist</p>
                                            </div>
                                        </Link>
                                    )}
                                    <div className="flex items-center gap-3 text-sm text-white/50">
                                        {publishedDate && <span>{publishedDate}</span>}
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${replay.accessType === "PAID" ? "bg-violet-500/20 text-violet-300 border border-violet-400/30" : "bg-white/[0.06] text-white/50"}`}>
                                            {replay.accessType === "PAID" ? "멤버십" : "무료"}
                                        </span>
                                    </div>
                                </div>
                                {currentUser && (
                                    <button type="button" onClick={handleLike} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border transition-all text-sm font-bold ${isLiked ? "bg-violet-500/20 border-violet-400/30 text-violet-300" : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white/80"}`}>
                                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                                        {likeCount > 0 && <span>{likeCount}</span>}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 댓글 */}
                    {replay && (
                        <Surface variant="primary" className="p-6">
                            <h4 className="text-sm font-bold text-white/80 mb-4">댓글 {comments.length > 0 && `(${comments.length})`}</h4>
                            {currentUser && (
                                <div className="flex gap-3 mb-4">
                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(); } }} placeholder="댓글을 입력하세요..." className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30" />
                                    <button type="button" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 transition-colors disabled:opacity-50 shrink-0" onClick={handleCommentSubmit} disabled={commentSubmitting || !newComment.trim()}>
                                        {commentSubmitting ? "..." : "작성"}
                                    </button>
                                </div>
                            )}
                            {commentsLoading ? <p className="text-white/40 text-sm">댓글 로딩 중...</p> : comments.length === 0 ? <p className="text-white/40 text-sm">아직 댓글이 없습니다.</p> : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {comments.map((c) => (
                                        <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                                            <img src={c.profileImageUrl || getDefaultAvatarUrl(c.nickname || "?")} alt="" className="size-8 rounded-full object-cover shrink-0 border border-white/[0.08]" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-white/80 truncate">{c.nickname || "알 수 없음"}</span>
                                                    {c.isArtist && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold">아티스트</span>}
                                                    {c.writerGradeName && !c.isArtist && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-bold">{c.writerGradeName}</span>}
                                                    <span className="text-[10px] text-white/30">{c.createdAt ? new Date(c.createdAt).toLocaleDateString("ko-KR") : ""}</span>
                                                </div>
                                                <p className="text-sm text-white/70 break-words">{c.content}</p>
                                            </div>
                                            {c.userId === myUserId && (
                                                <button type="button" onClick={() => handleCommentDelete(c.id)} className="text-white/30 hover:text-red-400 transition-colors shrink-0" title="삭제">
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Surface>
                    )}
                </div>
            </div>
        </div>
    );
}
