"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

import { MOCK_ARTISTS, MOCK_POSTS, MOCK_LIVES } from "@/lib/mockData";
import { list as listMusicVideos } from "@/lib/musicVideoApi";
import { request, apiGet } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";
import MembershipOnlyModal from "@/components/common/MembershipOnlyModal";

const CANDY_COST = 500;
const FAN_PROFILES_API = "http://localhost:8080/api/fan-profiles";

function getAuthHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
    };
}

function getCurrentUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("accessToken");
    if (!raw) return null;
    try {
        const token = raw.replace(/^Bearer\s+/i, "").trim();
        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
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
        isLockedByServer: !!(p.isMembershipOnly && p.content === null),
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

function ArtistDetailPageInner({ id }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const VALID_TABS = ["ARTIST", "FAN", "LIVE", "NOTICE", "MV"];
    const tabParam = searchParams.get("tab");

    const [artist, setArtist] = useState(null);
    const [activeTab, setActiveTab] = useState(
        tabParam && VALID_TABS.includes(tabParam) ? tabParam : "ARTIST"
    );
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostImagePreview, setNewPostImagePreview] = useState(null);
    const [newPostImageFile, setNewPostImageFile] = useState(null);
    const fanPostFileInputRef = useRef(null);
    const [candyBalance] = useState(1500);
    const [fanProfiles, setFanProfiles] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [musicVideos, setMusicVideos] = useState([]);
    const [musicVideosLoading, setMusicVideosLoading] = useState(false);

    // 라이브 세션 state
    const [liveSessions, setLiveSessions] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveError, setLiveError] = useState("");
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [subscriptionModalArtistId, setSubscriptionModalArtistId] = useState(null);
    const [liveCardCheckingId, setLiveCardCheckingId] = useState(null);

    const POSTS_LIMIT = 10;

    const [artistPosts, setArtistPosts] = useState([]);
    const [fanPosts, setFanPosts] = useState([]);
    const [artistPostsLoading, setArtistPostsLoading] = useState(false);
    const [fanPostsLoading, setFanPostsLoading] = useState(false);
    const [artistPostsHasNext, setArtistPostsHasNext] = useState(false);
    const [artistPostsLastId, setArtistPostsLastId] = useState(null);
    const [artistPostsLoadingMore, setArtistPostsLoadingMore] = useState(false);
    const [fanPostsHasNext, setFanPostsHasNext] = useState(false);
    const [fanPostsLastId, setFanPostsLastId] = useState(null);
    const [fanPostsLoadingMore, setFanPostsLoadingMore] = useState(false);

    const [artistLikeCountMap, setArtistLikeCountMap] = useState({});
    const [artistIsLikedMap, setArtistIsLikedMap] = useState({});
    const [artistCommentCountMap, setArtistCommentCountMap] = useState({});
    const [fanLikeCountMap, setFanLikeCountMap] = useState({});
    const [fanIsLikedMap, setFanIsLikedMap] = useState({});
    const [fanCommentCountMap, setFanCommentCountMap] = useState({});

    const [currentUser, setCurrentUser] = useState(null);
    const [myUserId, setMyUserId] = useState(null);
    const [myNickname, setMyNickname] = useState("");
    const [myProfileImageUrl, setMyProfileImageUrl] = useState("");
    const [isGroupMember, setIsGroupMember] = useState(false);
    const [subscribeLoading, setSubscribeLoading] = useState(false);

    const [createLoading, setCreateLoading] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    const artistPostsBottomRef = useRef(null);
    const fanPostsBottomRef = useRef(null);

    const groupId = Number(id);
    const isRealGroup = !isNaN(groupId) && groupId > 0;

    // 아티스트 메타데이터
    useEffect(() => {
        if (isRealGroup) {
            request(`/api/user/artists/${groupId}/dashboard`)
                .then((data) => {
                    const info = data?.artistInfo || {};
                    const follow = data?.followStatus || {};
                    const membership = data?.membershipInfo || {};
                    setArtist({
                        id: String(groupId),
                        name: info.nickname || "",
                        avatar: info.profileImageUrl || "",
                        cover: info.bannerImageUrl || "",
                        isFollowing: follow.isFollowing || false,
                        hasMembership: membership.hasActiveMembership || false,
                        membershipUrl: membership.membershipButtonUrl || `/candy/payment?artistId=${groupId}`,
                        memberCount: "",
                        postCount: "",
                        members: [],
                    });
                    setIsGroupMember(data?.isGroupMember ?? false);
                })
                .catch(() => {
                    const a = MOCK_ARTISTS.find((x) => x.id === id) || MOCK_ARTISTS[0];
                    setArtist(a);
                });
        } else {
            const a = MOCK_ARTISTS.find((x) => x.id === id);
            const found = a || MOCK_ARTISTS[0];
            setArtist({
                ...found,
                isFollowing: found.isSubscribed || false,
                hasMembership: found.isPremiumSubscribed || false,
            });
            const artId = found.id;
            setArtistPosts(MOCK_POSTS.filter((p) => p.artistId === artId && p.type === "ARTIST"));
            setFanPosts(MOCK_POSTS.filter((p) => p.artistId === artId && p.type === "FAN"));
        }
    }, [id, groupId, isRealGroup]);

    // JWT에서 currentUser 추출 + 닉네임 조회
    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (!user) return;
        request("/api/user/profile")
            .then((data) => {
                setMyUserId(data.id ?? null);
                setMyNickname(data.nickname || "");
                setMyProfileImageUrl(data.profileImageUrl || "");
            })
            .catch(() => {});
    }, []);

    // fan profiles
    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (!token) return;
        axios
            .get(`${FAN_PROFILES_API}/me`, { headers: getAuthHeaders() })
            .then((res) => setFanProfiles(res.data || []))
            .catch(() => setFanProfiles([]));
    }, [id]);

    const artistIdForApi = Number(id) || 1;

    // MV 탭
    useEffect(() => {
        if (activeTab !== "MV") return;
        setMusicVideosLoading(true);
        listMusicVideos(artistIdForApi)
            .then(setMusicVideos)
            .catch(() => setMusicVideos([]))
            .finally(() => setMusicVideosLoading(false));
    }, [activeTab, artistIdForApi]);

    // 라이브 세션 로드
    useEffect(() => {
        if (!id && !artist) return;
        let cancelled = false;
        const fetchLiveSessions = async () => {
            const numericFromParam = id != null && !Number.isNaN(Number(id)) ? Number(id) : null;
            let artistIdForLive = numericFromParam;
            if (artistIdForLive == null && artist && artist.backendId != null) {
                artistIdForLive = artist.backendId;
            }
            if (artistIdForLive == null) artistIdForLive = 1;
            setLiveLoading(true);
            setLiveError("");
            try {
                const data = await apiGet(`/api/live-sessions?artistId=${artistIdForLive}&status=LIVE`);
                if (cancelled) return;
                setLiveSessions(Array.isArray(data) ? data : []);
            } catch (e) {
                if (cancelled) return;
                const baseMessage = e?.message || "라이브 정보를 불러오지 못했습니다.";
                setLiveSessions([]);
                setLiveError(`${baseMessage} (TODO: 백엔드 API 준비되면 연동)`);
            } finally {
                if (!cancelled) setLiveLoading(false);
            }
        };
        fetchLiveSessions();
        return () => { cancelled = true; };
    }, [id, artist]);

    // 아티스트 포스트 배치 메타 로드
    const fetchArtistPostsMeta = useCallback(async (transformed) => {
        if (transformed.length === 0) return;
        const user = getCurrentUser();
        const ids = transformed.map((p) => p.id).join(",");
        const [countRes, checkRes, commentCountRes] = await Promise.all([
            request("/api/likes/counts", { query: { targetType: "ARTIST_POST", targetIds: ids } }).catch(() => ({})),
            user
                ? request("/api/likes/check", { query: { targetType: "ARTIST_POST", targetIds: ids } }).catch(() => [])
                : Promise.resolve([]),
            request("/api/comments/counts", { query: { targetType: "ARTIST", targetIds: ids } }).catch(() => ({})),
        ]);
        setArtistLikeCountMap((prev) => ({ ...prev, ...(countRes || {}) }));
        setArtistCommentCountMap((prev) => ({ ...prev, ...(commentCountRes || {}) }));
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        setArtistIsLikedMap((prev) => ({
            ...prev,
            ...Object.fromEntries(transformed.map((p) => [p.id, likedSet.has(Number(p.id))])),
        }));
    }, []);

    // [A] ARTIST 탭 초기 로드
    useEffect(() => {
        if (activeTab !== "ARTIST" || !isRealGroup) return;
        setArtistPostsLoading(true);
        setArtistPostsHasNext(false);
        setArtistPostsLastId(null);
        request("/api/artist-posts/artist-only", { query: { groupId, limit: POSTS_LIMIT } })
            .then(async (data) => {
                const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
                const groupAvatar = artist?.avatar || "";
                const transformed = raw.map((p) => transformArtistPost(p, groupAvatar));
                setArtistPosts(transformed);
                setArtistPostsHasNext(raw.length === POSTS_LIMIT);
                if (transformed.length > 0) setArtistPostsLastId(transformed[transformed.length - 1].id);
                await fetchArtistPostsMeta(transformed);
            })
            .catch(() => setArtistPosts([]))
            .finally(() => setArtistPostsLoading(false));
    }, [activeTab, groupId, isRealGroup]);

    // 팬 포스트 배치 메타 로드
    const fetchFanPostsMeta = useCallback(async (transformed) => {
        if (transformed.length === 0) return;
        const user = getCurrentUser();
        const ids = transformed.map((p) => p.id).join(",");
        const [countRes, checkRes, commentCountRes] = await Promise.all([
            request("/api/likes/counts", { query: { targetType: "FAN_POST", targetIds: ids } }).catch(() => ({})),
            user
                ? request("/api/likes/check", { query: { targetType: "FAN_POST", targetIds: ids } }).catch(() => [])
                : Promise.resolve([]),
            request("/api/comments/counts", { query: { targetType: "FAN", targetIds: ids } }).catch(() => ({})),
        ]);
        setFanLikeCountMap((prev) => ({ ...prev, ...(countRes || {}) }));
        setFanCommentCountMap((prev) => ({ ...prev, ...(commentCountRes || {}) }));
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        setFanIsLikedMap((prev) => ({
            ...prev,
            ...Object.fromEntries(transformed.map((p) => [p.id, likedSet.has(Number(p.id))])),
        }));
    }, []);

    // [B] FAN 탭 초기 로드
    useEffect(() => {
        if (activeTab !== "FAN" || !isRealGroup) return;
        setFanPostsLoading(true);
        setFanPostsHasNext(false);
        setFanPostsLastId(null);
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
    }, [activeTab, groupId, isRealGroup]);

    // 아티스트 포스트 더 불러오기
    const loadMoreArtistPosts = useCallback(async () => {
        if (!isRealGroup || artistPostsLoadingMore || !artistPostsHasNext || !artistPostsLastId) return;
        setArtistPostsLoadingMore(true);
        try {
            const data = await request("/api/artist-posts/artist-only", {
                query: { groupId, lastPostId: artistPostsLastId, limit: POSTS_LIMIT },
            });
            const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
            const groupAvatar = artist?.avatar || "";
            const newPosts = raw.map((p) => transformArtistPost(p, groupAvatar));
            setArtistPosts((prev) => [...prev, ...newPosts]);
            setArtistPostsHasNext(raw.length === POSTS_LIMIT);
            if (newPosts.length > 0) setArtistPostsLastId(newPosts[newPosts.length - 1].id);
            await fetchArtistPostsMeta(newPosts);
        } catch {}
        setArtistPostsLoadingMore(false);
    }, [isRealGroup, artistPostsLoadingMore, artistPostsHasNext, artistPostsLastId, groupId, artist, fetchArtistPostsMeta]);

    // 팬 포스트 더 불러오기
    const loadMoreFanPosts = useCallback(async () => {
        if (!isRealGroup || fanPostsLoadingMore || !fanPostsHasNext || !fanPostsLastId) return;
        setFanPostsLoadingMore(true);
        try {
            const data = await request("/api/fan-posts", {
                query: { groupId, lastPostId: fanPostsLastId, limit: POSTS_LIMIT },
            });
            const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
            const newPosts = raw.map(transformFanPost);
            setFanPosts((prev) => [...prev, ...newPosts]);
            setFanPostsHasNext(raw.length === POSTS_LIMIT);
            if (newPosts.length > 0) setFanPostsLastId(newPosts[newPosts.length - 1].id);
            await fetchFanPostsMeta(newPosts);
        } catch {}
        setFanPostsLoadingMore(false);
    }, [isRealGroup, fanPostsLoadingMore, fanPostsHasNext, fanPostsLastId, groupId, fetchFanPostsMeta]);

    // 아티스트 포스트 무한스크롤
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

    // 팬 포스트 무한스크롤
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
    }, [fanPostsHasNext, fanPostsLastId, loadMoreFanPosts, fanPostsLoading, isGroupMember, artist?.isFollowing]);

    if (!artist) return null;

    const postGroupId = isRealGroup ? groupId : artist.id;

    const fanProfileForArtist =
        fanProfiles.find((p) => String(p.artistId) === String(id)) ||
        (artist.name &&
            fanProfiles.find((p) => p.artistName && p.artistName.trim() === artist.name.trim()));

    const canCreateFanPost = currentUser?.role === "USER";

    const handleAttendance = async () => {
        if (!fanProfileForArtist || attendanceLoading) return;
        setAttendanceLoading(true);
        try {
            await axios.post(
                `${FAN_PROFILES_API}/${fanProfileForArtist.id}/increase-visit`,
                {},
                { headers: getAuthHeaders() },
            );
            setFanProfiles((prev) =>
                prev.map((p) =>
                    p.id === fanProfileForArtist.id
                        ? { ...p, visitCount: (p.visitCount || 0) + 1 }
                        : p,
                ),
            );
        } catch (err) {
            console.error(err);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!currentUser) { router.push("/login"); return; }
        if (subscribeLoading) return;
        if (!isRealGroup) {
            setArtist((prev) => ({ ...prev, isFollowing: true }));
            return;
        }
        setSubscribeLoading(true);
        try {
            await request(`/api/user/follow/${groupId}`, { method: "POST" });
            setArtist((prev) => ({ ...prev, isFollowing: true }));
        } catch (err) {
            console.error("구독 실패", err);
        } finally {
            setSubscribeLoading(false);
        }
    };

    const artistNotices = MOCK_POSTS.filter(
        (p) => p.artistId === artist.id && p.type === "NOTICE",
    );

    const handleArtistPostLike = (postId) => {
        if (!currentUser) { router.push("/login"); return; }
        const wasLiked = !!artistIsLikedMap[postId];
        setArtistIsLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
        setArtistLikeCountMap((prev) => ({
            ...prev,
            [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1),
        }));
        if (!isRealGroup) return;
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

    const handleFanPostLike = (postId) => {
        if (!currentUser) { router.push("/login"); return; }
        const wasLiked = !!fanIsLikedMap[postId];
        setFanIsLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
        setFanLikeCountMap((prev) => ({
            ...prev,
            [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1),
        }));
        if (!isRealGroup) return;
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

    const handleDeleteFanPost = async (postId) => {
        if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
        try {
            if (isRealGroup) {
                await request(`/api/fan-posts/${postId}`, { method: "DELETE" });
            }
            setFanPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("팬 포스트 삭제 실패", err);
        }
    };

    const handleEditFanPost = (postId) => {
        const post = fanPosts.find((p) => p.id === postId);
        if (!post) return;
        setEditingPost({ id: postId, content: post.content });
        setEditContent(post.content);
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim() || editLoading || !editingPost) return;
        setEditLoading(true);
        try {
            if (isRealGroup) {
                await request(`/api/fan-posts/${editingPost.id}`, {
                    method: "PUT",
                    body: { groupId, title: "", content: editContent.trim(), mediaAssetIds: [] },
                });
            }
            setFanPosts((prev) =>
                prev.map((p) =>
                    p.id === editingPost.id ? { ...p, content: editContent.trim() } : p
                )
            );
            setEditingPost(null);
            setEditContent("");
        } catch (err) {
            console.error("팬 포스트 수정 실패", err);
        } finally {
            setEditLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || createLoading) return;
        if (!isRealGroup) {
            const newPost = {
                id: `p-new-${Date.now()}`,
                authorName: myNickname || "팬",
                authorMemberName: null,
                authorAvatar: myProfileImageUrl || "",
                content: newPostContent,
                image: newPostImagePreview || null,
                timestamp: "방금 전",
                type: "FAN",
            };
            setFanPosts((prev) => [newPost, ...prev]);
            setNewPostContent("");
            if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
            setNewPostImagePreview(null);
            setNewPostImageFile(null);
            if (fanPostFileInputRef.current) fanPostFileInputRef.current.value = "";
            setShowCreateModal(false);
            return;
        }
        setCreateLoading(true);
        try {
            const created = await request("/api/fan-posts", {
                method: "POST",
                body: { groupId, title: "", content: newPostContent, mediaAssetIds: [] },
            });
            const newPost = transformFanPost(created);
            setFanPosts((prev) => [newPost, ...prev]);
            setNewPostContent("");
            if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
            setNewPostImagePreview(null);
            setNewPostImageFile(null);
            if (fanPostFileInputRef.current) fanPostFileInputRef.current.value = "";
            setShowCreateModal(false);
        } catch (err) {
            console.error("팬 포스트 생성 실패", err);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleLiveCardClick = async (session) => {
        if (liveCardCheckingId != null) return;
        setLiveCardCheckingId(session.id);
        try {
            await apiGet(`/api/live-sessions/${session.id}/access`);
            router.push(`/live/${session.id}`);
        } catch (e) {
            setSubscriptionModalArtistId(session.artistId ?? null);
            setShowSubscriptionModal(true);
        } finally {
            setLiveCardCheckingId(null);
        }
    };

    const handleTabClick = (tabId) => {
        if (tabId === "MARKET") {
            router.push(`/artists/${artist.id}/market`);
            return;
        }
        setActiveTab(tabId);
    };

    const handleFanPostImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        setNewPostImageFile(file);
        setNewPostImagePreview(URL.createObjectURL(file));
    };

    const removeFanPostImage = () => {
        if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
        setNewPostImageFile(null);
        setNewPostImagePreview(null);
        if (fanPostFileInputRef.current) fanPostFileInputRef.current.value = "";
    };

    const tabs = [
        { id: "ARTIST", label: "Artist" },
        { id: "FAN", label: "Fan" },
        { id: "LIVE", label: "Live" },
        { id: "NOTICE", label: "Notice" },
        { id: "MARKET", label: "Market" },
        { id: "MV", label: "뮤직비디오" },
    ];

    const artistLives = MOCK_LIVES.filter((l) => l.artistId === artist.id);
    const vodList = artistLives.filter(
        (l) => l.status === "ENDED" || l.status === "RECORDED",
    );

    return (
        <div className="flex flex-col min-h-full relative">
            {/* 커버 */}
            <div className="h-56 w-full relative overflow-hidden shrink-0">
                <img src={artist.cover} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0814]/40 to-[#0b0814]" />
            </div>

            {/* 프로필 카드 */}
            <div className="max-w-6xl w-full mx-auto px-8 relative -mt-16 z-10 shrink-0">
                <Surface
                    variant="primary"
                    className="p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 rounded-2xl border border-white/[0.06]"
                >
                    <div className="flex items-end gap-6">
                        <div className="rounded-2xl border-2 border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] -mt-20 overflow-hidden bg-[#201a33]">
                            <img
                                src={artist.avatar}
                                className="size-32 rounded-2xl object-cover w-full h-full"
                                alt=""
                            />
                        </div>
                        <div className="pb-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-semibold text-white tracking-tight">{artist.name}</h1>
                                <span className="material-symbols-outlined text-violet-300 fill-icon text-2xl">verified</span>
                            </div>
                            {(artist.memberCount || artist.postCount) && (
                                <p className="text-white/55 font-medium text-sm mt-1">
                                    {artist.memberCount && `팔로워 ${artist.memberCount}`}
                                    {artist.memberCount && artist.postCount && " • "}
                                    {artist.postCount && `포스트 ${artist.postCount}개`}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="pb-1 flex items-center gap-2">
                        {!isGroupMember && (
                            artist.isFollowing ? (
                                <>
                                    <Button variant="ghost" className="px-8 py-3" disabled>구독 중</Button>
                                    {fanProfileForArtist && (
                                        <Button
                                            variant="primary"
                                            className="px-6 py-3"
                                            onClick={handleAttendance}
                                            disabled={attendanceLoading}
                                        >
                                            {attendanceLoading ? "처리 중…" : "출석"}
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    variant="primary"
                                    className="px-8 py-3"
                                    onClick={handleSubscribe}
                                    disabled={subscribeLoading}
                                >
                                    {subscribeLoading ? "처리 중…" : "구독하기"}
                                </Button>
                            )
                        )}
                    </div>
                </Surface>
            </div>

            {/* 탭 */}
            <div className="sticky top-16 bg-[#0b0814]/95 backdrop-blur-md z-20 border-b border-white/[0.06] mt-8 shrink-0">
                <div className="max-w-6xl mx-auto px-8 flex gap-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabClick(tab.id)}
                            className={`py-4 text-sm font-medium tracking-wide transition-colors border-b-2 -mb-px ${
                                activeTab === tab.id
                                    ? "border-violet-400 text-violet-300"
                                    : "border-transparent text-white/55 hover:text-white/80"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="max-w-6xl w-full mx-auto px-8 py-8 flex-1 grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-6">

                    {/* ARTIST 탭 */}
                    {activeTab === "ARTIST" && (
                        <>
                            {artistPostsLoading ? (
                                <Surface variant="primary" className="py-12 text-center">
                                    <p className="text-white/55">로딩 중...</p>
                                </Surface>
                            ) : (
                                <>
                                    <PostFeed
                                        posts={artistPosts}
                                        postLinkBase="/posts"
                                        postLinkQuery={`type=ARTIST&groupId=${postGroupId}`}
                                        showVerifiedByType={true}
                                        isLikedMap={artistIsLikedMap}
                                        likeCountMap={artistLikeCountMap}
                                        commentCountMap={artistCommentCountMap}
                                        onLike={handleArtistPostLike}
                                        onComment={(postId) =>
                                            router.push(`/posts/${postId}?type=ARTIST&groupId=${postGroupId}`)
                                        }
                                        isLockedMap={Object.fromEntries(
                                            artistPosts.map((p) => [
                                                p.id,
                                                p.isLockedByServer || !!(p.isMembershipOnly && !artist.hasMembership && !isGroupMember),
                                            ])
                                        )}
                                    />
                                    <div ref={artistPostsBottomRef} className="py-1">
                                        {artistPostsLoadingMore && (
                                            <p className="text-white/40 text-xs text-center py-4">불러오는 중...</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* FAN 탭 */}
                    {activeTab === "FAN" && (
                        <>
                            {(artist.isFollowing || isGroupMember) ? (
                                <>
                                    {canCreateFanPost && (
                                        <div className="flex justify-end items-center px-2 mb-4">
                                            <Button
                                                variant="primary"
                                                className="text-xs uppercase tracking-widest"
                                                onClick={() => setShowCreateModal(true)}
                                            >
                                                <span className="material-symbols-outlined text-lg mr-1.5 align-middle">edit_note</span>
                                                팬 포스트 작성
                                            </Button>
                                        </div>
                                    )}
                                    {fanPostsLoading ? (
                                        <Surface variant="primary" className="py-12 text-center">
                                            <p className="text-white/55">로딩 중...</p>
                                        </Surface>
                                    ) : (
                                        <>
                                            <PostFeed
                                                posts={fanPosts}
                                                postLinkBase="/posts"
                                                postLinkQuery={`type=FAN&groupId=${postGroupId}`}
                                                showVerifiedByType={true}
                                                isLikedMap={fanIsLikedMap}
                                                likeCountMap={fanLikeCountMap}
                                                commentCountMap={fanCommentCountMap}
                                                onLike={handleFanPostLike}
                                                onComment={(postId) =>
                                                    router.push(`/posts/${postId}?type=FAN&groupId=${postGroupId}`)
                                                }
                                                onDelete={handleDeleteFanPost}
                                                canDeleteSet={myUserId ? new Set(fanPosts.filter((p) => p.writerId === myUserId).map((p) => p.id)) : undefined}
                                                onEdit={handleEditFanPost}
                                                canEditSet={myUserId ? new Set(fanPosts.filter((p) => p.writerId === myUserId).map((p) => p.id)) : undefined}
                                            />
                                            <div ref={fanPostsBottomRef} className="py-1">
                                                {fanPostsLoadingMore && (
                                                    <p className="text-white/40 text-xs text-center py-4">불러오는 중...</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <Surface variant="primary" className="p-12 text-center">
                                    <p className="text-white/55 italic font-medium">
                                        팬 포스트는 구독 중인 회원만 작성하고 볼 수 있습니다.
                                    </p>
                                </Surface>
                            )}
                        </>
                    )}

                    {/* LIVE 탭 */}
                    {activeTab === "LIVE" && (
                        <div className="space-y-12">
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white/55 mb-4 px-1">LIVE NOW</h3>
                                {liveLoading && (
                                    <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/[0.06]">
                                        <p className="text-white/55 text-sm">불러오는 중...</p>
                                    </div>
                                )}
                                {!liveLoading && liveError && (
                                    <div className="py-4 px-4 mb-4 rounded-2xl bg-red-500/10 border border-red-500/40">
                                        <p className="text-xs text-red-200">{liveError}</p>
                                    </div>
                                )}
                                {!liveLoading && !liveError && liveSessions.length > 0 && (
                                    <div className="space-y-6">
                                        {liveSessions.map((session) => (
                                            <button
                                                key={session.id}
                                                type="button"
                                                onClick={() => handleLiveCardClick(session)}
                                                disabled={liveCardCheckingId != null}
                                                className="block w-full text-left group rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                            >
                                                <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#201a33] border border-white/[0.08] hover:border-white/[0.12] hover:shadow-[0_0_24px_rgba(139,92,246,0.08)] transition-all">
                                                    <img
                                                        src="https://picsum.photos/seed/live/800/450"
                                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                        alt=""
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-red-500/90 text-white text-[9px] font-black uppercase rounded">LIVE</span>
                                                        <span className="px-2 py-0.5 bg-black/40 text-white/90 text-[9px] font-bold rounded flex items-center gap-1">
                              {session.isPaid ? "멤버십 전용" : "무료"}
                            </span>
                                                    </div>
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        {session.artistNickname && (
                                                            <p className="text-xs text-white/60 mb-1">{session.artistNickname}</p>
                                                        )}
                                                        <h4 className="font-bold text-white text-lg truncate">{session.title}</h4>
                                                    </div>
                                                    {liveCardCheckingId === session.id && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                            <span className="text-white text-sm font-medium">확인 중...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {!liveLoading && !liveError && liveSessions.length === 0 && (
                                    <div className="py-16 text-center rounded-2xl bg-[#201a33] border border-white/[0.06]">
                                        <p className="text-white/50 text-sm">진행 중인 라이브가 없습니다.</p>
                                    </div>
                                )}
                            </section>
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white/55 mb-4 px-1">다시보기</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {vodList.map((vod) => (
                                        <Link key={vod.id} href={`/live/${vod.id}`} className="block group">
                                            <div className="rounded-2xl overflow-hidden bg-[#201a33] border border-white/[0.08] hover:border-white/[0.1] hover:shadow-[0_0_20px_rgba(139,92,246,0.06)] transition-all">
                                                <div className="aspect-video relative overflow-hidden">
                                                    <img
                                                        src={vod.thumbnail}
                                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                        alt=""
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h4 className="font-bold text-white truncate mb-1">{vod.title}</h4>
                                                    <p className="text-[10px] text-white/55 font-medium">{vod.startTime}</p>
                                                    {vod.timeLabel && vod.timeLabel !== "종료" && (
                                                        <p className="text-[10px] text-white/45 mt-0.5">{vod.timeLabel}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {vodList.length === 0 && (
                                    <div className="py-16 text-center rounded-2xl bg-[#201a33] border border-white/[0.06]">
                                        <p className="text-white/50 text-sm">다시보기 영상이 없습니다.</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* NOTICE 탭 */}
                    {activeTab === "NOTICE" && (
                        <div className="space-y-4">
                            {artistNotices.map((post) => (
                                <Surface key={post.id} variant="primary" className="p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 text-[8px] font-black uppercase">Notice</span>
                                        <span className="text-[10px] font-bold text-white/55">{post.timestamp}</span>
                                    </div>
                                    <h4 className="font-bold text-white mb-2">{post.content.slice(0, 50)}...</h4>
                                    <Link
                                        href={`/posts/${post.id}`}
                                        className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                                    >
                                        전체보기
                                    </Link>
                                </Surface>
                            ))}
                            {artistNotices.length === 0 && (
                                <Surface variant="primary" className="py-20 text-center">
                                    <p className="text-white/55 italic">공지사항이 없습니다.</p>
                                </Surface>
                            )}
                        </div>
                    )}

                    {/* MV 탭 */}
                    {activeTab === "MV" && (
                        <div className="space-y-4">
                            {musicVideosLoading ? (
                                <Surface variant="primary" className="py-12 text-center">
                                    <p className="text-white/55">로딩 중...</p>
                                </Surface>
                            ) : musicVideos.length === 0 ? (
                                <Surface variant="primary" className="py-20 text-center">
                                    <p className="text-white/55 italic">등록된 뮤직비디오가 없습니다.</p>
                                </Surface>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {musicVideos.map((mv) => (
                                        <Surface key={mv.id} variant="primary" className="p-4 overflow-hidden">
                                            <a href={mv.embedUrl} target="_blank" rel="noopener noreferrer" className="block group">
                                                {mv.thumbnailUrl && (
                                                    <div className="aspect-video rounded-xl overflow-hidden bg-white/5 mb-3">
                                                        <img
                                                            src={mv.thumbnailUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                                                        />
                                                    </div>
                                                )}
                                                <h4 className="font-bold text-white truncate">{mv.title}</h4>
                                                <p className="text-xs text-white/55 mt-1 line-clamp-2">{mv.description}</p>
                                            </a>
                                        </Surface>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 사이드바 */}
                <aside className="hidden lg:col-span-4 lg:flex flex-col gap-6">
                    <Surface variant="primary" className="p-8 border border-violet-500/20">
                        <div className="mb-6">
              <span className="bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Exclusive Access
              </span>
                            <h3 className="font-black text-2xl text-white mt-4 leading-tight">공식 멤버십 가입</h3>
                            <p className="text-sm text-white/70 mt-4 leading-relaxed font-medium">
                                {artist.name}를 직접 응원하고 전용 스트리밍과 굿즈 혜택을 받으세요.
                            </p>
                        </div>
                        <div className="bg-white/[0.06] rounded-2xl p-4 mb-8 border border-white/[0.06]">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/55">멤버십 1단계</span>
                                <span className="font-black text-xl text-white flex items-center gap-1 tabular-nums">
                  <span className="material-symbols-outlined text-violet-300 fill-icon">token</span>
                                    {CANDY_COST} 캔디 / 월
                </span>
                            </div>
                        </div>
                        <div className="mb-6 px-1 flex justify-between items-center text-[11px] font-bold text-white/55 uppercase tracking-widest">
                            <span>내 보유 캔디</span>
                            <span className="text-white tabular-nums">{candyBalance.toLocaleString()} 캔디</span>
                        </div>
                        {candyBalance >= CANDY_COST ? (
                            <Button href={`/candy/payment?artistId=${artist.id}`} variant="primary" className="w-full py-4 text-xs uppercase tracking-widest">
                                캔디로 구독하기
                            </Button>
                        ) : (
                            <Button href="/candy/recharge" variant="primary" className="w-full py-4 text-xs uppercase tracking-widest">
                                캔디 충전하기
                            </Button>
                        )}
                        <p className="text-[9px] text-center text-white/45 mt-4">캔디 차감 시 즉시 혜택이 적용됩니다</p>
                    </Surface>

                    <Surface variant="secondary" className="p-8 sticky top-24">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/55 mb-6">Members</h3>
                        <div className="space-y-4">
                            {artist.members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
                                >
                                    <img src={member.avatar} className="size-12 rounded-xl border border-white/[0.08]" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white truncate">{member.name}</p>
                                        <Link
                                            href="/dm/fan"
                                            className="text-[10px] font-black text-violet-300 uppercase tracking-widest mt-1 hover:underline flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-xs">mail</span>
                                            DM 보내기
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Surface>
                </aside>
            </div>

            {/* 수정 모달 */}
            {editingPost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <Surface variant="primary" className="w-full max-w-xl p-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white">팬 포스트 수정</h3>
                            <button
                                type="button"
                                onClick={() => { setEditingPost(null); setEditContent(""); }}
                                className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            autoFocus
                            className="w-full h-40 bg-[#201a33] rounded-2xl p-4 border border-white/[0.06] outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder:text-white/40 font-medium"
                            placeholder="내용을 입력하세요..."
                        />
                        <div className="mt-6 flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1 py-4 text-sm uppercase tracking-widest"
                                onClick={() => { setEditingPost(null); setEditContent(""); }}
                            >
                                취소
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 py-4 text-sm uppercase tracking-widest"
                                onClick={handleSaveEdit}
                                disabled={editLoading || !editContent.trim()}
                            >
                                {editLoading ? "저장 중..." : "저장하기"}
                            </Button>
                        </div>
                    </Surface>
                </div>
            )}

            {/* 작성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <Surface variant="primary" className="w-full max-w-xl p-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white">팬 포스트 작성</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
                                    setNewPostImagePreview(null);
                                    setNewPostImageFile(null);
                                    setShowCreateModal(false);
                                }}
                                className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            className="w-full h-40 bg-[#201a33] rounded-2xl p-4 border border-white/[0.06] outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder:text-white/40 font-medium"
                            placeholder="아티스트를 향한 따뜻한 한마디..."
                        />
                        <div className="mt-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">사진 첨부</span>
                            <input
                                ref={fanPostFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFanPostImageChange}
                                className="hidden"
                            />
                            {!newPostImagePreview ? (
                                <button
                                    type="button"
                                    onClick={() => fanPostFileInputRef.current?.click()}
                                    className="w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                    <span className="text-xs font-bold">클릭하여 사진 추가</span>
                                </button>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                                    <img src={newPostImagePreview} alt="미리보기" className="w-full max-h-48 object-contain bg-black/20" />
                                    <button
                                        type="button"
                                        onClick={removeFanPostImage}
                                        className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mt-6">
                            <Button
                                variant="primary"
                                className="w-full py-4 text-sm uppercase tracking-widest"
                                onClick={handleCreatePost}
                                disabled={createLoading}
                            >
                                {createLoading ? "게시 중..." : "게시하기"}
                            </Button>
                        </div>
                    </Surface>
                </div>
            )}

            {/* 멤버십 전용 모달 */}
            <MembershipOnlyModal
                isOpen={showSubscriptionModal}
                onClose={() => {
                    setShowSubscriptionModal(false);
                    setSubscriptionModalArtistId(null);
                }}
                artistId={artist?.id ?? subscriptionModalArtistId}
                artistName={artist?.name}
                contentLabel="라이브"
            />
        </div>
    );
}

export default function ArtistDetailPage({ params }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams?.id;
    return (
        <Suspense fallback={null}>
            <ArtistDetailPageInner id={id} />
        </Suspense>
    );
}