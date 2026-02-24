"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

// 데이터 및 유틸리티
import { MOCK_ARTISTS, MOCK_POSTS } from "@/lib/mockData";
import { list as listMusicVideos, getSafeEmbedUrl } from "@/lib/musicVideoApi";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { listByArtist as listReplays } from "@/lib/replayApi";
import { request, apiGet, apiPost, BASE_URL, getAuthHeaders } from "@/lib/api";
import {
    isUpcoming,
    concertIncludesArtist,
    formatArtists,
    getArtistNamesArray,
    formatDateShort,
    getConcertStatus,
    getConcertStatusBadgeLabel,
    CONCERT_STATUS_KEYS
} from "@/lib/concertUtils";
import { usePostAttachments } from "@/lib/usePostAttachments";
import { MAX_POST_ATTACHMENTS } from "@/lib/mediaAssetApi";

// 컴포넌트
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";
import DraggableAttachmentGrid from "@/components/common/DraggableAttachmentGrid";
import MembershipOnlyModal from "@/components/common/MembershipOnlyModal";

// --- 상수 및 헬퍼 함수 ---
const CANDY_COST = 500;
const FAN_PROFILES_API = `${BASE_URL}/api/fan-profiles`;

function getCurrentUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("accessToken");
    if (!raw) return null;
    try {
        const token = raw.replace(/^Bearer\s+/i, "").trim();
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return { email: payload.sub, role: (payload.role || "").replace("ROLE_", "") };
    } catch { return null; }
}

function getConcertId(concert) {
    if (!concert) return null;
    return concert.id ?? concert.concertId ?? concert.concert_id ?? concert?.concert?.id ?? null;
}

function formatTimestamp(instant) {
    if (!instant) return "방금 전";
    try {
        const date = new Date(instant);
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);
        if (diffSec < 60) return "방금 전";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}분 전`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}시간 전`;
        return date.toLocaleDateString("ko-KR");
    } catch { return "방금 전"; }
}

function transformArtistPost(p, groupAvatar = "") {
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    return {
        id: p.id,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorAvatar: p.writerProfileImageUrl || groupAvatar,
        content: p.content || "",
        image: attachments[0]?.url || null,
        attachmentCount: attachments.length,
        timestamp: formatTimestamp(p.createdAt),
        isMembershipOnly: p.isMembershipOnly ?? false,
        isLockedByServer: !!(p.isMembershipOnly && p.content === null),
        isNotice: !!p.isNotice,
        type: "ARTIST",
    };
}

function transformFanPost(p) {
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    return {
        id: p.id,
        writerId: p.writerId ?? null,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorGradeName: p.writerGradeName ?? null,
        authorAvatar: p.writerProfileImageUrl || "",
        content: p.content || "",
        image: attachments[0]?.url || null,
        attachmentCount: attachments.length,
        timestamp: formatTimestamp(p.createdAt),
        type: "FAN",
    };
}

const POSTS_LIMIT = 10;

// --- 메인 컴포넌트 (Inner) ---
function ArtistDetailPageInner({ paramsId }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const VALID_TABS = ["ARTIST", "FAN", "LIVE", "MARKET", "MV"];

    // 상태 관리
    const [artist, setArtist] = useState(null);
    const [activeTab, setActiveTab] = useState(tabParam && VALID_TABS.includes(tabParam) ? tabParam : "ARTIST");
    const [currentUser, setCurrentUser] = useState(null);
    const [fanProfiles, setFanProfiles] = useState([]);

    // 포스트 데이터 및 페이징
    const [artistPosts, setArtistPosts] = useState([]);
    const [fanPosts, setFanPosts] = useState([]);
    const [artistNotices, setArtistNotices] = useState([]);
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
    const [myUserId, setMyUserId] = useState(null);
    const [myGroupId, setMyGroupId] = useState(null);
    const [createPostLoading, setCreatePostLoading] = useState(false);

    // 참여 공연: 상단 섹션용(다가오는 것만), 공연 탭용(다가오는+종료된, 백엔드 includeEnded 지원 시)
    const [artistConcerts, setArtistConcerts] = useState([]);
    const [artistConcertsForTab, setArtistConcertsForTab] = useState([]);
    const [artistConcertsLoading, setArtistConcertsLoading] = useState(false);
    const [musicVideos, setMusicVideos] = useState([]);
    const [musicVideosLoading, setMusicVideosLoading] = useState(false);
    const [liveSessions, setLiveSessions] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveError, setLiveError] = useState("");
    const [vodList, setVodList] = useState([]);
    const [vodLoading, setVodLoading] = useState(false);

    // 모달 및 UI 상태
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [liveCardCheckingId, setLiveCardCheckingId] = useState(null);
    const [likedPostIds, setLikedPostIds] = useState(new Set());

    const fanPostFileInputRef = useRef(null);
    const artistPostsBottomRef = useRef(null);
    const fanPostsBottomRef = useRef(null);
    const [selectedMV, setSelectedMV] = useState(null);
    const [mvSearchQuery, setMvSearchQuery] = useState("");
    const [mvComments, setMvComments] = useState([]);
    const [mvCommentsLoading, setMvCommentsLoading] = useState(false);
    const [mvNewComment, setMvNewComment] = useState("");
    const [mvCommentSubmitting, setMvCommentSubmitting] = useState(false);
    const groupId = Number(paramsId);
    const postGroupId = groupId;
    const isRealGroup = !isNaN(groupId);

    const {
        mediaAssetIds: fanPostMediaAssetIds,
        attachmentPreviews: fanPostAttachmentPreviews,
        addAttachment: addFanPostAttachment,
        removeAttachment: removeFanPostAttachment,
        setRepresentative: setFanPostRepresentative,
        reorderAttachments: reorderFanPostAttachments,
        resetAttachments: resetFanPostAttachments,
        canAddAttachment: canAddFanPostAttachment,
        uploading: fanPostUploading,
        uploadError: fanPostUploadError,
        representativeMediaAssetId: fanPostRepresentativeId,
    } = usePostAttachments({
        postGroupId: groupId,
        postIdOrTemp: "tmp_fan_new",
    });

    // 1. 아티스트 기본 정보 및 대시보드 로드
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
                        isSubscribed: membership.hasActiveMembership || false,
                        memberCount: info.followerCount || 0,
                        postCount: info.postCount || 0,
                        members: info.members || [],
                        backendId: groupId
                    });
                })
                .catch(() => {
                    const mock = MOCK_ARTISTS.find(x => x.id === paramsId) || MOCK_ARTISTS[0];
                    setArtist(mock);
                });
        } else {
            const mock = MOCK_ARTISTS.find(x => x.id === paramsId) || MOCK_ARTISTS[0];
            setArtist(mock);
        }
    }, [paramsId, groupId, isRealGroup]);

    // 2. 참여 공연 정보 로드 (상단: 다가오는 공연만, 공연 탭: 다가오는+종료된. 백엔드가 includeEnded 지원 시 종료 공연 포함)
    useEffect(() => {
        if (!artist?.name) return;
        setArtistConcertsLoading(true);
        apiGet("/api/concerts", { query: { includeEnded: "true" } })
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                const forArtist = list.filter(c => concertIncludesArtist(c, artist.name));
                setArtistConcerts(forArtist.filter(c => isUpcoming(c)));
                setArtistConcertsForTab(forArtist);
            })
            .catch(() => {
                setArtistConcerts([]);
                setArtistConcertsForTab([]);
            })
            .finally(() => setArtistConcertsLoading(false));
    }, [artist?.name]);

    // 3. 라이브 세션 로드
    useEffect(() => {
        if (!artist) return;
        const fetchLive = async () => {
            setLiveLoading(true);
            try {
                const data = await apiGet(`/api/live-sessions?artistId=${artist.backendId || artist.id}&status=LIVE`);
                setLiveSessions(Array.isArray(data) ? data : []);
            } catch (e) {
                setLiveError("라이브 정보를 불러오지 못했습니다.");
            } finally {
                setLiveLoading(false);
            }
        };
        fetchLive();
    }, [artist]);

    // 4. 팬 프로필 (출석용) + 내 userId 로드
    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (!user) return;
        request("/api/user/profile")
            .then((data) => {
              setMyUserId(data?.id ?? null);
              setMyGroupId(data?.groupId ?? null);
            })
            .catch(() => {});
        axios.get(`${FAN_PROFILES_API}/me`, { headers: getAuthHeaders() })
            .then(res => {
                const list = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
                setFanProfiles(list);
            })
            .catch(() => {});
    }, []);

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

    // [A] ARTIST 탭: 아티스트 포스트 조회
    useEffect(() => {
        if (activeTab !== "ARTIST" || !isRealGroup || !groupId) return;
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
    }, [activeTab, groupId, isRealGroup, artist?.avatar]);

    // [B] FAN 탭: 팬 포스트 조회
    useEffect(() => {
        if (activeTab !== "FAN" || !isRealGroup || !groupId || !artist?.isFollowing) return;
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
    }, [activeTab, groupId, isRealGroup, artist?.isFollowing]);

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

    useEffect(() => {
        if (!artistPostsHasNext || artistPostsLoading) return;
        const el = artistPostsBottomRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry?.isIntersecting) loadMoreArtistPosts(); },
            { rootMargin: "100px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [artistPostsHasNext, artistPostsLastId, loadMoreArtistPosts, artistPostsLoading]);

    useEffect(() => {
        if (!fanPostsHasNext || fanPostsLoading) return;
        const el = fanPostsBottomRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry?.isIntersecting) loadMoreFanPosts(); },
            { rootMargin: "100px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [fanPostsHasNext, fanPostsLastId, loadMoreFanPosts, fanPostsLoading]);

    // 4-1. 공지사항 (탭 아래 섹션용, 최근 3건)
    useEffect(() => {
        if (!isRealGroup || !groupId) return;
        request("/api/artist-posts/notices", { query: { groupId, limit: 3 } })
            .then((data) => {
                const list = Array.isArray(data) ? data : (data?.content ?? []);
                setArtistNotices(list);
            })
            .catch(() => setArtistNotices([]));
    }, [groupId, isRealGroup]);

    // 5. LIVE 탭 활성화 시 다시보기(VOD) 목록 로드
    useEffect(() => {
        if (activeTab !== "LIVE" || !artist?.backendId) return;
        setVodLoading(true);
        listReplays(artist.backendId)
            .then((list) => setVodList(Array.isArray(list) ? list : []))
            .catch(() => setVodList([]))
            .finally(() => setVodLoading(false));
    }, [activeTab, artist?.backendId]);

    // 6. MV 탭 활성화 시 로드 (검색어 포함)
    const mvSearchTimerRef = useRef(null);
    const loadMusicVideos = useCallback((keyword) => {
        if (!artist) return;
        setMusicVideosLoading(true);
        listMusicVideos(artist.backendId || artist.id, keyword)
            .then(res => setMusicVideos(Array.isArray(res) ? res : []))
            .catch(() => setMusicVideos([]))
            .finally(() => setMusicVideosLoading(false));
    }, [artist]);

    useEffect(() => {
        if (activeTab === "MV") loadMusicVideos(mvSearchQuery);
    }, [activeTab, artist]);

    useEffect(() => {
        if (activeTab !== "MV" || !artist) return;
        clearTimeout(mvSearchTimerRef.current);
        mvSearchTimerRef.current = setTimeout(() => {
            loadMusicVideos(mvSearchQuery);
        }, 300);
        return () => clearTimeout(mvSearchTimerRef.current);
    }, [mvSearchQuery]);

    // MV 댓글 로드
    const loadMvComments = useCallback((videoId) => {
        if (!videoId) return;
        setMvCommentsLoading(true);
        request(`/api/comments?targetType=MEDIA&targetId=${videoId}&size=50`)
            .then((data) => setMvComments(data?.content || []))
            .catch(() => setMvComments([]))
            .finally(() => setMvCommentsLoading(false));
    }, []);

    useEffect(() => {
        if (selectedMV?.id) loadMvComments(selectedMV.id);
        else setMvComments([]);
    }, [selectedMV?.id]);

    const handleMvCommentSubmit = async () => {
        if (!mvNewComment.trim() || !selectedMV?.id || mvCommentSubmitting) return;
        setMvCommentSubmitting(true);
        try {
            await request("/api/comments", {
                method: "POST",
                body: { targetId: selectedMV.id, targetType: "MEDIA", content: mvNewComment.trim() },
            });
            setMvNewComment("");
            loadMvComments(selectedMV.id);
        } catch (err) {
            console.error("댓글 작성 실패", err);
        } finally {
            setMvCommentSubmitting(false);
        }
    };

    const handleMvCommentDelete = async (commentId) => {
        try {
            await request(`/api/comments/${commentId}`, { method: "DELETE" });
            loadMvComments(selectedMV.id);
        } catch (err) {
            console.error("댓글 삭제 실패", err);
        }
    };

    // --- 핸들러 함수들 ---

    const handleTabClick = (tabId) => {
        if (tabId === "MARKET") {
            router.push(`/artists/${paramsId}/market`);
            return;
        }
        setActiveTab(tabId);
        router.replace(`?tab=${tabId}`, { scroll: false });
    };

    const handleAttendance = async () => {
        let fanProfile = fanProfiles.find(p => String(p.groupId) === String(paramsId) || String(p.artistId) === String(paramsId) || (artist?.name && p.groupName === artist.name));
        if (!fanProfile && !attendanceLoading && isRealGroup && groupId) {
            try {
                const { data } = await axios.post(`${FAN_PROFILES_API}`, { groupId }, { headers: getAuthHeaders() });
                if (data?.id) {
                    setFanProfiles(prev => [...prev, data]);
                    fanProfile = data;
                }
            } catch (e) { /* 이미 있거나 실패 시 아래에서 알림 */ }
        }
        if (!fanProfile || attendanceLoading) {
            if (!fanProfile) alert("이 아티스트에 대한 출석 정보를 불러올 수 없습니다. 잠시 후 새로고침 후 다시 시도해 주세요.");
            return;
        }
        const todayStr = new Date().toLocaleDateString("en-CA");
        const lastVisit = fanProfile.lastVisitDate != null ? String(fanProfile.lastVisitDate).slice(0, 10) : null;
        if (lastVisit === todayStr) return;
        setAttendanceLoading(true);
        try {
            await axios.post(`${FAN_PROFILES_API}/${fanProfile.id}/increase-visit`, {}, { headers: getAuthHeaders() });
            setFanProfiles(prev => prev.map(p => p.id === fanProfile.id ? { ...p, visitCount: (p.visitCount || 0) + 1, lastVisitDate: todayStr } : p));
            alert("출석 완료!");
        } catch (err) {
            if (err?.response?.data?.code === "ALREADY_VISITED_TODAY") {
                setFanProfiles(prev => prev.map(p => p.id === fanProfile.id ? { ...p, lastVisitDate: todayStr } : p));
                alert("오늘 이미 출석했습니다.");
            } else console.error(err);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleLiveCardClick = async (session) => {
        if (liveCardCheckingId != null) return;
        setLiveCardCheckingId(session.id);
        try {
            await apiGet(`/api/live-sessions/${session.id}/access`);
            router.push(`/live/${session.id}`);
        } catch (e) {
            setShowSubscriptionModal(true);
        } finally {
            setLiveCardCheckingId(null);
        }
    };

    const handleLike = (postId) => {
        setLikedPostIds(prev => {
            const next = new Set(prev);
            if (next.has(postId)) next.delete(postId);
            else next.add(postId);
            return next;
        });
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

    const handleDeleteFanPost = async (postId) => {
        if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
        try {
            await request(`/api/fan-posts/${postId}`, { method: "DELETE" });
            setFanPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("팬 포스트 삭제 실패", err);
        }
    };

    const handleEditFanPost = (postId) => {
        router.push(`/posts/${postId}/edit?type=FAN&groupId=${postGroupId}`);
    };

    const closeFanPostModal = () => {
        setNewPostContent("");
        resetFanPostAttachments();
        setShowCreateModal(false);
    };

    const handleFanPostFileChange = async (e) => {
        const file = e?.target?.files?.[0];
        if (!file) return;
        await addFanPostAttachment(file);
        e.target.value = "";
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || createPostLoading || fanPostUploading) return;

        if (isRealGroup && groupId) {
            setCreatePostLoading(true);
            try {
                const created = await request("/api/fan-posts", {
                    method: "POST",
                    body: {
                        groupId,
                        title: "",
                        content: newPostContent.trim(),
                        mediaAssetIds: fanPostMediaAssetIds.length > 0 ? fanPostMediaAssetIds : null,
                        representativeMediaAssetId: fanPostRepresentativeId,
                    },
                });
                const newPost = transformFanPost(created);
                setFanPosts((prev) => [newPost, ...prev]);
                closeFanPostModal();
                fetchFanPostsMeta([newPost]).catch(() => {});
            } catch (err) {
                console.error("팬 포스트 생성 실패", err);
            } finally {
                setCreatePostLoading(false);
            }
        } else {
            const newPost = {
                id: `p-new-${Date.now()}`,
                writerId: myUserId,
                authorName: currentUser?.email?.split("@")[0] || "Me",
                authorAvatar: "",
                content: newPostContent,
                image: null,
                timestamp: "방금 전",
                type: "FAN",
            };
            setFanPosts([newPost, ...fanPosts]);
            closeFanPostModal();
        }
    };

    if (!artist) return null;

    const todayStr = new Date().toLocaleDateString("en-CA");
    const currentFanProfile = fanProfiles.find(p => String(p.groupId) === String(paramsId) || String(p.artistId) === String(paramsId) || (artist?.name && p.groupName === artist.name));
    const lastVisitStr = currentFanProfile?.lastVisitDate != null ? String(currentFanProfile.lastVisitDate).slice(0, 10) : null;
    const attendanceDoneToday = !!currentFanProfile && lastVisitStr === todayStr;

    const tabs = [
        { id: "ARTIST", label: "Artist" },
        { id: "FAN", label: "Fan" },
        { id: "LIVE", label: "Live" },
        { id: "CONCERT", label: "Concert" },
        { id: "MARKET", label: "Market" },
        { id: "MV", label: "MV" },
    ];

    return (
        <div className="flex flex-col min-h-full relative pb-20">
            {/* 커버 섹션 */}
            <div className="h-64 w-full relative overflow-hidden shrink-0 group/cover">
                {artist.cover ? <img src={artist.cover} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/5" />}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0814]/40 to-[#0b0814]" />
                {isRealGroup && myGroupId != null && String(myGroupId) === String(groupId) && (
                    <Link
                        href="/mypage?open=artist-profile"
                        className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-black/50 hover:bg-violet-600/80 text-white text-sm font-medium border border-white/10 opacity-0 group-hover/cover:opacity-100 transition-opacity"
                    >
                        커버 이미지 변경
                    </Link>
                )}
            </div>

            {/* 헤더 프로필 */}
            <div className="max-w-6xl w-full mx-auto px-8 relative -mt-20 z-10 shrink-0">
                <Surface variant="primary" className="p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-end gap-6">
                        <div className="rounded-2xl border-2 border-white/[0.08] shadow-2xl -mt-24 overflow-hidden bg-[#201a33] size-40">
                            {artist.avatar ? <img src={artist.avatar} className="w-full h-full object-cover" alt={artist.name} /> : <div className="w-full h-full bg-white/10" />}
                        </div>
                        <div className="pb-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-4xl font-bold text-white tracking-tight">{artist.name}</h1>
                                <span className="material-symbols-outlined text-violet-300 text-2xl">verified</span>
                            </div>
                            <p className="text-white/55 font-medium mt-2">
                                팔로우 {Number(artist.memberCount ?? 0).toLocaleString()} • 포스트 {Number(artist.postCount ?? 0).toLocaleString()}개
                            </p>
                        </div>
                    </div>
                    <div className="pb-1 flex items-center gap-3">
                        {artist.isFollowing ? (
                            <>
                                {artist.isSubscribed ? (
                                    <Button variant="ghost" className="px-8" disabled>구독 중</Button>
                                ) : (
                                    <Button variant="ghost" className="px-8" disabled>팔로우중</Button>
                                )}
                                <Button variant="primary" className="px-6" onClick={handleAttendance} disabled={attendanceLoading || attendanceDoneToday}>
                                    {attendanceLoading ? "..." : (attendanceDoneToday ? "오늘 출석 완료" : "출석")}
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="primary"
                                className="px-10 py-4"
                                onClick={async () => {
                                    const id = artist.backendId ?? artist.id;
                                    if (!id || !isRealGroup) return;
                                    try {
                                        await apiPost(`/api/user/follow/${id}`);
                                        setArtist((prev) => (prev ? { ...prev, isFollowing: true, memberCount: (prev.memberCount || 0) + 1 } : prev));
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}>
                                팔로우하기
                            </Button>
                        )}
                    </div>
                </Surface>
            </div>

            {/* 참여 공연 섹션 (다가오는 공연만, 상태/D-Day 동일 스타일) */}
            {artistConcerts.length > 0 && (() => {
                const now = new Date();
                return (
                    <div className="max-w-6xl w-full mx-auto px-8 mt-12">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5 px-1">Upcoming Concerts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {artistConcerts.map((c, i) => {
                                const concertId = getConcertId(c);
                                if (!concertId && typeof console !== "undefined" && console.warn) console.warn("Concert id missing", c);
                                const status = getConcertStatus(c, now);
                                const badgeLabel = getConcertStatusBadgeLabel(c, now);
                                const badgeClass = {
                                    [CONCERT_STATUS_KEYS.LIVE]: "bg-amber-500/90 text-black font-medium",
                                    [CONCERT_STATUS_KEYS.ENDED]: "bg-white/20 text-white/90",
                                    [CONCERT_STATUS_KEYS.SALE]: "bg-violet-500/90 text-white font-medium",
                                    [CONCERT_STATUS_KEYS.PRESALE]: "bg-violet-400/80 text-white font-medium",
                                    [CONCERT_STATUS_KEYS.SALE_UPCOMING]: "bg-amber-500/90 text-white font-medium",
                                    [CONCERT_STATUS_KEYS.UPCOMING]: "bg-white/10 text-white/80 border border-white/20 font-medium",
                                }[status.key] ?? "bg-white/20 text-white/90 font-medium";
                                const cardContent = (
                                    <>
                                        <div className="aspect-[16/10] overflow-hidden relative">
                                            <img src={c.concertImageUrl || c.posterImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                                                {badgeLabel}
                                            </span>
                                        </div>
                                        <div className="p-5">
                                            <h4 className="font-bold text-white truncate">{c.title}</h4>
                                            <p className="text-white/50 text-xs mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span>{formatDateShort(c.startDateTime)}</span>
                                                <span>•</span>
                                                <span>{c.placeName || c.venueName}</span>
                                            </p>
                                        </div>
                                    </>
                                );
                                const key = concertId ?? `concert-${i}`;
                                const className = "group block rounded-2xl border border-white/5 bg-white/[0.03] hover:border-violet-500/40 transition-all overflow-hidden";
                                return concertId ? (
                                    <Link key={key} href={`/concerts/${concertId}`} className={className}>
                                        {cardContent}
                                    </Link>
                                ) : (
                                    <div key={key} className={className} aria-disabled="true">
                                        {cardContent}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* 탭 메뉴 */}
            <div className="sticky top-16 bg-[#0b0814]/95 backdrop-blur-md z-20 border-b border-white/[0.06] mt-12">
                <div className="max-w-6xl mx-auto px-8 flex gap-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`py-5 text-sm font-bold tracking-wide transition-colors border-b-2 -mb-px ${
                                activeTab === tab.id ? "border-violet-400 text-violet-300" : "border-transparent text-white/40 hover:text-white/80"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 공지사항 섹션 (탭과 피드 사이) */}
            {(() => {
                const notices = isRealGroup ? artistNotices : MOCK_POSTS.filter(p => p.artistId === paramsId && p.type === "NOTICE");
                if (notices.length === 0) return null;
                const latest = notices[0];
                return (
                    <div className="max-w-6xl w-full mx-auto px-8 pt-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h3 className="text-xs font-black text-white/50 uppercase tracking-widest">공지사항</h3>
                            <Link
                                href={`/artists/${paramsId}/notices`}
                                className="text-xs font-bold text-violet-300 hover:text-violet-200 flex items-center gap-1"
                            >
                                전체 공지 확인
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </Link>
                        </div>
                        <Link
                            href={`/posts/${latest.id}?type=ARTIST&groupId=${groupId}`}
                            className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-violet-500/30 hover:bg-white/[0.05] transition-all p-5"
                        >
                            <div className="flex gap-3 items-center mb-2">
                                <span className="bg-white/10 text-white/60 text-[10px] px-2 py-1 rounded font-bold">NOTICE</span>
                                <span className="text-white/40 text-xs">{latest.timestamp || formatTimestamp(latest.createdAt)}</span>
                            </div>
                            <p className="text-white/80 font-medium line-clamp-2">{latest.title || (latest.content ? `${(latest.content || "").slice(0, 80)}${(latest.content || "").length > 80 ? "..." : ""}` : "공지")}</p>
                        </Link>
                    </div>
                );
            })()}

            {/* 메인 콘텐츠 영역 */}
            <div className="max-w-6xl w-full mx-auto px-8 py-10 grid grid-cols-12 gap-10">
                <div className="col-span-12 lg:col-span-8">
                    {activeTab === "ARTIST" && (
                        !currentUser ? (
                            <Surface className="p-20 text-center border border-white/10">
                                <p className="text-white/70 font-medium mb-2">로그인 후 이용해 주세요.</p>
                                <p className="text-sm text-white/50 mb-6">아티스트 게시글을 보려면 로그인이 필요합니다.</p>
                                <Button href="/login" variant="primary" className="px-8 py-3">
                                    로그인
                                </Button>
                            </Surface>
                        ) : artistPostsLoading ? (
                            <Surface className="py-12 text-center">
                                <p className="text-white/55">로딩 중...</p>
                            </Surface>
                        ) : (() => {
                            const posts = isRealGroup ? artistPosts : MOCK_POSTS.filter(p => p.artistId === paramsId && p.type === "ARTIST").map(p => ({
                                id: p.id,
                                authorName: p.authorName,
                                authorAvatar: p.authorAvatar,
                                content: p.content,
                                image: p.image,
                                timestamp: p.timestamp,
                                type: "ARTIST",
                            }));
                            if (posts.length === 0) {
                                return <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">아티스트 게시글이 없습니다.</p>;
                            }
                            return (
                                <>
                                    <PostFeed
                                        posts={posts}
                                        postLinkBase="/posts"
                                        postLinkQuery={`type=ARTIST&groupId=${postGroupId}`}
                                        showVerifiedByType={true}
                                        isLikedMap={artistIsLikedMap}
                                        likeCountMap={artistLikeCountMap}
                                        commentCountMap={artistCommentCountMap}
                                        onLike={handleArtistPostLike}
                                        onComment={(postId) => router.push(`/posts/${postId}?type=ARTIST&groupId=${postGroupId}`)}
                                        isLockedMap={Object.fromEntries(
                                            posts.map((p) => [
                                                p.id,
                                                p.isLockedByServer || !!(p.isMembershipOnly && !artist?.isSubscribed),
                                            ])
                                        )}
                                    />
                                    <div ref={artistPostsBottomRef} className="py-1">
                                        {artistPostsLoadingMore && <p className="text-white/40 text-xs text-center py-4">불러오는 중...</p>}
                                    </div>
                                </>
                            );
                        })()
                    )}

                    {activeTab === "FAN" && (
                        !currentUser ? (
                            <Surface className="p-20 text-center border border-white/10">
                                <p className="text-white/70 font-medium mb-2">로그인 후 이용해 주세요.</p>
                                <p className="text-sm text-white/50 mb-6">팬 탭 게시글을 보려면 로그인이 필요합니다.</p>
                                <Button href="/login" variant="primary" className="px-8 py-3">
                                    로그인
                                </Button>
                            </Surface>
                        ) : (
                            <>
                                {artist.isFollowing ? (
                                    <div className="space-y-6">
                                        <div className="flex justify-end">
                                            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                                                <span className="material-symbols-outlined mr-2">edit</span> 팬 포스트 작성
                                            </Button>
                                        </div>
                                        {fanPostsLoading ? (
                                            <Surface className="py-12 text-center">
                                                <p className="text-white/55">로딩 중...</p>
                                            </Surface>
                                        ) : (() => {
                                            const posts = isRealGroup ? fanPosts : MOCK_POSTS.filter(p => p.artistId === paramsId && p.type === "FAN").map(p => ({
                                                id: p.id,
                                                writerId: null,
                                                authorName: p.authorName,
                                                authorAvatar: p.authorAvatar,
                                                content: p.content,
                                                image: p.image,
                                                timestamp: p.timestamp,
                                                type: "FAN",
                                            }));
                                            if (posts.length === 0) {
                                                return <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">등록된 포스트가 없습니다.</p>;
                                            }
                                            return (
                                                <>
                                                    <PostFeed
                                                        posts={posts}
                                                        postLinkBase="/posts"
                                                        postLinkQuery={`type=FAN&groupId=${postGroupId}`}
                                                        showVerifiedByType={true}
                                                        isLikedMap={fanIsLikedMap}
                                                        likeCountMap={fanLikeCountMap}
                                                        commentCountMap={fanCommentCountMap}
                                                        onLike={handleFanPostLike}
                                                        onComment={(postId) => router.push(`/posts/${postId}?type=FAN&groupId=${postGroupId}`)}
                                                        onDelete={handleDeleteFanPost}
                                                        canDeleteSet={myUserId ? new Set(posts.filter((p) => p.writerId === myUserId).map((p) => p.id)) : undefined}
                                                        onEdit={handleEditFanPost}
                                                        canEditSet={myUserId ? new Set(posts.filter((p) => p.writerId === myUserId).map((p) => p.id)) : undefined}
                                                    />
                                                    <div ref={fanPostsBottomRef} className="py-1">
                                                        {fanPostsLoadingMore && <p className="text-white/40 text-xs text-center py-4">불러오는 중...</p>}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <Surface className="p-20 text-center italic text-white/40">팔로우한 회원만 이용할 수 있습니다.</Surface>
                                )}
                            </>
                        )
                    )}

                    {activeTab === "LIVE" && (
                        <div className="space-y-12">
                            <section>
                                <h3 className="text-xs font-black text-white/40 mb-6 uppercase tracking-widest">Live Now</h3>
                                {liveLoading ? <p className="text-white/40">로딩 중...</p> :
                                    liveSessions.length > 0 ? (
                                        <div className="grid gap-6">
                                            {liveSessions.map(session => (
                                                <button key={session.id} onClick={() => handleLiveCardClick(session)} className="relative aspect-video rounded-3xl overflow-hidden group">
                                                    <img src="https://picsum.photos/seed/live/800/450" className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                                    <div className="absolute top-4 left-4 flex gap-2">
                                                        <span className="bg-red-600 px-3 py-1 text-[10px] font-black rounded text-white">LIVE</span>
                                                        {session.isPaid && <span className="bg-violet-600 px-3 py-1 text-[10px] font-black rounded text-white">MEMBERSHIP</span>}
                                                    </div>
                                                    <div className="absolute bottom-6 left-6 text-left">
                                                        <h4 className="text-2xl font-bold text-white">{session.title}</h4>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">현재 진행 중인 라이브가 없습니다.</p>}
                            </section>

                            <section>
                                <h3 className="text-xs font-black text-white/40 mb-6 uppercase tracking-widest">Replay (VOD)</h3>
                                {vodLoading ? (
                                    <p className="text-white/40 py-12 text-center">로딩 중...</p>
                                ) : vodList.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-6">
                                        {vodList.map((vod) => (
                                            <Link key={vod.replayId} href={`/replay/${vod.replayId}`} className="group">
                                                <div className="aspect-video rounded-2xl overflow-hidden relative mb-3">
                                                    <img src={vod.thumbnailUrl || "https://picsum.photos/seed/vod/800/450"} className="w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                        <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                                                    </div>
                                                </div>
                                                <h5 className="font-bold text-white truncate">다시보기</h5>
                                                <p className="text-white/40 text-xs mt-1">{vod.publishedAt ? new Date(vod.publishedAt).toLocaleDateString("ko-KR") : ""}</p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">다시보기가 없습니다.</p>
                                )}
                            </section>
                        </div>
                    )}

                    {activeTab === "CONCERT" && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 px-1">
                                Concert
                            </h3>
                            {artistConcertsForTab.length === 0 ? (
                                <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">
                                    공연이 없습니다.
                                </p>
                            ) : (
                                (() => {
                                    const now = new Date();
                                    return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                            {artistConcertsForTab.map((c, i) => {
                                                const concertId = getConcertId(c);
                                                if (!concertId && typeof console !== "undefined" && console.warn) console.warn("Concert id missing", c);
                                                const key = concertId ?? `concert-${i}`;
                                                const status = getConcertStatus(c, now);
                                                const badgeLabel = getConcertStatusBadgeLabel(c, now);
                                                const badgeClass = {
                                                    [CONCERT_STATUS_KEYS.LIVE]: "bg-amber-500/90 text-black font-medium",
                                                    [CONCERT_STATUS_KEYS.ENDED]: "bg-white/20 text-white/90",
                                                    [CONCERT_STATUS_KEYS.SALE]: "bg-violet-500/90 text-white font-medium",
                                                    [CONCERT_STATUS_KEYS.PRESALE]: "bg-violet-400/80 text-white font-medium",
                                                    [CONCERT_STATUS_KEYS.SALE_UPCOMING]: "bg-amber-500/90 text-white font-medium",
                                                    [CONCERT_STATUS_KEYS.UPCOMING]: "bg-white/10 text-white/80 border border-white/20 font-medium",
                                                }[status.key] ?? "bg-white/20 text-white/90 font-medium";
                                                const className = "group block rounded-2xl border border-white/5 bg-white/[0.03] hover:border-violet-500/40 transition-all overflow-hidden";
                                                const cardContent = (
                                                    <>
                                                        <div className="aspect-[16/10] overflow-hidden relative">
                                                            <img
                                                                src={c.concertImageUrl || c.posterImageUrl}
                                                                alt=""
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                                                                {badgeLabel}
                                                            </span>
                                                        </div>
                                                        <div className="p-5">
                                                            <h4 className="font-bold text-white truncate">{c.title}</h4>
                                                            <p className="text-white/50 text-xs mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                <span>{formatDateShort(c.startDateTime)}</span>
                                                                <span>•</span>
                                                                <span>{c.placeName || c.venueName}</span>
                                                            </p>
                                                        </div>
                                                    </>
                                                );
                                                return concertId ? (
                                                    <Link key={key} href={`/concerts/${concertId}`} className={className}>
                                                        {cardContent}
                                                    </Link>
                                                ) : (
                                                    <div key={key} className={className} aria-disabled="true">
                                                        {cardContent}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    )}

                    {activeTab === "MV" && (
                        <div className="space-y-6">
                            {musicVideos.length > 0 && (
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                                    <input
                                        type="text"
                                        value={mvSearchQuery}
                                        onChange={(e) => setMvSearchQuery(e.target.value)}
                                        placeholder="MV 제목 검색"
                                        className="pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm w-full sm:w-72 placeholder:text-white/30"
                                    />
                                </div>
                            )}

                            {selectedMV && (
                                <Surface variant="primary" className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-white truncate flex-1 mr-4">{selectedMV.title}</h3>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMV(null)}
                                            className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>
                                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                        <iframe
                                            src={getSafeEmbedUrl(selectedMV.embedUrl)}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-full"
                                            title={selectedMV.title}
                                            referrerPolicy="strict-origin-when-cross-origin"
                                        />
                                    </div>
                                    {selectedMV.description && (
                                        <p className="text-white/60 text-sm mt-4 whitespace-pre-wrap">{selectedMV.description}</p>
                                    )}

                                    {/* 댓글 섹션 */}
                                    <div className="mt-6 border-t border-white/[0.06] pt-6">
                                        <h4 className="text-sm font-bold text-white/80 mb-4">
                                            댓글 {mvComments.length > 0 && `(${mvComments.length})`}
                                        </h4>
                                        {currentUser && (
                                            <div className="flex gap-3 mb-4">
                                                <input
                                                    type="text"
                                                    value={mvNewComment}
                                                    onChange={(e) => setMvNewComment(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleMvCommentSubmit(); } }}
                                                    placeholder="댓글을 입력하세요..."
                                                    className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30"
                                                />
                                                <button
                                                    type="button"
                                                    className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 transition-colors disabled:opacity-50 shrink-0"
                                                    onClick={handleMvCommentSubmit}
                                                    disabled={mvCommentSubmitting || !mvNewComment.trim()}
                                                >
                                                    {mvCommentSubmitting ? "..." : "작성"}
                                                </button>
                                            </div>
                                        )}
                                        {mvCommentsLoading ? (
                                            <p className="text-white/40 text-sm">댓글 로딩 중...</p>
                                        ) : mvComments.length === 0 ? (
                                            <p className="text-white/40 text-sm">아직 댓글이 없습니다.</p>
                                        ) : (
                                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                                {mvComments.map((c) => (
                                                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                                                        <img
                                                            src={c.profileImageUrl || getDefaultAvatarUrl(c.nickname || "?")}
                                                            alt=""
                                                            className="size-8 rounded-full object-cover shrink-0 border border-white/[0.08]"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-xs font-bold text-white/80 truncate">{c.nickname || "알 수 없음"}</span>
                                                                {c.isArtist && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold">아티스트</span>
                                                                )}
                                                                {c.writerGradeName && !c.isArtist && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-bold">{c.writerGradeName}</span>
                                                                )}
                                                                <span className="text-[10px] text-white/30">
                                                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("ko-KR") : ""}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-white/70 break-words">{c.content}</p>
                                                        </div>
                                                        {currentUser && c.userId === currentUser.id && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMvCommentDelete(c.id)}
                                                                className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                                                                title="삭제"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Surface>
                            )}

                            {musicVideosLoading ? (
                                <p className="text-white/40">로딩 중...</p>
                            ) : musicVideos.length === 0 && !mvSearchQuery.trim() ? (
                                <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">MV가 없습니다.</p>
                            ) : musicVideos.length === 0 ? (
                                <p className="text-white/30 py-12 text-center bg-white/5 rounded-2xl">검색 결과가 없습니다.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    {musicVideos.map(mv => (
                                        <Surface key={mv.id} className={`overflow-hidden group cursor-pointer transition-all ${selectedMV?.id === mv.id ? "ring-2 ring-violet-500" : ""}`}>
                                            <button type="button" onClick={() => setSelectedMV(mv)} className="w-full text-left">
                                                <div className="aspect-video relative overflow-hidden">
                                                    <img src={mv.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                        <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h4 className="font-bold text-white truncate">{mv.title}</h4>
                                                </div>
                                            </button>
                                        </Surface>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* 사이드바 */}
                <aside className="hidden lg:col-span-4 lg:flex flex-col gap-8">
                    <Surface variant="primary" className="p-8 border border-violet-500/20">
                        <span className="text-violet-300 text-[10px] font-black tracking-widest uppercase">Membership</span>
                        <h3 className="text-2xl font-bold text-white mt-3">공식 멤버십 가입</h3>
                        <p className="text-white/60 text-sm mt-4 leading-relaxed">
                            {artist.name}의 미공개 포스트와 라이브 스트리밍 혜택을 누리세요.
                        </p>
                        <div className="my-8 p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                            <span className="text-xs text-white/50 font-bold">월 구독료</span>
                            <span className="text-white font-bold">{CANDY_COST} 캔디</span>
                        </div>
                        <Button variant="primary" className="w-full py-4">멤버십 시작하기</Button>
                    </Surface>

                    {artist.members && artist.members.length > 0 && (
                        <Surface variant="secondary" className="p-8 sticky top-24">
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-6">Members</h3>
                            <div className="space-y-4">
                                {artist.members.map(m => (
                                    <div key={m.id} className="flex items-center gap-4 group">
                                        <img src={m.avatar} className="size-12 rounded-xl object-cover" alt="" />
                                        <div className="flex-1">
                                            <p className="text-white font-bold">{m.name}</p>
                                            <Link href="/dm" className="text-[10px] text-violet-400 font-black hover:underline uppercase mt-1 inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">mail</span> Send DM
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Surface>
                    )}
                </aside>
            </div>

            {/* 팬 포스트 작성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <Surface className="w-full max-w-xl p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">포스트 작성</h3>
                            <button onClick={closeFanPostModal} className="text-white/50 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <textarea
                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-violet-500/50"
                            placeholder="아티스트에게 전할 메시지를 입력하세요..."
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                        />
                        {/* 첨부파일 */}
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-sm text-white/40">attach_file</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/55">첨부파일</span>
                                <span className="text-[10px] font-bold text-white/40">{fanPostMediaAssetIds.length}/{MAX_POST_ATTACHMENTS}</span>
                                {fanPostAttachmentPreviews.length > 1 && (
                                    <span className="text-[9px] text-violet-400/70 ml-auto">클릭하여 대표 이미지 선택</span>
                                )}
                            </div>
                            <input ref={fanPostFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFanPostFileChange} />
                            {fanPostUploadError && (
                                <p className="text-red-400 text-xs mb-2">{fanPostUploadError}</p>
                            )}
                            {fanPostAttachmentPreviews.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-[10px] text-white/30 font-medium">
                                        클릭하여 대표 설정 · 드래그하여 순서 변경
                                    </p>
                                    <DraggableAttachmentGrid
                                        attachments={fanPostAttachmentPreviews}
                                        representativeId={fanPostRepresentativeId}
                                        onSetRepresentative={setFanPostRepresentative}
                                        onReorder={reorderFanPostAttachments}
                                        onRemove={removeFanPostAttachment}
                                    />
                                    {canAddFanPostAttachment && !fanPostUploading && (
                                        <button
                                            type="button"
                                            onClick={() => fanPostFileInputRef.current?.click()}
                                            className="w-full py-3 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/40 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                            <span className="text-[10px] font-bold">파일 추가</span>
                                        </button>
                                    )}
                                    {fanPostUploading && (
                                        <div className="flex items-center gap-2 py-2">
                                            <div className="size-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-violet-300 text-xs font-medium">업로드 중...</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fanPostFileInputRef.current?.click()}
                                    disabled={fanPostUploading}
                                    className="w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                    <span className="text-xs font-bold">{fanPostUploading ? "업로드 중..." : "사진 또는 동영상 추가"}</span>
                                    <span className="text-[10px] text-white/30">이미지·영상 최대 {MAX_POST_ATTACHMENTS}개</span>
                                </button>
                            )}
                        </div>
                        <Button variant="primary" className="w-full mt-6 py-4" onClick={handleCreatePost} disabled={createPostLoading || fanPostUploading || !newPostContent.trim()}>
                            {createPostLoading ? "게시 중..." : "게시하기"}
                        </Button>
                    </Surface>
                </div>
            )}

            <MembershipOnlyModal
                isOpen={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                artistId={artist.id}
                artistName={artist.name}
            />
        </div>
    );
}

// --- 최종 Export 컴포넌트 (Next.js Params 대응) ---
export default function ArtistDetailPage({ params }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams?.id;

    return (
        <Suspense fallback={<div className="p-20 text-center text-white/50">Loading Artist Page...</div>}>
            <ArtistDetailPageInner paramsId={id} />
        </Suspense>
    );
}