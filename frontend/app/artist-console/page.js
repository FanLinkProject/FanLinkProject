"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/lib/api";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { usePostAttachments } from "@/lib/usePostAttachments";
import { MAX_POST_ATTACHMENTS } from "@/lib/mediaAssetApi";
import { list as listMusicVideos, create as createMusicVideo, remove as removeMusicVideo, getSafeEmbedUrl } from "@/lib/musicVideoApi";
import { uploadFile, MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";
import { listByArtist as listReplays } from "@/lib/replayApi";
import {
    isUpcoming,
    concertIncludesArtist,
    formatDateShort,
    getConcertStatus,
    getConcertStatusBadgeLabel,
    CONCERT_STATUS_KEYS,
} from "@/lib/concertUtils";
import { apiGet } from "@/lib/api";
import {
    getCurrentUser,
    formatTimestamp,
    transformArtistPost,
    transformFanPost,
    POSTS_LIMIT,
} from "@/lib/postUtils";

import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";
import ProfileImageModal from "@/components/common/ProfileImageModal";
import DraggableAttachmentGrid from "@/components/common/DraggableAttachmentGrid";

function getConcertId(concert) {
    if (!concert) return null;
    return concert.id ?? concert.concertId ?? concert.concert_id ?? concert?.concert?.id ?? null;
}

const VALID_TABS = ["POSTS", "FAN_POSTS", "LIVE", "REPLAY", "CONCERT", "MV", "MARKET"];

export default function ArtistConsolePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const [activeTab, setActiveTab] = useState(tabParam && VALID_TABS.includes(tabParam) ? tabParam : "POSTS");

    const [currentUser, setCurrentUser] = useState(null);
    const [myId, setMyId] = useState(null);
    const [groupId, setGroupId] = useState(null);
    const [myProfile, setMyProfile] = useState(null);
    const [groupProfile, setGroupProfile] = useState(null);
    const [totalFollowers, setTotalFollowers] = useState(null);
    const [postCount, setPostCount] = useState(null);
    const [profileBio, setProfileBio] = useState(null);
    const [coverImageUrl, setCoverImageUrl] = useState(null);
    const [coverImageLoading, setCoverImageLoading] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const coverFileRef = useRef(null);

    const [artistPosts, setArtistPosts] = useState([]);
    const [artistPostsLoading, setArtistPostsLoading] = useState(false);
    const [artistPostsHasNext, setArtistPostsHasNext] = useState(false);
    const [artistPostsLastId, setArtistPostsLastId] = useState(null);
    const [artistPostsLoadingMore, setArtistPostsLoadingMore] = useState(false);
    const [artistLikeCountMap, setArtistLikeCountMap] = useState({});
    const [artistIsLikedMap, setArtistIsLikedMap] = useState({});
    const [artistCommentCountMap, setArtistCommentCountMap] = useState({});
    const [artistNotices, setArtistNotices] = useState([]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostIsMembershipOnly, setNewPostIsMembershipOnly] = useState(false);
    const [newPostIsNotice, setNewPostIsNotice] = useState(false);
    const [createPostLoading, setCreatePostLoading] = useState(false);
    const newPostFileInputRef = useRef(null);

    const {
        mediaAssetIds: newPostMediaAssetIds,
        attachmentPreviews: newPostAttachmentPreviews,
        addAttachment: addNewPostAttachment,
        removeAttachment: removeNewPostAttachment,
        setRepresentative: setNewPostRepresentative,
        reorderAttachments: reorderNewPostAttachments,
        resetAttachments: resetNewPostAttachments,
        canAddAttachment: canAddNewPostAttachment,
        uploading: newPostUploading,
        uploadError: newPostUploadError,
        representativeMediaAssetId: newPostRepresentativeId,
    } = usePostAttachments({ postGroupId: groupId, postIdOrTemp: "tmp_new" });

    const [fanPosts, setFanPosts] = useState([]);
    const [fanPostsLoading, setFanPostsLoading] = useState(false);
    const [fanPostsHasNext, setFanPostsHasNext] = useState(false);
    const [fanPostsLastId, setFanPostsLastId] = useState(null);
    const [fanPostsLoadingMore, setFanPostsLoadingMore] = useState(false);
    const [fanLikeCountMap, setFanLikeCountMap] = useState({});
    const [fanIsLikedMap, setFanIsLikedMap] = useState({});
    const [fanCommentCountMap, setFanCommentCountMap] = useState({});

    const artistPostsBottomRef = useRef(null);
    const fanPostsBottomRef = useRef(null);

    const [endedLives, setEndedLives] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);
    const [vodList, setVodList] = useState([]);
    const [vodLoading, setVodLoading] = useState(false);
    const [showProfileImageModal, setShowProfileImageModal] = useState(false);

    const [artistConcerts, setArtistConcerts] = useState([]);
    const [artistConcertsForTab, setArtistConcertsForTab] = useState([]);

    const [mvList, setMvList] = useState([]);
    const [mvLoading, setMvLoading] = useState(false);
    const [mvError, setMvError] = useState(null);
    const [mvShowForm, setMvShowForm] = useState(false);
    const [mvForm, setMvForm] = useState({ url: "", title: "", description: "" });
    const [mvSubmitting, setMvSubmitting] = useState(false);
    const [mvSelectedVideo, setMvSelectedVideo] = useState(null);
    const [mvSearchQuery, setMvSearchQuery] = useState("");
    const [mvComments, setMvComments] = useState([]);
    const [mvCommentsLoading, setMvCommentsLoading] = useState(false);
    const [mvNewComment, setMvNewComment] = useState("");
    const [mvCommentSubmitting, setMvCommentSubmitting] = useState(false);
    const mvSearchTimerRef = useRef(null);

    // --- Data loading ---

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (!user) return;
        request("/api/user/profile")
            .then((data) => { setMyId(data.id ?? null); setMyProfile(data); setGroupId(data.groupId ?? data.id ?? null); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!groupId || !myId) return;
        if (groupId === myId) { setGroupProfile(myProfile); return; }
        request(`/api/user/artists/${groupId}/dashboard`)
            .then((data) => {
                setGroupProfile({ nickname: data.artistInfo?.nickname || "", profileImageUrl: data.artistInfo?.profileImageUrl || "", bio: data.artistInfo?.bio ?? "" });
                const rawMembers = data?.members ?? [];
                setGroupMembers((Array.isArray(rawMembers) ? rawMembers : []).map((m) => ({
                    id: m.memberId ?? m.id,
                    name: m.nickname ?? m.name,
                    avatar: m.profileImageUrl ?? m.avatar,
                })));
            })
            .catch(() => { setGroupProfile(null); setGroupMembers([]); });
    }, [groupId, myId, myProfile]);

    useEffect(() => {
        if (!groupId) return;
        request(`/api/live-sessions?artistId=${groupId}&status=ENDED`)
            .then((list) => setEndedLives(Array.isArray(list) ? list : []))
            .catch(() => setEndedLives([]));
    }, [groupId]);

    useEffect(() => {
        if (!groupId) return;
        request(`/api/live-sessions?artistId=${groupId}&status=LIVE`)
            .then((list) => setLiveSessions(Array.isArray(list) ? list : []))
            .catch(() => setLiveSessions([]));
    }, [groupId]);

    useEffect(() => {
        if (activeTab !== "REPLAY" || !groupId) return;
        setVodLoading(true);
        listReplays(groupId)
            .then((list) => setVodList(Array.isArray(list) ? list : []))
            .catch(() => setVodList([]))
            .finally(() => setVodLoading(false));
    }, [activeTab, groupId]);

    useEffect(() => {
        if (!groupId) return;
        request("/api/artist-posts/notices", { query: { groupId, limit: 3 } })
            .then((data) => setArtistNotices(Array.isArray(data) ? data : (data?.content ?? [])))
            .catch(() => setArtistNotices([]));
    }, [groupId]);

    const displayName = groupProfile?.nickname || myProfile?.nickname || "Studio";

    useEffect(() => {
        if (!displayName) return;
        apiGet("/api/concerts", { query: { includeEnded: "true" } })
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                const forArtist = list.filter(c => concertIncludesArtist(c, displayName));
                setArtistConcerts(forArtist.filter(c => isUpcoming(c)));
                setArtistConcertsForTab(forArtist);
            })
            .catch(() => { setArtistConcerts([]); setArtistConcertsForTab([]); });
    }, [displayName]);

    const loadMvList = useCallback((keyword) => {
        if (!groupId) return;
        setMvLoading(true); setMvError(null);
        listMusicVideos(groupId, keyword)
            .then(setMvList)
            .catch((e) => { setMvError(e?.data?.message || e.message || "목록 조회 실패"); setMvList([]); })
            .finally(() => setMvLoading(false));
    }, [groupId]);

    useEffect(() => { if (activeTab === "MV") loadMvList(mvSearchQuery); }, [activeTab, groupId]);

    useEffect(() => {
        if (activeTab !== "MV" || !groupId) return;
        clearTimeout(mvSearchTimerRef.current);
        mvSearchTimerRef.current = setTimeout(() => loadMvList(mvSearchQuery), 300);
        return () => clearTimeout(mvSearchTimerRef.current);
    }, [mvSearchQuery]);

    const loadMvComments = useCallback((videoId) => {
        if (!videoId) return;
        setMvCommentsLoading(true);
        request(`/api/comments?targetType=MEDIA&targetId=${videoId}&size=50`)
            .then((data) => setMvComments(data?.content || []))
            .catch(() => setMvComments([]))
            .finally(() => setMvCommentsLoading(false));
    }, []);

    useEffect(() => { if (mvSelectedVideo?.id) loadMvComments(mvSelectedVideo.id); else setMvComments([]); }, [mvSelectedVideo?.id]);

    const handleCoverImageUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file || !groupId || !file.type.startsWith("image/")) return;
        setCoverImageLoading(true);
        try {
            const result = await uploadFile(file, { category: MediaAssetCategory.ARTIST_COVER_IMAGE, scope: MediaAssetScope.PUBLIC, artistId: groupId });
            if (result?.mediaAssetId && result.status === "READY") {
                await request("/api/artist/profile", { method: "PATCH", body: { bannerImageMediaAssetId: result.mediaAssetId } });
                setCoverImageUrl(result.url || URL.createObjectURL(file));
            }
        } catch (err) { console.error("커버 이미지 업로드 실패", err); }
        finally { setCoverImageLoading(false); if (coverFileRef.current) coverFileRef.current.value = ""; }
    }, [groupId]);

    useEffect(() => {
        if (!myId) return;
        request("/api/artist/mypage")
            .then((data) => {
                setTotalFollowers(data?.fanDailyGraph?.totalFollowers != null ? Number(data.fanDailyGraph.totalFollowers) : null);
                setProfileBio(data?.profile?.bio && String(data.profile.bio).trim() !== "" ? String(data.profile.bio).trim() : null);
                if (data?.profile?.bannerImageUrl) setCoverImageUrl(data.profile.bannerImageUrl);
            })
            .catch(() => { setTotalFollowers(null); setProfileBio(null); });
    }, [myId]);

    useEffect(() => {
        if (!myId) return;
        request("/api/artist/home")
            .then((data) => setPostCount(data?.postCount ?? null))
            .catch(() => {});
    }, [myId]);

    const fetchArtistPostsMeta = useCallback(async (transformed) => {
        if (transformed.length === 0) return;
        const user = getCurrentUser();
        const ids = transformed.map((p) => p.id).join(",");
        const [countRes, checkRes, commentCountRes] = await Promise.all([
            request("/api/likes/counts", { query: { targetType: "ARTIST_POST", targetIds: ids } }).catch(() => ({})),
            user ? request("/api/likes/check", { query: { targetType: "ARTIST_POST", targetIds: ids } }).catch(() => []) : Promise.resolve([]),
            request("/api/comments/counts", { query: { targetType: "ARTIST", targetIds: ids } }).catch(() => ({})),
        ]);
        setArtistLikeCountMap((prev) => ({ ...prev, ...(countRes || {}) }));
        setArtistCommentCountMap((prev) => ({ ...prev, ...(commentCountRes || {}) }));
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        setArtistIsLikedMap((prev) => ({ ...prev, ...Object.fromEntries(transformed.map((p) => [p.id, likedSet.has(Number(p.id))])) }));
    }, []);

    const fetchFanPostsMeta = useCallback(async (transformed) => {
        if (transformed.length === 0) return;
        const user = getCurrentUser();
        const ids = transformed.map((p) => p.id).join(",");
        const [countRes, checkRes, commentCountRes] = await Promise.all([
            request("/api/likes/counts", { query: { targetType: "FAN_POST", targetIds: ids } }).catch(() => ({})),
            user ? request("/api/likes/check", { query: { targetType: "FAN_POST", targetIds: ids } }).catch(() => []) : Promise.resolve([]),
            request("/api/comments/counts", { query: { targetType: "FAN", targetIds: ids } }).catch(() => ({})),
        ]);
        setFanLikeCountMap((prev) => ({ ...prev, ...(countRes || {}) }));
        setFanCommentCountMap((prev) => ({ ...prev, ...(commentCountRes || {}) }));
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        setFanIsLikedMap((prev) => ({ ...prev, ...Object.fromEntries(transformed.map((p) => [p.id, likedSet.has(Number(p.id))])) }));
    }, []);

    useEffect(() => {
        if (activeTab !== "POSTS" || !groupId) return;
        setArtistPostsLoading(true); setArtistPostsHasNext(false); setArtistPostsLastId(null);
        request("/api/artist-posts/artist-only", { query: { groupId, limit: POSTS_LIMIT } })
            .then(async (data) => {
                const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
                const transformed = raw.map(transformArtistPost);
                setArtistPosts(transformed);
                setArtistPostsHasNext(raw.length === POSTS_LIMIT);
                if (transformed.length > 0) setArtistPostsLastId(transformed[transformed.length - 1].id);
                await fetchArtistPostsMeta(transformed);
            })
            .catch(() => setArtistPosts([]))
            .finally(() => setArtistPostsLoading(false));
    }, [activeTab, groupId]);

    useEffect(() => {
        if (activeTab !== "FAN_POSTS" || !groupId) return;
        setFanPostsLoading(true); setFanPostsHasNext(false); setFanPostsLastId(null);
        request("/api/fan-posts", { query: { groupId, limit: POSTS_LIMIT } })
            .then(async (data) => {
                const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
                const transformed = raw.map(transformFanPost);
                setFanPosts(transformed);
                setFanPostsHasNext(raw.length === POSTS_LIMIT);
                if (transformed.length > 0) setFanPostsLastId(transformed[transformed.length - 1].id);
                await fetchFanPostsMeta(transformed);
            })
            .catch(() => setFanPosts([]))
            .finally(() => setFanPostsLoading(false));
    }, [activeTab, groupId]);

    const loadMoreArtistPosts = useCallback(async () => {
        if (!groupId || artistPostsLoadingMore || !artistPostsHasNext || !artistPostsLastId) return;
        setArtistPostsLoadingMore(true);
        try {
            const data = await request("/api/artist-posts/artist-only", { query: { groupId, lastPostId: artistPostsLastId, limit: POSTS_LIMIT } });
            const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
            const newPosts = raw.map(transformArtistPost);
            setArtistPosts((prev) => [...prev, ...newPosts]);
            setArtistPostsHasNext(raw.length === POSTS_LIMIT);
            if (newPosts.length > 0) setArtistPostsLastId(newPosts[newPosts.length - 1].id);
            await fetchArtistPostsMeta(newPosts);
        } catch {}
        setArtistPostsLoadingMore(false);
    }, [groupId, artistPostsLoadingMore, artistPostsHasNext, artistPostsLastId, fetchArtistPostsMeta]);

    const loadMoreFanPosts = useCallback(async () => {
        if (!groupId || fanPostsLoadingMore || !fanPostsHasNext || !fanPostsLastId) return;
        setFanPostsLoadingMore(true);
        try {
            const data = await request("/api/fan-posts", { query: { groupId, lastPostId: fanPostsLastId, limit: POSTS_LIMIT } });
            const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
            const newPosts = raw.map(transformFanPost);
            setFanPosts((prev) => [...prev, ...newPosts]);
            setFanPostsHasNext(raw.length === POSTS_LIMIT);
            if (newPosts.length > 0) setFanPostsLastId(newPosts[newPosts.length - 1].id);
            await fetchFanPostsMeta(newPosts);
        } catch {}
        setFanPostsLoadingMore(false);
    }, [groupId, fanPostsLoadingMore, fanPostsHasNext, fanPostsLastId, fetchFanPostsMeta]);

    useEffect(() => {
        if (!artistPostsHasNext || artistPostsLoading) return;
        const el = artistPostsBottomRef.current; if (!el) return;
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMoreArtistPosts(); }, { rootMargin: "100px" });
        observer.observe(el); return () => observer.disconnect();
    }, [artistPostsHasNext, artistPostsLastId, loadMoreArtistPosts, artistPostsLoading]);

    useEffect(() => {
        if (!fanPostsHasNext || fanPostsLoading) return;
        const el = fanPostsBottomRef.current; if (!el) return;
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMoreFanPosts(); }, { rootMargin: "100px" });
        observer.observe(el); return () => observer.disconnect();
    }, [fanPostsHasNext, fanPostsLastId, loadMoreFanPosts, fanPostsLoading]);

    // --- Handlers ---

    const handleMvSubmit = async (e) => {
        e.preventDefault();
        if (!mvForm.url.trim() || !mvForm.title.trim() || !mvForm.description.trim()) return;
        setMvSubmitting(true); setMvError(null);
        try { await createMusicVideo(groupId, mvForm); setMvForm({ url: "", title: "", description: "" }); setMvShowForm(false); loadMvList(mvSearchQuery); }
        catch (err) { setMvError(err?.data?.message || err.message || "등록 실패"); }
        finally { setMvSubmitting(false); }
    };

    const handleMvDelete = async (id) => {
        if (!confirm("이 뮤직비디오를 삭제할까요?")) return;
        setMvError(null);
        try { await removeMusicVideo(groupId, id); if (mvSelectedVideo?.id === id) setMvSelectedVideo(null); loadMvList(mvSearchQuery); }
        catch (err) { setMvError(err?.data?.message || err.message || "삭제 실패"); }
    };

    const handleMvCommentSubmit = async () => {
        if (!mvNewComment.trim() || !mvSelectedVideo?.id || mvCommentSubmitting) return;
        setMvCommentSubmitting(true);
        try { await request("/api/comments", { method: "POST", body: { targetId: mvSelectedVideo.id, targetType: "MEDIA", content: mvNewComment.trim() } }); setMvNewComment(""); loadMvComments(mvSelectedVideo.id); }
        catch (err) { console.error("댓글 작성 실패", err); }
        finally { setMvCommentSubmitting(false); }
    };

    const handleMvCommentDelete = async (commentId) => {
        try { await request(`/api/comments/${commentId}`, { method: "DELETE" }); loadMvComments(mvSelectedVideo.id); }
        catch (err) { console.error("댓글 삭제 실패", err); }
    };

    const closeCreateModal = () => { setNewPostContent(""); setNewPostIsMembershipOnly(false); setNewPostIsNotice(false); resetNewPostAttachments(); setShowCreateModal(false); };

    const handleNewPostFileChange = async (e) => { const file = e?.target?.files?.[0]; if (!file) return; await addNewPostAttachment(file); e.target.value = ""; };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || createPostLoading || !groupId) return;
        setCreatePostLoading(true);
        try {
            const created = await request("/api/artist-posts", {
                method: "POST",
                body: { groupId, title: "", content: newPostContent.trim(), isMembershipOnly: newPostIsMembershipOnly, isNotice: newPostIsNotice, mediaAssetIds: newPostMediaAssetIds.length > 0 ? newPostMediaAssetIds : null, representativeMediaAssetId: newPostRepresentativeId },
            });
            setArtistPosts((prev) => [transformArtistPost(created), ...prev]);
            closeCreateModal();
        } catch (err) { console.error("아티스트 포스트 생성 실패", err); }
        finally { setCreatePostLoading(false); }
    };

    const handleArtistPostLike = (postId) => {
        if (!currentUser) { router.push("/login"); return; }
        const wasLiked = !!artistIsLikedMap[postId];
        setArtistIsLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
        setArtistLikeCountMap((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1) }));
        request("/api/likes", { method: "POST", body: { targetType: "ARTIST_POST", targetId: postId } }).catch(() => {
            setArtistIsLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
            setArtistLikeCountMap((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? 1 : -1) }));
        });
    };

    const handleEditArtistPost = (postId) => router.push(`/artist-console/posts/${postId}/edit`);

    const handleDeleteArtistPost = async (postId) => {
        if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
        try { await request(`/api/artist-posts/${postId}`, { method: "DELETE" }); setArtistPosts((prev) => prev.filter((p) => p.id !== postId)); }
        catch (err) { console.error("게시글 삭제 실패", err); }
    };

    const handleFanPostLike = (postId) => {
        if (!currentUser) { router.push("/login"); return; }
        const wasLiked = !!fanIsLikedMap[postId];
        setFanIsLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
        setFanLikeCountMap((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1) }));
        request("/api/likes", { method: "POST", body: { targetType: "FAN_POST", targetId: postId } }).catch(() => {
            setFanIsLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
            setFanLikeCountMap((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? 1 : -1) }));
        });
    };

    const handleTabClick = (tabId) => {
        if (tabId === "MARKET") { router.push(`/artists/${groupId}/market`); return; }
        setActiveTab(tabId);
        window.history.replaceState(null, "", `?tab=${tabId}`);
    };

    const displayAvatar = groupProfile?.profileImageUrl || myProfile?.profileImageUrl || "";
    const displayBio = (groupId === myId ? profileBio : groupProfile?.bio) ?? "";

    const tabs = [
        { id: "POSTS", label: "Artist" },
        { id: "FAN_POSTS", label: "Fan" },
        { id: "LIVE", label: "Live" },
        { id: "REPLAY", label: "Replay" },
        { id: "CONCERT", label: "Concert" },
        { id: "MV", label: "MV" },
        { id: "MARKET", label: "Market" },
    ];

    return (
        <div className="flex flex-col min-h-full relative pb-20">
            {/* 커버 — h-64 풀폭 배너 + 직접 업로드 */}
            <div className="h-64 w-full relative overflow-hidden shrink-0 group/cover">
                {coverImageUrl ? <img src={coverImageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-indigo-900/30" />}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0814]/40 to-[#0b0814]" />
                <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverImageUpload} />
                <button
                    type="button" onClick={() => coverFileRef.current?.click()} disabled={coverImageLoading}
                    className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-black/50 hover:bg-violet-600/80 text-white text-sm font-medium border border-white/10 opacity-0 group-hover/cover:opacity-100 transition-opacity disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-sm mr-1 align-middle">photo_camera</span>
                    {coverImageLoading ? "업로드 중..." : coverImageUrl ? "커버 변경" : "커버 추가"}
                </button>
            </div>

            {/* 프로필 카드 — 160px 아바타, 겹침, 호버 사진 변경 */}
            <div className="max-w-6xl w-full mx-auto px-8 relative -mt-20 z-10 shrink-0">
                <Surface variant="primary" className="p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-end gap-6">
                        <div className="relative group shrink-0 rounded-2xl border-2 border-white/[0.08] shadow-2xl -mt-24 overflow-hidden bg-[#201a33] size-40">
                            {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" alt={displayName} /> : <div className="w-full h-full bg-white/10" />}
                            <button type="button" onClick={() => setShowProfileImageModal(true)} className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                                사진 변경
                            </button>
                        </div>
                        <div className="pb-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-4xl font-bold text-white tracking-tight">{displayName}</h1>
                                <span className="material-symbols-outlined text-violet-300 text-2xl">verified</span>
                            </div>
                            <p className="text-white/55 font-medium mt-2">
                                팔로워 {totalFollowers != null ? Number(totalFollowers).toLocaleString() : "—"} • 포스트 {postCount != null ? Number(postCount).toLocaleString() : "—"}개
                            </p>
                            {displayBio && <p className="text-white/70 font-medium mt-2 whitespace-pre-wrap text-sm">{displayBio}</p>}
                            {groupId !== myId && myProfile && (
                                <div className="mt-3 flex items-center gap-2">
                                    {myProfile.profileImageUrl && <img src={myProfile.profileImageUrl} className="size-6 rounded-full border border-white/[0.12] shrink-0" alt="" />}
                                    <span className="text-white/50 text-sm font-medium">{myProfile.nickname}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pb-1 flex flex-col items-end gap-3">
                        {groupMembers.length > 0 && (
                            <div className="flex items-center gap-3 flex-wrap justify-end">
                                {groupMembers.map((m) => (
                                    <div key={m.id} className="flex flex-col items-center gap-1">
                                        <img src={m.avatar || ""} className="size-9 rounded-full object-cover border border-white/[0.08]" alt="" />
                                        <span className="text-[10px] font-medium text-white/60 truncate max-w-[72px]">{m.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            {activeTab === "POSTS" && (
                                <Button variant="primary" className="text-xs uppercase tracking-widest px-6 py-3 shrink-0" onClick={() => setShowCreateModal(true)}>
                                    <span className="material-symbols-outlined text-lg mr-1.5 align-middle">edit_note</span>새 글 작성
                                </Button>
                            )}
                            {activeTab === "MV" && (
                                <Button variant="primary" className="text-xs uppercase tracking-widest px-6 py-3 shrink-0" onClick={() => setMvShowForm((v) => !v)}>
                                    <span className="material-symbols-outlined text-lg mr-1.5 align-middle">video_call</span>{mvShowForm ? "취소" : "영상 등록"}
                                </Button>
                            )}
                        </div>
                    </div>
                </Surface>
            </div>

            {/* 예정 콘서트 */}
            {activeTab !== "CONCERT" && artistConcerts.length > 0 && (() => {
                const now = new Date();
                return (
                    <div className="max-w-6xl w-full mx-auto px-8 mt-12">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5 px-1">Upcoming Concerts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {artistConcerts.map((c, i) => {
                                const concertId = getConcertId(c);
                                const status = getConcertStatus(c, now);
                                const badgeLabel = getConcertStatusBadgeLabel(c, now);
                                const badgeClass = { [CONCERT_STATUS_KEYS.LIVE]: "bg-amber-500/90 text-black font-medium", [CONCERT_STATUS_KEYS.ENDED]: "bg-white/20 text-white/90", [CONCERT_STATUS_KEYS.SALE]: "bg-violet-500/90 text-white font-medium", [CONCERT_STATUS_KEYS.PRESALE]: "bg-violet-400/80 text-white font-medium", [CONCERT_STATUS_KEYS.SALE_UPCOMING]: "bg-amber-500/90 text-white font-medium", [CONCERT_STATUS_KEYS.UPCOMING]: "bg-white/10 text-white/80 border border-white/20 font-medium" }[status.key] ?? "bg-white/20 text-white/90 font-medium";
                                const key = concertId ?? `concert-${i}`;
                                const cls = "group block rounded-2xl border border-white/5 bg-white/[0.03] hover:border-violet-500/40 transition-all overflow-hidden";
                                const inner = (<><div className="aspect-[16/10] overflow-hidden relative"><img src={c.concertImageUrl || c.posterImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /><span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>{badgeLabel}</span></div><div className="p-5"><h4 className="font-bold text-white truncate">{c.title}</h4><p className="text-white/50 text-xs mt-2 flex flex-wrap items-center gap-x-2 gap-y-1"><span>{formatDateShort(c.startDateTime)}</span><span>•</span><span>{c.placeName || c.venueName}</span></p></div></>);
                                return concertId ? <Link key={key} href={`/concerts/${concertId}`} className={cls}>{inner}</Link> : <div key={key} className={cls}>{inner}</div>;
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* 탭 — pill 스타일 + sticky */}
            <div className="sticky top-16 bg-[#0b0814]/95 backdrop-blur-md z-20 mt-12">
                <div className="max-w-6xl mx-auto px-8 py-3">
                    <div className="flex items-center gap-2 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06] overflow-x-auto">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-[#201a33] text-violet-300 border border-white/[0.08]" : "text-white/55 hover:text-white/80"}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 공지사항 — POSTS 탭에서만 노출 */}
            {activeTab === "POSTS" && artistNotices.length > 0 && (() => {
                const latest = artistNotices[0];
                return (
                    <div className="max-w-6xl w-full mx-auto px-8 pt-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h3 className="text-xs font-black text-white/50 uppercase tracking-widest">공지사항</h3>
                            <Link href={`/artists/${groupId}/notices`} className="text-xs font-bold text-violet-300 hover:text-violet-200 flex items-center gap-1">
                                전체 공지 확인<span className="material-symbols-outlined text-sm">chevron_right</span>
                            </Link>
                        </div>
                        <Link href={`/posts/${latest.id}?type=ARTIST&groupId=${groupId}`} className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-violet-500/30 hover:bg-white/[0.05] transition-all p-5">
                            <div className="flex gap-3 items-center mb-2">
                                <span className="bg-white/10 text-white/60 text-[10px] px-2 py-1 rounded font-bold">NOTICE</span>
                                <span className="text-white/40 text-xs">{formatTimestamp(latest.createdAt)}</span>
                            </div>
                            <p className="text-white/80 font-medium line-clamp-2">{latest.title || (latest.content ? `${(latest.content || "").slice(0, 80)}${(latest.content || "").length > 80 ? "..." : ""}` : "공지")}</p>
                        </Link>
                    </div>
                );
            })()}

            {/* 메인 콘텐츠 */}
            <div className="max-w-6xl w-full mx-auto px-8 py-10">
                <div className="w-full space-y-6">
                    {/* POSTS (Artist) 탭 */}
                    {activeTab === "POSTS" && (
                        artistPostsLoading ? (
                            <Surface variant="primary" className="py-12 text-center"><p className="text-white/55">로딩 중...</p></Surface>
                        ) : artistPosts.length === 0 ? (
                            <Surface variant="primary" className="py-20 text-center"><p className="text-white/55 italic">아직 게시글이 없습니다.</p></Surface>
                        ) : (
                            <>
                                <PostFeed posts={artistPosts} postLinkBase="/posts" postLinkQuery={`type=ARTIST&groupId=${groupId}&from=artist-console`} showVerifiedByType={true} isLikedMap={artistIsLikedMap} likeCountMap={artistLikeCountMap} commentCountMap={artistCommentCountMap} onLike={handleArtistPostLike} onComment={(postId) => router.push(`/posts/${postId}?type=ARTIST&groupId=${groupId}&from=artist-console`)} onEdit={handleEditArtistPost} onDelete={handleDeleteArtistPost} canEditSet={myId ? new Set(artistPosts.filter((p) => Number(p.writerId) === Number(myId)).map((p) => p.id)) : undefined} canDeleteSet={myId ? new Set(artistPosts.filter((p) => Number(p.writerId) === Number(myId)).map((p) => p.id)) : undefined} />
                                <div ref={artistPostsBottomRef} className="py-1">{artistPostsLoadingMore && <p className="text-white/40 text-xs text-center py-4">불러오는 중...</p>}</div>
                            </>
                        )
                    )}

                    {/* FAN_POSTS 탭 — 읽기 전용 (작성 버튼 없음) */}
                    {activeTab === "FAN_POSTS" && (
                        fanPostsLoading ? (
                            <Surface variant="primary" className="py-12 text-center"><p className="text-white/55">로딩 중...</p></Surface>
                        ) : fanPosts.length === 0 ? (
                            <Surface variant="primary" className="py-20 text-center"><p className="text-white/55 italic">팬 게시글이 없습니다.</p></Surface>
                        ) : (
                            <>
                                <PostFeed posts={fanPosts} postLinkBase="/posts" postLinkQuery={`type=FAN&groupId=${groupId}&from=artist-console`} showVerifiedByType={true} isLikedMap={fanIsLikedMap} likeCountMap={fanLikeCountMap} commentCountMap={fanCommentCountMap} onLike={handleFanPostLike} onComment={(postId) => router.push(`/posts/${postId}?type=FAN&groupId=${groupId}&from=artist-console`)} />
                                <div ref={fanPostsBottomRef} className="py-1">{fanPostsLoadingMore && <p className="text-white/40 text-xs text-center py-4">불러오는 중...</p>}</div>
                            </>
                        )
                    )}

                    {/* LIVE 탭 — 진행 중 라이브 + 종료된 라이브 기록 */}
                    {activeTab === "LIVE" && (
                        <div className="space-y-12">
                            {liveSessions.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-black text-white/40 mb-6 uppercase tracking-widest">Live Now</h3>
                                    <div className="grid gap-6">
                                        {liveSessions.map(session => (
                                            <div key={session.id} className="relative aspect-video rounded-3xl overflow-hidden">
                                                <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-indigo-900/20" />
                                                <div className="absolute inset-0 bg-black/40" />
                                                <div className="absolute top-4 left-4 flex gap-2">
                                                    <span className="bg-red-600 px-3 py-1 text-[10px] font-black rounded text-white">LIVE</span>
                                                    {session.isPaid && <span className="bg-violet-600 px-3 py-1 text-[10px] font-black rounded text-white">MEMBERSHIP</span>}
                                                </div>
                                                <div className="absolute bottom-6 left-6 text-left"><h4 className="text-2xl font-bold text-white">{session.title}</h4></div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">종료된 라이브</h3>
                                    <Button variant="ghost" href="/artist-console/live" className="text-xs uppercase tracking-widest">다시보기 관리</Button>
                                </div>
                                {endedLives.length === 0 ? (
                                    <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">종료된 라이브가 없습니다.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        {endedLives.map((live) => (
                                            <Surface key={live.id} variant="card" className="overflow-hidden">
                                                <div className="aspect-video relative overflow-hidden bg-white/5">
                                                    {(live.thumbnailUrl || live.thumbnail) ? <img src={live.thumbnailUrl || live.thumbnail} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/30"><span className="material-symbols-outlined text-4xl">videocam_off</span></div>}
                                                </div>
                                                <div className="p-4"><h4 className="font-bold text-white truncate">{live.title || "제목 없음"}</h4></div>
                                            </Surface>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* REPLAY 탭 — 2열 카드형 + 다시보기 관리 버튼 */}
                    {activeTab === "REPLAY" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Replay (VOD)</h3>
                                <Button variant="ghost" href="/artist-console/live" className="text-xs uppercase tracking-widest">다시보기 관리</Button>
                            </div>
                            {vodLoading ? (
                                <p className="text-white/40 py-12 text-center">로딩 중...</p>
                            ) : vodList.length > 0 ? (
                                <div className="grid grid-cols-2 gap-6">
                                    {vodList.map((vod) => (
                                        <Link key={vod.replayId} href={`/replay/${vod.replayId}`} className="group">
                                            <div className="aspect-video rounded-2xl overflow-hidden relative mb-3 bg-gradient-to-br from-violet-900/30 to-indigo-900/20 border border-white/[0.06]">
                                                {vod.thumbnailUrl ? <img src={vod.thumbnailUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-5xl text-white/15">smart_display</span></div>}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity"><div className="size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><span className="material-symbols-outlined text-white text-3xl fill-icon">play_arrow</span></div></div>
                                                {vod.accessType === "PAID" && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-violet-500/80 text-[9px] font-black text-white uppercase">멤버십</span>}
                                            </div>
                                            <h5 className="font-bold text-white truncate">{vod.title || `다시보기 #${vod.replayId}`}</h5>
                                            <p className="text-white/40 text-xs mt-1">{vod.publishedAt ? new Date(vod.publishedAt).toLocaleDateString("ko-KR") : ""}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">다시보기가 없습니다.</p>
                            )}
                        </div>
                    )}

                    {/* CONCERT 탭 — 인라인 그리드 */}
                    {activeTab === "CONCERT" && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 px-1">Concert</h3>
                            {artistConcertsForTab.length === 0 ? (
                                <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">공연이 없습니다.</p>
                            ) : (() => {
                                const now = new Date();
                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {artistConcertsForTab.map((c, i) => {
                                            const concertId = getConcertId(c);
                                            const key = concertId ?? `concert-${i}`;
                                            const status = getConcertStatus(c, now);
                                            const badgeLabel = getConcertStatusBadgeLabel(c, now);
                                            const badgeClass = { [CONCERT_STATUS_KEYS.LIVE]: "bg-amber-500/90 text-black font-medium", [CONCERT_STATUS_KEYS.ENDED]: "bg-white/20 text-white/90", [CONCERT_STATUS_KEYS.SALE]: "bg-violet-500/90 text-white font-medium", [CONCERT_STATUS_KEYS.PRESALE]: "bg-violet-400/80 text-white font-medium", [CONCERT_STATUS_KEYS.SALE_UPCOMING]: "bg-amber-500/90 text-white font-medium", [CONCERT_STATUS_KEYS.UPCOMING]: "bg-white/10 text-white/80 border border-white/20 font-medium" }[status.key] ?? "bg-white/20 text-white/90 font-medium";
                                            const cls = "group block rounded-2xl border border-white/5 bg-white/[0.03] hover:border-violet-500/40 transition-all overflow-hidden";
                                            const inner = (<><div className="aspect-[16/10] overflow-hidden relative"><img src={c.concertImageUrl || c.posterImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /><span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>{badgeLabel}</span></div><div className="p-5"><h4 className="font-bold text-white truncate">{c.title}</h4><p className="text-white/50 text-xs mt-2 flex flex-wrap items-center gap-x-2 gap-y-1"><span>{formatDateShort(c.startDateTime)}</span><span>•</span><span>{c.placeName || c.venueName}</span></p></div></>);
                                            return concertId ? <Link key={key} href={`/concerts/${concertId}`} className={cls}>{inner}</Link> : <div key={key} className={cls}>{inner}</div>;
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* MV 탭 — 등록/삭제 포함, 검색창 항상 노출 */}
                    {activeTab === "MV" && (
                        <div className="space-y-6">
                            {mvError && <p className="text-red-400 text-sm">{mvError}</p>}

                            {mvShowForm && (
                                <Surface variant="primary" className="p-6">
                                    <h3 className="font-bold text-white mb-4">새 뮤직비디오 등록</h3>
                                    <form onSubmit={handleMvSubmit} className="space-y-3 max-w-lg">
                                        <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-white/55">YouTube URL</span><input type="url" value={mvForm.url} onChange={(e) => setMvForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white" required /></label>
                                        <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-white/55">제목 (150자)</span><input type="text" maxLength={150} value={mvForm.title} onChange={(e) => setMvForm((f) => ({ ...f, title: e.target.value }))} className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white" required /></label>
                                        <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-white/55">설명 (2000자)</span><textarea maxLength={2000} value={mvForm.description} onChange={(e) => setMvForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white min-h-[80px]" required /></label>
                                        <Button type="submit" variant="primary" disabled={mvSubmitting}>{mvSubmitting ? "등록 중..." : "등록"}</Button>
                                    </form>
                                </Surface>
                            )}

                            {mvSelectedVideo && (
                                <Surface variant="primary" className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-white truncate flex-1 mr-4">{mvSelectedVideo.title}</h3>
                                        <button type="button" onClick={() => setMvSelectedVideo(null)} className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors shrink-0"><span className="material-symbols-outlined text-lg">close</span></button>
                                    </div>
                                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                        <iframe src={getSafeEmbedUrl(mvSelectedVideo.embedUrl)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" title={mvSelectedVideo.title} referrerPolicy="strict-origin-when-cross-origin" />
                                    </div>
                                    {mvSelectedVideo.description && <p className="text-white/60 text-sm mt-4 whitespace-pre-wrap line-clamp-4">{mvSelectedVideo.description}</p>}
                                    <div className="mt-6 border-t border-white/[0.06] pt-6">
                                        <h4 className="text-sm font-bold text-white/80 mb-4">댓글 {mvComments.length > 0 && `(${mvComments.length})`}</h4>
                                        <div className="flex gap-3 mb-4">
                                            <input type="text" value={mvNewComment} onChange={(e) => setMvNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleMvCommentSubmit(); } }} placeholder="댓글을 입력하세요..." className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30" />
                                            <Button variant="primary" className="px-4 py-2 text-xs shrink-0" onClick={handleMvCommentSubmit} disabled={mvCommentSubmitting || !mvNewComment.trim()}>{mvCommentSubmitting ? "..." : "작성"}</Button>
                                        </div>
                                        {mvCommentsLoading ? <p className="text-white/40 text-sm">댓글 로딩 중...</p> : mvComments.length === 0 ? <p className="text-white/40 text-sm">아직 댓글이 없습니다.</p> : (
                                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                                {mvComments.map((c) => (
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
                                                        {c.userId === myId && <button type="button" onClick={() => handleMvCommentDelete(c.id)} className="text-white/30 hover:text-red-400 transition-colors shrink-0" title="삭제"><span className="material-symbols-outlined text-sm">delete</span></button>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Surface>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-white">등록된 뮤직비디오</h3>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                                        <input type="text" value={mvSearchQuery} onChange={(e) => setMvSearchQuery(e.target.value)} placeholder="제목 또는 설명 검색" className="pl-9 pr-4 py-2 rounded-xl bg-[#16102a] border border-white/[0.08] text-white text-sm w-64 placeholder:text-white/30" />
                                    </div>
                                </div>
                                {mvLoading ? (
                                    <Surface variant="primary" className="py-12 text-center"><p className="text-white/55">로딩 중...</p></Surface>
                                ) : mvList.length === 0 && mvSearchQuery.trim() ? (
                                    <Surface variant="primary" className="p-12 text-center"><p className="text-white/55">검색 결과가 없습니다.</p></Surface>
                                ) : mvList.length === 0 ? (
                                    <Surface variant="primary" className="p-12 text-center"><p className="text-white/55 font-medium">등록된 영상이 없습니다.</p></Surface>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        {mvList.map((v) => (
                                            <Surface key={v.id} variant="card" className={`overflow-hidden group transition-all ${mvSelectedVideo?.id === v.id ? "ring-2 ring-violet-500" : ""}`}>
                                                <button type="button" onClick={() => setMvSelectedVideo(v)} className="w-full text-left">
                                                    <div className="aspect-video relative overflow-hidden">
                                                        {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-4xl text-white/20">videocam_off</span></div>}
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity"><span className="material-symbols-outlined text-white text-5xl">play_circle</span></div>
                                                    </div>
                                                </button>
                                                <div className="p-4 flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1"><h4 className="font-bold text-white truncate">{v.title}</h4><p className="text-sm text-white/50 truncate mt-0.5">{v.description}</p></div>
                                                    <button type="button" className="size-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0" onClick={(e) => { e.stopPropagation(); handleMvDelete(v.id); }} title="삭제"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                </div>
                                            </Surface>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 게시물 작성 모달 — 작성자 표시, 멤버십/공지 토글 */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                    <Surface variant="primary" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 sm:p-10">
                        <div className="flex justify-between items-center mb-6 sticky top-0 z-10">
                            <h3 className="text-xl font-semibold text-white">새 글 작성</h3>
                            <button type="button" onClick={closeCreateModal} className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"><span className="material-symbols-outlined text-lg">close</span></button>
                        </div>
                        {displayAvatar && (
                            <div className="flex items-center gap-3 mb-6">
                                <img src={displayAvatar} className="size-10 rounded-full border border-white/[0.08]" alt="" />
                                <div><p className="font-bold text-white text-sm">{displayName}</p><p className="text-[10px] text-white/55 font-black uppercase tracking-widest">Official Artist</p></div>
                            </div>
                        )}
                        <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} autoFocus className="w-full min-h-[180px] bg-[#201a33] rounded-2xl p-4 border border-white/[0.06] outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder:text-white/40 font-medium resize-y" placeholder="팬들에게 전할 말을 적어주세요." />
                        <label className="flex items-center gap-3 mt-4 cursor-pointer w-fit">
                            <div className={`relative w-10 h-5 rounded-full transition-colors ${newPostIsMembershipOnly ? "bg-violet-500" : "bg-white/[0.12]"}`} onClick={() => setNewPostIsMembershipOnly((v) => !v)}>
                                <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${newPostIsMembershipOnly ? "translate-x-5" : "translate-x-0.5"}`} />
                            </div>
                            <span className="text-sm font-bold text-white/70">멤버십 전용</span>
                            {newPostIsMembershipOnly && <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">멤버 한정</span>}
                        </label>
                        {groupId === myId && currentUser?.role === "ARTIST" && (
                            <label className="flex items-center gap-3 mt-4 cursor-pointer w-fit">
                                <div className={`relative w-10 h-5 rounded-full transition-colors ${newPostIsNotice ? "bg-violet-500" : "bg-white/[0.12]"}`} onClick={() => setNewPostIsNotice((v) => !v)}>
                                    <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${newPostIsNotice ? "translate-x-5" : "translate-x-0.5"}`} />
                                </div>
                                <span className="text-sm font-bold text-white/70">공지사항</span>
                                {newPostIsNotice && <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">공지로 노출</span>}
                            </label>
                        )}
                        <div className="mt-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-sm text-white/40">attach_file</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/55">첨부파일</span>
                                <span className="text-[10px] font-bold text-white/40">{newPostMediaAssetIds.length}/{MAX_POST_ATTACHMENTS}</span>
                                {newPostAttachmentPreviews.length > 1 && <span className="text-[9px] text-violet-400/70 ml-auto">클릭하여 대표 이미지 선택</span>}
                            </div>
                            <input ref={newPostFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleNewPostFileChange} />
                            {newPostUploadError && <p className="text-red-400 text-xs mb-2">{newPostUploadError}</p>}
                            {newPostAttachmentPreviews.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-[10px] text-white/30 font-medium">클릭하여 대표 설정 · 드래그하여 순서 변경</p>
                                    <DraggableAttachmentGrid attachments={newPostAttachmentPreviews} representativeId={newPostRepresentativeId} onSetRepresentative={setNewPostRepresentative} onReorder={reorderNewPostAttachments} onRemove={removeNewPostAttachment} />
                                    {canAddNewPostAttachment && !newPostUploading && <button type="button" onClick={() => newPostFileInputRef.current?.click()} className="w-full py-3 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/40 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">add</span><span className="text-[10px] font-bold">파일 추가</span></button>}
                                    {newPostUploading && <div className="flex items-center gap-2 py-2"><div className="size-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /><span className="text-violet-300 text-xs font-medium">업로드 중...</span></div>}
                                </div>
                            ) : (
                                <button type="button" onClick={() => newPostFileInputRef.current?.click()} disabled={newPostUploading} className="w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2 disabled:opacity-50">
                                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                    <span className="text-xs font-bold">{newPostUploading ? "업로드 중..." : "사진 또는 동영상 추가"}</span>
                                    <span className="text-[10px] text-white/30">이미지·영상 최대 {MAX_POST_ATTACHMENTS}개</span>
                                </button>
                            )}
                        </div>
                        <div className="mt-6 flex gap-3">
                            <Button variant="ghost" className="flex-1 py-4 text-sm uppercase tracking-widest" onClick={closeCreateModal}>취소</Button>
                            <Button variant="primary" className="flex-1 py-4 text-sm uppercase tracking-widest" onClick={handleCreatePost} disabled={createPostLoading || newPostUploading || !newPostContent.trim()}>{createPostLoading ? "게시 중..." : "게시하기"}</Button>
                        </div>
                    </Surface>
                </div>
            )}

            <ProfileImageModal isOpen={showProfileImageModal} onClose={() => setShowProfileImageModal(false)} currentImageUrl={displayAvatar} mode="artist" onSuccess={(newUrl) => { setMyProfile((prev) => prev ? { ...prev, profileImageUrl: newUrl } : prev); if (groupId === myId) setGroupProfile((prev) => prev ? { ...prev, profileImageUrl: newUrl } : prev); }} />
        </div>
    );
}
