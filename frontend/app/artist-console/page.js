"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_LIVES } from "@/lib/mockData";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";

function getCurrentUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("accessToken");
    if (!raw) return null;
    try {
        const token = raw.replace(/^Bearer\s+/i, "").trim();
        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        return {
            email: payload.sub,
            role: (payload.role || "").replace("ROLE_", ""),
        };
    } catch {
        return null;
    }
}

function formatTimestamp(instant) {
    if (!instant) return "";
    try {
        const date = new Date(instant);
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);
        if (diffSec < 60) return "방금 전";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}분 전`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}시간 전`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay}일 전`;
        return date.toLocaleDateString("ko-KR");
    } catch {
        return "";
    }
}

function transformArtistPost(p, groupAvatar = "") {
    return {
        id: p.id,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorAvatar: p.writerProfileImageUrl || groupAvatar,
        content: p.content || "",
        image: p.attachments?.[0]?.url || null,
        timestamp: formatTimestamp(p.createdAt),
        isMembershipOnly: p.isMembershipOnly ?? false,
        isNotice: !!p.isNotice,
        type: "ARTIST",
    };
}

function transformFanPost(p) {
    return {
        id: p.id,
        writerId: p.writerId ?? null,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorAvatar: p.writerProfileImageUrl || "",
        content: p.content || "",
        image: p.attachments?.[0]?.url || null,
        timestamp: formatTimestamp(p.createdAt),
        type: "FAN",
    };
}

const POSTS_LIMIT = 10;

export default function ArtistConsolePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("POSTS");

    // 현재 사용자 프로필
    const [currentUser, setCurrentUser] = useState(null);
    const [myId, setMyId] = useState(null);       // 본인 userId
    const [groupId, setGroupId] = useState(null); // GROUP 계정: 본인 ID / ARTIST: 소속 그룹 ID
    const [myProfile, setMyProfile] = useState(null);
    const [groupProfile, setGroupProfile] = useState(null); // 그룹 계정 프로필 (ARTIST 멤버인 경우 그룹 계정 정보)

    // 아티스트 포스트 state
    const [artistPosts, setArtistPosts] = useState([]);
    const [artistPostsLoading, setArtistPostsLoading] = useState(false);
    const [artistPostsHasNext, setArtistPostsHasNext] = useState(false);
    const [artistPostsLastId, setArtistPostsLastId] = useState(null);
    const [artistPostsLoadingMore, setArtistPostsLoadingMore] = useState(false);
    const [artistLikeCountMap, setArtistLikeCountMap] = useState({});
    const [artistIsLikedMap, setArtistIsLikedMap] = useState({});
    const [artistCommentCountMap, setArtistCommentCountMap] = useState({});

    // 새 글 작성 모달 state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostIsMembershipOnly, setNewPostIsMembershipOnly] = useState(false);
    const [newPostIsNotice, setNewPostIsNotice] = useState(false);
    const [newPostImagePreview, setNewPostImagePreview] = useState(null);
    const [newPostImageFile, setNewPostImageFile] = useState(null);
    const [createPostLoading, setCreatePostLoading] = useState(false);
    const newPostFileInputRef = useRef(null);

    // 팬 포스트 state
    const [fanPosts, setFanPosts] = useState([]);
    const [fanPostsLoading, setFanPostsLoading] = useState(false);
    const [fanPostsHasNext, setFanPostsHasNext] = useState(false);
    const [fanPostsLastId, setFanPostsLastId] = useState(null);
    const [fanPostsLoadingMore, setFanPostsLoadingMore] = useState(false);
    const [fanLikeCountMap, setFanLikeCountMap] = useState({});
    const [fanIsLikedMap, setFanIsLikedMap] = useState({});
    const [fanCommentCountMap, setFanCommentCountMap] = useState({});

    // 무한스크롤 sentinel refs
    const artistPostsBottomRef = useRef(null);
    const fanPostsBottomRef = useRef(null);

    const endedLives = MOCK_LIVES.filter((l) => l.status === "ENDED");

    // 프로필 조회 → myId, groupId
    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (!user) return;
        request("/api/user/profile")
            .then((data) => {
                setMyId(data.id ?? null);
                setMyProfile(data);
                // groupId: 백엔드가 내려준 groupId 우선, 없으면 본인 ID
                setGroupId(data.groupId ?? data.id ?? null);
            })
            .catch(() => {});
    }, []);

    // groupId !== myId(소속 아티스트) 인 경우 그룹 계정의 프로필 조회
    useEffect(() => {
        if (!groupId || !myId) return;
        if (groupId === myId) {
            // GROUP 계정 본인 → 본인 프로필 그대로 사용
            setGroupProfile(myProfile);
            return;
        }
        // ARTIST 멤버 → 소속 그룹 계정 프로필 조회
        request(`/api/user/artists/${groupId}/dashboard`)
            .then((data) => {
                setGroupProfile({
                    nickname: data.artistInfo?.nickname || data.nickname || "",
                    profileImageUrl: data.artistInfo?.profileImageUrl || data.profileImageUrl || "",
                });
            })
            .catch(() => {
                // 조회 실패 시 본인 프로필로 fallback
                setGroupProfile(null);
            });
    }, [groupId, myId, myProfile]);

    // 아티스트 포스트 배치 메타 (like/comment count) 로드
    const fetchArtistPostsMeta = useCallback(async (transformed) => {
        if (transformed.length === 0) return;
        const user = getCurrentUser();
        const ids = transformed.map((p) => p.id).join(",");
        const [countRes, checkRes, commentCountRes] = await Promise.all([
            request("/api/likes/counts", {
                query: { targetType: "ARTIST_POST", targetIds: ids },
            }).catch(() => ({})),
            user
                ? request("/api/likes/check", {
                    query: { targetType: "ARTIST_POST", targetIds: ids },
                }).catch(() => [])
                : Promise.resolve([]),
            request("/api/comments/counts", {
                query: { targetType: "ARTIST", targetIds: ids },
            }).catch(() => ({})),
        ]);
        setArtistLikeCountMap((prev) => ({ ...prev, ...(countRes || {}) }));
        setArtistCommentCountMap((prev) => ({ ...prev, ...(commentCountRes || {}) }));
        const likedSet = new Set(
            (Array.isArray(checkRes) ? checkRes : []).map(Number)
        );
        setArtistIsLikedMap((prev) => ({
            ...prev,
            ...Object.fromEntries(
                transformed.map((p) => [p.id, likedSet.has(Number(p.id))])
            ),
        }));
    }, []);

    // 팬 포스트 배치 메타 로드
    const fetchFanPostsMeta = useCallback(async (transformed) => {
        if (transformed.length === 0) return;
        const user = getCurrentUser();
        const ids = transformed.map((p) => p.id).join(",");
        const [countRes, checkRes, commentCountRes] = await Promise.all([
            request("/api/likes/counts", {
                query: { targetType: "FAN_POST", targetIds: ids },
            }).catch(() => ({})),
            user
                ? request("/api/likes/check", {
                    query: { targetType: "FAN_POST", targetIds: ids },
                }).catch(() => [])
                : Promise.resolve([]),
            request("/api/comments/counts", {
                query: { targetType: "FAN", targetIds: ids },
            }).catch(() => ({})),
        ]);
        setFanLikeCountMap((prev) => ({ ...prev, ...(countRes || {}) }));
        setFanCommentCountMap((prev) => ({ ...prev, ...(commentCountRes || {}) }));
        const likedSet = new Set(
            (Array.isArray(checkRes) ? checkRes : []).map(Number)
        );
        setFanIsLikedMap((prev) => ({
            ...prev,
            ...Object.fromEntries(
                transformed.map((p) => [p.id, likedSet.has(Number(p.id))])
            ),
        }));
    }, []);

    // [A] POSTS 탭 활성화 시 아티스트 포스트 초기 로드
    useEffect(() => {
        if (activeTab !== "POSTS" || !groupId) return;
        setArtistPostsLoading(true);
        setArtistPostsHasNext(false);
        setArtistPostsLastId(null);
        request("/api/artist-posts/artist-only", {
            query: { groupId, limit: POSTS_LIMIT },
        })
            .then(async (data) => {
                const raw = Array.isArray(data)
                    ? data
                    : (data?.content ?? data?.posts ?? []);
                const groupAvatar = myProfile?.profileImageUrl || "";
                const transformed = raw.map((p) => transformArtistPost(p, groupAvatar));
                setArtistPosts(transformed);
                setArtistPostsHasNext(raw.length === POSTS_LIMIT);
                if (transformed.length > 0)
                    setArtistPostsLastId(transformed[transformed.length - 1].id);
                await fetchArtistPostsMeta(transformed);
            })
            .catch(() => setArtistPosts([]))
            .finally(() => setArtistPostsLoading(false));
    }, [activeTab, groupId]);

    // [B] FAN_POSTS 탭 활성화 시 팬 포스트 초기 로드
    useEffect(() => {
        if (activeTab !== "FAN_POSTS" || !groupId) return;
        setFanPostsLoading(true);
        setFanPostsHasNext(false);
        setFanPostsLastId(null);
        request("/api/fan-posts", {
            query: { groupId, limit: POSTS_LIMIT },
        })
            .then(async (data) => {
                const raw = Array.isArray(data)
                    ? data
                    : (data?.content ?? data?.posts ?? []);
                const transformed = raw.map(transformFanPost);
                setFanPosts(transformed);
                setFanPostsHasNext(raw.length === POSTS_LIMIT);
                if (transformed.length > 0)
                    setFanPostsLastId(transformed[transformed.length - 1].id);
                await fetchFanPostsMeta(transformed);
            })
            .catch(() => setFanPosts([]))
            .finally(() => setFanPostsLoading(false));
    }, [activeTab, groupId]);

    // 아티스트 포스트 더 불러오기
    const loadMoreArtistPosts = useCallback(async () => {
        if (!groupId || artistPostsLoadingMore || !artistPostsHasNext || !artistPostsLastId) return;
        setArtistPostsLoadingMore(true);
        try {
            const data = await request("/api/artist-posts/artist-only", {
                query: { groupId, lastPostId: artistPostsLastId, limit: POSTS_LIMIT },
            });
            const raw = Array.isArray(data)
                ? data
                : (data?.content ?? data?.posts ?? []);
            const groupAvatar = myProfile?.profileImageUrl || "";
            const newPosts = raw.map((p) => transformArtistPost(p, groupAvatar));
            setArtistPosts((prev) => [...prev, ...newPosts]);
            setArtistPostsHasNext(raw.length === POSTS_LIMIT);
            if (newPosts.length > 0)
                setArtistPostsLastId(newPosts[newPosts.length - 1].id);
            await fetchArtistPostsMeta(newPosts);
        } catch {}
        setArtistPostsLoadingMore(false);
    }, [groupId, artistPostsLoadingMore, artistPostsHasNext, artistPostsLastId, myProfile, fetchArtistPostsMeta]);

    // 팬 포스트 더 불러오기
    const loadMoreFanPosts = useCallback(async () => {
        if (!groupId || fanPostsLoadingMore || !fanPostsHasNext || !fanPostsLastId) return;
        setFanPostsLoadingMore(true);
        try {
            const data = await request("/api/fan-posts", {
                query: { groupId, lastPostId: fanPostsLastId, limit: POSTS_LIMIT },
            });
            const raw = Array.isArray(data)
                ? data
                : (data?.content ?? data?.posts ?? []);
            const newPosts = raw.map(transformFanPost);
            setFanPosts((prev) => [...prev, ...newPosts]);
            setFanPostsHasNext(raw.length === POSTS_LIMIT);
            if (newPosts.length > 0)
                setFanPostsLastId(newPosts[newPosts.length - 1].id);
            await fetchFanPostsMeta(newPosts);
        } catch {}
        setFanPostsLoadingMore(false);
    }, [groupId, fanPostsLoadingMore, fanPostsHasNext, fanPostsLastId, fetchFanPostsMeta]);

    // 아티스트 포스트 무한스크롤 IntersectionObserver
    useEffect(() => {
        if (!artistPostsHasNext || artistPostsLoading) return;
        const el = artistPostsBottomRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMoreArtistPosts(); },
            { rootMargin: "100px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [artistPostsHasNext, artistPostsLastId, loadMoreArtistPosts, artistPostsLoading]);

    // 팬 포스트 무한스크롤 IntersectionObserver
    useEffect(() => {
        if (!fanPostsHasNext || fanPostsLoading) return;
        const el = fanPostsBottomRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMoreFanPosts(); },
            { rootMargin: "100px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [fanPostsHasNext, fanPostsLastId, loadMoreFanPosts, fanPostsLoading]);

    // 새 글 이미지 핸들러
    const handleNewPostImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        setNewPostImageFile(file);
        setNewPostImagePreview(URL.createObjectURL(file));
    };

    const removeNewPostImage = () => {
        if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
        setNewPostImageFile(null);
        setNewPostImagePreview(null);
        if (newPostFileInputRef.current) newPostFileInputRef.current.value = "";
    };

    const closeCreateModal = () => {
        removeNewPostImage();
        setNewPostContent("");
        setNewPostIsMembershipOnly(false);
        setNewPostIsNotice(false);
        setShowCreateModal(false);
    };

    // 아티스트 포스트 생성
    const handleCreatePost = async () => {
        if (!newPostContent.trim() || createPostLoading || !groupId) return;
        setCreatePostLoading(true);
        try {
            const created = await request("/api/artist-posts", {
                method: "POST",
                body: {
                    groupId,
                    title: "",
                    content: newPostContent.trim(),
                    isMembershipOnly: newPostIsMembershipOnly,
                    isNotice: newPostIsNotice,
                    mediaAssetIds: [],
                },
            });
            const groupAvatar = myProfile?.profileImageUrl || "";
            const newPost = transformArtistPost(created, groupAvatar);
            setArtistPosts((prev) => [newPost, ...prev]);
            closeCreateModal();
        } catch (err) {
            console.error("아티스트 포스트 생성 실패", err);
        } finally {
            setCreatePostLoading(false);
        }
    };

    // 아티스트 포스트 좋아요 토글
    const handleArtistPostLike = (postId) => {
        if (!currentUser) { router.push("/login"); return; }
        const wasLiked = !!artistIsLikedMap[postId];
        setArtistIsLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
        setArtistLikeCountMap((prev) => ({
            ...prev,
            [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1),
        }));
        request("/api/likes", {
            method: "POST",
            body: { targetType: "ARTIST_POST", targetId: postId },
        }).catch(() => {
            setArtistIsLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
            setArtistLikeCountMap((prev) => ({
                ...prev,
                [postId]: (prev[postId] ?? 0) + (wasLiked ? 1 : -1),
            }));
        });
    };

    // 팬 포스트 좋아요 토글
    const handleFanPostLike = (postId) => {
        if (!currentUser) { router.push("/login"); return; }
        const wasLiked = !!fanIsLikedMap[postId];
        setFanIsLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
        setFanLikeCountMap((prev) => ({
            ...prev,
            [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1),
        }));
        request("/api/likes", {
            method: "POST",
            body: { targetType: "FAN_POST", targetId: postId },
        }).catch(() => {
            setFanIsLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
            setFanLikeCountMap((prev) => ({
                ...prev,
                [postId]: (prev[postId] ?? 0) + (wasLiked ? 1 : -1),
            }));
        });
    };

    // 그룹 계정의 이름/아바타 우선 표시 (ARTIST 멤버는 소속 그룹 계정 정보 표시)
    const displayName = groupProfile?.nickname || myProfile?.nickname || "Studio";
    const displayAvatar = groupProfile?.profileImageUrl || myProfile?.profileImageUrl || "";

    return (
        <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10">
            {/* 헤더 프로필 카드 */}
            <Surface
                variant="primary"
                className="p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
            >
                {displayAvatar && (
                    <img
                        src={displayAvatar}
                        className="size-32 rounded-2xl border-2 border-white/[0.08] shrink-0"
                        alt=""
                    />
                )}
                <div className="flex-1 text-center md:text-left">
                    <SectionTitle className="text-3xl font-black">
                        {displayName} Studio
                    </SectionTitle>
                    <p className="text-white/70 font-medium mt-2">
                        팬들과 가장 가깝게 만나는 나만의 공간입니다.
                    </p>
                    {/* 소속 아티스트 계정으로 접속 중인 경우 표시 */}
                    {groupId !== myId && myProfile && (
                        <div className="mt-3 flex items-center gap-2 justify-center md:justify-start">
                            {myProfile.profileImageUrl && (
                                <img
                                    src={myProfile.profileImageUrl}
                                    className="size-6 rounded-full border border-white/[0.12] shrink-0"
                                    alt=""
                                />
                            )}
                            <span className="text-white/50 text-sm font-medium">
                {myProfile.nickname}
              </span>
                        </div>
                    )}
                </div>
            </Surface>

            {/* 탭 */}
            <div className="flex items-center gap-2 p-1 bg-white/[0.04] rounded-2xl w-fit border border-white/[0.06]">
                {[
                    { id: "POSTS", label: "My Posts" },
                    { id: "FAN_POSTS", label: "Fan Posts" },
                    { id: "LIVE", label: "Live History" },
                    {
                        id: "CONCERTS",
                        label: "Concerts",
                        href: "/artist-console/concerts",
                    },
                ].map((tab) =>
                    tab.href ? (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-white/55 hover:text-white/80"
                        >
                            {tab.label}
                        </Link>
                    ) : (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                    ? "bg-[#201a33] text-violet-300 border border-white/[0.08]"
                                    : "text-white/55 hover:text-white/80"
                            }`}
                        >
                            {tab.label}
                        </button>
                    )
                )}
            </div>

            <div className="space-y-6">
                {/* MY POSTS 탭 — artists/[id] ARTIST 탭과 동일 */}
                {activeTab === "POSTS" && (
                    <>
                        {/* 새 글 작성 버튼 — 항상 표시 */}
                        <div className="flex justify-end">
                            <Button
                                variant="primary"
                                className="text-xs uppercase tracking-widest px-6 py-3"
                                onClick={() => setShowCreateModal(true)}
                            >
                <span className="material-symbols-outlined text-lg mr-1.5 align-middle">
                  edit_note
                </span>
                                새 글 작성
                            </Button>
                        </div>

                        {artistPostsLoading ? (
                            <Surface variant="primary" className="py-12 text-center">
                                <p className="text-white/55">로딩 중...</p>
                            </Surface>
                        ) : artistPosts.length === 0 ? (
                            <Surface variant="primary" className="py-20 text-center">
                                <p className="text-white/55 italic">아직 게시글이 없습니다.</p>
                            </Surface>
                        ) : (
                            <>
                                <PostFeed
                                    posts={artistPosts}
                                    postLinkBase="/posts"
                                    postLinkQuery={`type=ARTIST&groupId=${groupId}&from=artist-console`}
                                    showVerifiedByType={true}
                                    isLikedMap={artistIsLikedMap}
                                    likeCountMap={artistLikeCountMap}
                                    commentCountMap={artistCommentCountMap}
                                    onLike={handleArtistPostLike}
                                    onComment={(postId) =>
                                        router.push(
                                            `/posts/${postId}?type=ARTIST&groupId=${groupId}&from=artist-console`
                                        )
                                    }
                                />
                                {/* 무한스크롤 sentinel */}
                                <div ref={artistPostsBottomRef} className="py-1">
                                    {artistPostsLoadingMore && (
                                        <p className="text-white/40 text-xs text-center py-4">
                                            불러오는 중...
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* FAN POSTS 탭 — artists/[id] FAN 탭과 동일 */}
                {activeTab === "FAN_POSTS" && (
                    <>
                        {fanPostsLoading ? (
                            <Surface variant="primary" className="py-12 text-center">
                                <p className="text-white/55">로딩 중...</p>
                            </Surface>
                        ) : fanPosts.length === 0 ? (
                            <Surface variant="primary" className="py-20 text-center">
                                <p className="text-white/55 italic">팬 게시글이 없습니다.</p>
                            </Surface>
                        ) : (
                            <>
                                <PostFeed
                                    posts={fanPosts}
                                    postLinkBase="/posts"
                                    postLinkQuery={`type=FAN&groupId=${groupId}&from=artist-console`}
                                    showVerifiedByType={true}
                                    isLikedMap={fanIsLikedMap}
                                    likeCountMap={fanLikeCountMap}
                                    commentCountMap={fanCommentCountMap}
                                    onLike={handleFanPostLike}
                                    onComment={(postId) =>
                                        router.push(
                                            `/posts/${postId}?type=FAN&groupId=${groupId}&from=artist-console`
                                        )
                                    }
                                />
                                {/* 무한스크롤 sentinel */}
                                <div ref={fanPostsBottomRef} className="py-1">
                                    {fanPostsLoadingMore && (
                                        <p className="text-white/40 text-xs text-center py-4">
                                            불러오는 중...
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* LIVE 탭 */}
                {activeTab === "LIVE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {endedLives.map((live) => (
                            <Surface key={live.id} variant="card" className="overflow-hidden">
                                <div className="aspect-video relative overflow-hidden bg-white/5">
                                    <img
                                        src={live.thumbnail}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                </div>
                                <div className="p-6">
                                    <h4 className="font-bold text-white truncate mb-4">
                                        {live.title}
                                    </h4>
                                    <Button
                                        variant="primary"
                                        className="w-full py-3 text-[10px] uppercase tracking-widest"
                                    >
                                        다시보기 발행
                                    </Button>
                                </div>
                            </Surface>
                        ))}
                    </div>
                )}
            </div>

            {/* 새 글 작성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <Surface variant="primary" className="w-full max-w-2xl p-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white">새 글 작성</h3>
                            <button
                                type="button"
                                onClick={closeCreateModal}
                                className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* 작성자 정보 */}
                        {displayAvatar && (
                            <div className="flex items-center gap-3 mb-6">
                                <img
                                    src={displayAvatar}
                                    className="size-10 rounded-full border border-white/[0.08]"
                                    alt=""
                                />
                                <div>
                                    <p className="font-bold text-white text-sm">{displayName}</p>
                                    <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                                        Official Artist
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 내용 입력 */}
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            autoFocus
                            className="w-full min-h-[180px] bg-[#201a33] rounded-2xl p-4 border border-white/[0.06] outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder:text-white/40 font-medium resize-y"
                            placeholder="팬들에게 전할 말을 적어주세요."
                        />

                        {/* 멤버십 전용 토글 */}
                        <label className="flex items-center gap-3 mt-4 cursor-pointer w-fit">
                            <div
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    newPostIsMembershipOnly ? "bg-violet-500" : "bg-white/[0.12]"
                                }`}
                                onClick={() => setNewPostIsMembershipOnly((v) => !v)}
                            >
                <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                        newPostIsMembershipOnly ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
                            </div>
                            <span className="text-sm font-bold text-white/70">
                멤버십 전용
              </span>
                            {newPostIsMembershipOnly && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">
                  멤버 한정
                </span>
                            )}
                        </label>

                        {/* 공지사항 토글 (개인 아티스트만) */}
                        {groupId === myId && currentUser?.role === "ARTIST" && (
                            <label className="flex items-center gap-3 mt-4 cursor-pointer w-fit">
                                <div
                                    className={`relative w-10 h-5 rounded-full transition-colors ${
                                        newPostIsNotice ? "bg-violet-500" : "bg-white/[0.12]"
                                    }`}
                                    onClick={() => setNewPostIsNotice((v) => !v)}
                                >
                                    <span
                                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                                            newPostIsNotice ? "translate-x-5" : "translate-x-0.5"
                                        }`}
                                    />
                                </div>
                                <span className="text-sm font-bold text-white/70">공지사항</span>
                                {newPostIsNotice && (
                                    <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">
                                        공지로 노출
                                    </span>
                                )}
                            </label>
                        )}

                        {/* 사진 첨부 */}
                        <div className="mt-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
                사진 첨부
              </span>
                            <input
                                ref={newPostFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleNewPostImageChange}
                                className="hidden"
                            />
                            {!newPostImagePreview ? (
                                <button
                                    type="button"
                                    onClick={() => newPostFileInputRef.current?.click()}
                                    className="w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2"
                                >
                  <span className="material-symbols-outlined text-3xl">
                    add_photo_alternate
                  </span>
                                    <span className="text-xs font-bold">클릭하여 사진 추가</span>
                                </button>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                                    <img
                                        src={newPostImagePreview}
                                        alt="미리보기"
                                        className="w-full max-h-56 object-contain bg-black/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeNewPostImage}
                                        className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 버튼 */}
                        <div className="mt-6 flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1 py-4 text-sm uppercase tracking-widest"
                                onClick={closeCreateModal}
                            >
                                취소
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 py-4 text-sm uppercase tracking-widest"
                                onClick={handleCreatePost}
                                disabled={createPostLoading || !newPostContent.trim()}
                            >
                                {createPostLoading ? "게시 중..." : "게시하기"}
                            </Button>
                        </div>
                    </Surface>
                </div>
            )}
        </div>
    );
}