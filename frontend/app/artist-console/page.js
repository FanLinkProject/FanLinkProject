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
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";
import ProfileImageModal from "@/components/common/ProfileImageModal";
import DraggableAttachmentGrid from "@/components/common/DraggableAttachmentGrid";

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

function formatConcertDateTime(instantStr) {
    if (!instantStr) return "-";
    try {
        const d = new Date(instantStr);
        return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
        return "-";
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
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    return {
        id: p.id,
        writerId: p.writerId ?? null,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorAvatar: p.writerProfileImageUrl || groupAvatar,
        content: p.content || "",
        image: attachments[0]?.url || null,
        attachmentCount: attachments.length,
        timestamp: formatTimestamp(p.createdAt),
        isMembershipOnly: p.isMembershipOnly ?? false,
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

export default function ArtistConsolePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const VALID_TABS = ["POSTS", "FAN_POSTS", "LIVE", "MV"];
    const tabParam = searchParams.get("tab");
    const [activeTab, setActiveTab] = useState(tabParam && VALID_TABS.includes(tabParam) ? tabParam : "POSTS");

    // 현재 사용자 프로필
    const [currentUser, setCurrentUser] = useState(null);
    const [myId, setMyId] = useState(null);       // 본인 userId
    const [groupId, setGroupId] = useState(null); // GROUP 계정: 본인 ID / ARTIST: 소속 그룹 ID
    const [myProfile, setMyProfile] = useState(null);
    const [groupProfile, setGroupProfile] = useState(null); // 그룹 계정 프로필 (ARTIST 멤버인 경우 그룹 계정 정보)
    const [totalFollowers, setTotalFollowers] = useState(null);
    const [profileBio, setProfileBio] = useState(null);
    const [coverImageUrl, setCoverImageUrl] = useState(null);
    const [coverImageLoading, setCoverImageLoading] = useState(false);
    const coverFileRef = useRef(null);

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
    } = usePostAttachments({
        postGroupId: groupId,
        postIdOrTemp: "tmp_new",
    });

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

    const [endedLives, setEndedLives] = useState([]);
    const [showProfileImageModal, setShowProfileImageModal] = useState(false);

    // MV 탭
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
                    bio: data.artistInfo?.bio ?? "",
                });
            })
            .catch(() => {
                // 조회 실패 시 본인 프로필로 fallback
                setGroupProfile(null);
            });
    }, [groupId, myId, myProfile]);

    // 종료된 라이브 목록 (Live History 탭용)
    useEffect(() => {
        if (!groupId) return;
        request(`/api/live-sessions?artistId=${groupId}&status=ENDED`)
            .then((list) => setEndedLives(Array.isArray(list) ? list : []))
            .catch(() => setEndedLives([]));
    }, [groupId]);

    // MV 목록 로드 (검색어 포함)
    const loadMvList = useCallback((keyword) => {
        if (!groupId) return;
        setMvLoading(true);
        setMvError(null);
        listMusicVideos(groupId, keyword)
            .then(setMvList)
            .catch((e) => { setMvError(e?.data?.message || e.message || "목록 조회 실패"); setMvList([]); })
            .finally(() => setMvLoading(false));
    }, [groupId]);

    useEffect(() => {
        if (activeTab === "MV") loadMvList(mvSearchQuery);
    }, [activeTab, groupId]);

    // 검색어 변경 시 디바운스 서버 검색
    useEffect(() => {
        if (activeTab !== "MV" || !groupId) return;
        clearTimeout(mvSearchTimerRef.current);
        mvSearchTimerRef.current = setTimeout(() => {
            loadMvList(mvSearchQuery);
        }, 300);
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

    useEffect(() => {
        if (mvSelectedVideo?.id) loadMvComments(mvSelectedVideo.id);
        else setMvComments([]);
    }, [mvSelectedVideo?.id]);

    const handleMvSubmit = async (e) => {
        e.preventDefault();
        if (!mvForm.url.trim() || !mvForm.title.trim() || !mvForm.description.trim()) return;
        setMvSubmitting(true);
        setMvError(null);
        try {
            await createMusicVideo(groupId, mvForm);
            setMvForm({ url: "", title: "", description: "" });
            setMvShowForm(false);
            loadMvList(mvSearchQuery);
        } catch (err) {
            setMvError(err?.data?.message || err.message || "등록 실패");
        } finally {
            setMvSubmitting(false);
        }
    };

    const handleMvDelete = async (id) => {
        if (!confirm("이 뮤직비디오를 삭제할까요?")) return;
        setMvError(null);
        try {
            await removeMusicVideo(groupId, id);
            if (mvSelectedVideo?.id === id) setMvSelectedVideo(null);
            loadMvList(mvSearchQuery);
        } catch (err) {
            setMvError(err?.data?.message || err.message || "삭제 실패");
        }
    };

    const handleMvCommentSubmit = async () => {
        if (!mvNewComment.trim() || !mvSelectedVideo?.id || mvCommentSubmitting) return;
        setMvCommentSubmitting(true);
        try {
            await request("/api/comments", {
                method: "POST",
                body: { targetId: mvSelectedVideo.id, targetType: "MEDIA", content: mvNewComment.trim() },
            });
            setMvNewComment("");
            loadMvComments(mvSelectedVideo.id);
        } catch (err) {
            console.error("댓글 작성 실패", err);
        } finally {
            setMvCommentSubmitting(false);
        }
    };

    const handleMvCommentDelete = async (commentId) => {
        try {
            await request(`/api/comments/${commentId}`, { method: "DELETE" });
            loadMvComments(mvSelectedVideo.id);
        } catch (err) {
            console.error("댓글 삭제 실패", err);
        }
    };

    // 커버 이미지 업로드
    const handleCoverImageUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file || !groupId) return;
        if (!file.type.startsWith("image/")) return;
        setCoverImageLoading(true);
        try {
            const result = await uploadFile(file, {
                category: MediaAssetCategory.ARTIST_COVER_IMAGE,
                scope: MediaAssetScope.PUBLIC,
                artistId: groupId,
            });
            if (result?.mediaAssetId && result.status === "READY") {
                await request("/api/artist/profile", {
                    method: "PATCH",
                    body: { bannerImageMediaAssetId: result.mediaAssetId },
                });
                setCoverImageUrl(result.publicUrl || URL.createObjectURL(file));
            }
        } catch (err) {
            console.error("커버 이미지 업로드 실패", err);
        } finally {
            setCoverImageLoading(false);
            if (coverFileRef.current) coverFileRef.current.value = "";
        }
    }, [groupId]);

    // 팔로워 수 (아티스트 마이페이지 API에서 조회)
    useEffect(() => {
        if (!myId) return;
        request("/api/artist/mypage")
            .then((data) => {
                const n = data?.fanDailyGraph?.totalFollowers;
                setTotalFollowers(n != null ? Number(n) : null);
                const bio = data?.profile?.bio;
                setProfileBio(bio != null && String(bio).trim() !== "" ? String(bio).trim() : null);
                if (data?.profile?.bannerImageUrl) setCoverImageUrl(data.profile.bannerImageUrl);
            })
            .catch(() => {
                setTotalFollowers(null);
                setProfileBio(null);
            });
    }, [myId]);

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

    const closeCreateModal = () => {
        setNewPostContent("");
        setNewPostIsMembershipOnly(false);
        setNewPostIsNotice(false);
        resetNewPostAttachments();
        setShowCreateModal(false);
    };

    const handleNewPostFileChange = async (e) => {
        const file = e?.target?.files?.[0];
        if (!file) return;
        await addNewPostAttachment(file);
        e.target.value = "";
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
                    mediaAssetIds: newPostMediaAssetIds.length > 0 ? newPostMediaAssetIds : null,
                    representativeMediaAssetId: newPostRepresentativeId,
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

    // 아티스트 포스트 수정 (본인 작성 글만)
    const handleEditArtistPost = (postId) => {
        router.push(`/artist-console/posts/${postId}/edit`);
    };

    // 아티스트 포스트 삭제 (본인 작성 글만)
    const handleDeleteArtistPost = async (postId) => {
        if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
        try {
            await request(`/api/artist-posts/${postId}`, { method: "DELETE" });
            setArtistPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("게시글 삭제 실패", err);
        }
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

    // 그룹 계정의 이름/아바타/소개글 우선 표시 (ARTIST 멤버는 소속 그룹 계정 정보 표시)
    const displayName = groupProfile?.nickname || myProfile?.nickname || "Studio";
    const displayAvatar = groupProfile?.profileImageUrl || myProfile?.profileImageUrl || "";
    const displayBio = (groupId === myId ? profileBio : groupProfile?.bio) ?? "";

    return (
        <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10">
            {/* 헤더 프로필 카드 */}
            <Surface
                variant="primary"
                className="relative overflow-hidden"
            >
                {/* 커버 이미지 영역 */}
                <div className="relative h-48 bg-gradient-to-br from-violet-900/40 to-indigo-900/30">
                    {coverImageUrl && (
                        <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b15] via-[#0d0b15]/60 to-transparent" />
                    <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverImageUpload}
                    />
                    <button
                        type="button"
                        onClick={() => coverFileRef.current?.click()}
                        disabled={coverImageLoading}
                        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-bold hover:bg-black/70 hover:text-white transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm mr-1 align-middle">photo_camera</span>
                        {coverImageLoading ? "업로드 중..." : coverImageUrl ? "커버 변경" : "커버 추가"}
                    </button>
                </div>
                <div className="p-10 pt-0 -mt-16 relative flex flex-col md:flex-row items-center gap-8">
                <div className="relative group shrink-0">
                    <img
                        src={displayAvatar || getDefaultAvatarUrl(displayName)}
                        className="size-32 rounded-2xl border-4 border-[#0d0b15] object-cover shadow-xl"
                        alt=""
                    />
                    <button
                        type="button"
                        onClick={() => setShowProfileImageModal(true)}
                        className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                    >
                        사진 변경
                    </button>
                </div>
                <div className="flex-1 text-center md:text-left min-w-0">
                    <SectionTitle className="text-3xl font-black">
                        {displayName} Studio
                    </SectionTitle>
                    {displayBio ? (
                        <p className="text-white/70 font-medium mt-2 whitespace-pre-wrap">
                            {displayBio}
                        </p>
                    ) : null}
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
                {totalFollowers != null && (
                    <p className="text-violet-300 font-bold text-sm tabular-nums shrink-0 md:ml-auto">
                        팔로워 {Number(totalFollowers).toLocaleString("ko-KR")}명
                    </p>
                )}
                </div>
            </Surface>

            {/* 탭 + 새 글 작성 (가로 정렬) */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
                    {[
                        { id: "POSTS", label: "My Posts" },
                        { id: "FAN_POSTS", label: "Fan Posts" },
                        { id: "LIVE", label: "Live History" },
                        { id: "MV", label: "MV" },
                        ...(currentUser?.role === "ARTIST" && myProfile?.groupId != null
                            ? [{ id: "CONCERTS", label: "Concerts", href: "/artist-console/concerts" }]
                            : []),
                        { id: "MARKET", label: "MARKET", href: "/market" },
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
                {activeTab === "POSTS" && (
                    <Button
                        variant="primary"
                        className="text-xs uppercase tracking-widest px-6 py-3 shrink-0"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span className="material-symbols-outlined text-lg mr-1.5 align-middle">edit_note</span>
                        새 글 작성
                    </Button>
                )}
                {activeTab === "MV" && (
                    <Button
                        variant="primary"
                        className="text-xs uppercase tracking-widest px-6 py-3 shrink-0"
                        onClick={() => setMvShowForm((v) => !v)}
                    >
                        <span className="material-symbols-outlined text-lg mr-1.5 align-middle">video_call</span>
                        {mvShowForm ? "취소" : "영상 등록"}
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {/* MY POSTS 탭 — artists/[id] ARTIST 탭과 동일 */}
                {activeTab === "POSTS" && (
                    <>
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
                                    onEdit={handleEditArtistPost}
                                    onDelete={handleDeleteArtistPost}
                                    canEditSet={myId ? new Set(artistPosts.filter((p) => Number(p.writerId) === Number(myId)).map((p) => p.id)) : undefined}
                                    canDeleteSet={myId ? new Set(artistPosts.filter((p) => Number(p.writerId) === Number(myId)).map((p) => p.id)) : undefined}
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
                        {endedLives.length === 0 ? (
                            <Surface variant="primary" className="p-12 text-center col-span-full">
                                <p className="text-white/55">종료된 라이브가 없습니다.</p>
                            </Surface>
                        ) : (
                            endedLives.map((live) => (
                                <Surface key={live.id} variant="card" className="overflow-hidden">
                                    <div className="aspect-video relative overflow-hidden bg-white/5">
                                        {(live.thumbnailUrl || live.thumbnail) ? (
                                            <img
                                                src={live.thumbnailUrl || live.thumbnail}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/30">
                                                <span className="material-symbols-outlined text-4xl">videocam_off</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <h4 className="font-bold text-white truncate mb-4">
                                            {live.title || "제목 없음"}
                                        </h4>
                                        <Button
                                            variant="primary"
                                            href="/artist-console/live"
                                            className="w-full py-3 text-[10px] uppercase tracking-widest"
                                        >
                                            다시보기 관리
                                        </Button>
                                    </div>
                                </Surface>
                            ))
                        )}
                    </div>
                )}

                {/* MV 탭 */}
                {activeTab === "MV" && (
                    <div className="space-y-6">
                        {mvError && <p className="text-red-400 text-sm">{mvError}</p>}

                        {mvShowForm && (
                            <Surface variant="primary" className="p-6">
                                <h3 className="font-bold text-white mb-4">새 뮤직비디오 등록</h3>
                                <form onSubmit={handleMvSubmit} className="space-y-3 max-w-lg">
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/55">YouTube URL</span>
                                        <input
                                            type="url"
                                            value={mvForm.url}
                                            onChange={(e) => setMvForm((f) => ({ ...f, url: e.target.value }))}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/55">제목 (150자)</span>
                                        <input
                                            type="text"
                                            maxLength={150}
                                            value={mvForm.title}
                                            onChange={(e) => setMvForm((f) => ({ ...f, title: e.target.value }))}
                                            className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/55">설명 (2000자)</span>
                                        <textarea
                                            maxLength={2000}
                                            value={mvForm.description}
                                            onChange={(e) => setMvForm((f) => ({ ...f, description: e.target.value }))}
                                            className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white min-h-[80px]"
                                            required
                                        />
                                    </label>
                                    <Button type="submit" variant="primary" disabled={mvSubmitting}>
                                        {mvSubmitting ? "등록 중..." : "등록"}
                                    </Button>
                                </form>
                            </Surface>
                        )}

                        {/* 인라인 플레이어 + 댓글 */}
                        {mvSelectedVideo && (
                            <Surface variant="primary" className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-white truncate flex-1 mr-4">{mvSelectedVideo.title}</h3>
                                    <button
                                        type="button"
                                        onClick={() => setMvSelectedVideo(null)}
                                        className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                    <iframe
                                        src={getSafeEmbedUrl(mvSelectedVideo.embedUrl)}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                        title={mvSelectedVideo.title}
                                        referrerPolicy="strict-origin-when-cross-origin"
                                    />
                                </div>
                                {mvSelectedVideo.description && (
                                    <p className="text-white/60 text-sm mt-4 whitespace-pre-wrap line-clamp-4">{mvSelectedVideo.description}</p>
                                )}

                                {/* 댓글 섹션 */}
                                <div className="mt-6 border-t border-white/[0.06] pt-6">
                                    <h4 className="text-sm font-bold text-white/80 mb-4">
                                        댓글 {mvComments.length > 0 && `(${mvComments.length})`}
                                    </h4>
                                    <div className="flex gap-3 mb-4">
                                        <input
                                            type="text"
                                            value={mvNewComment}
                                            onChange={(e) => setMvNewComment(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleMvCommentSubmit(); } }}
                                            placeholder="댓글을 입력하세요..."
                                            className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30"
                                        />
                                        <Button
                                            variant="primary"
                                            className="px-4 py-2 text-xs shrink-0"
                                            onClick={handleMvCommentSubmit}
                                            disabled={mvCommentSubmitting || !mvNewComment.trim()}
                                        >
                                            {mvCommentSubmitting ? "..." : "작성"}
                                        </Button>
                                    </div>
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
                                                    {c.userId === myId && (
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

                        {/* MV 목록 */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">등록된 뮤직비디오</h3>
                                {mvList.length > 0 && (
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                                        <input
                                            type="text"
                                            value={mvSearchQuery}
                                            onChange={(e) => setMvSearchQuery(e.target.value)}
                                            placeholder="제목 또는 설명 검색"
                                            className="pl-9 pr-4 py-2 rounded-xl bg-[#16102a] border border-white/[0.08] text-white text-sm w-64 placeholder:text-white/30"
                                        />
                                    </div>
                                )}
                            </div>
                            {mvLoading ? (
                                <Surface variant="primary" className="py-12 text-center">
                                    <p className="text-white/55">로딩 중...</p>
                                </Surface>
                            ) : mvList.length === 0 ? (
                                <Surface variant="primary" className="p-12 text-center">
                                    <p className="text-white/55 font-medium">등록된 영상이 없습니다.</p>
                                </Surface>
                            ) : mvList.length === 0 && mvSearchQuery.trim() ? (
                                <Surface variant="primary" className="p-12 text-center">
                                    <p className="text-white/55">검색 결과가 없습니다.</p>
                                </Surface>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {mvList.map((v) => (
                                        <Surface
                                            key={v.id}
                                            variant="card"
                                            className={`overflow-hidden group transition-all ${mvSelectedVideo?.id === v.id ? "ring-2 ring-violet-500" : ""}`}
                                        >
                                            <button type="button" onClick={() => setMvSelectedVideo(v)} className="w-full text-left">
                                                <div className="aspect-video relative overflow-hidden">
                                                    {v.thumbnailUrl ? (
                                                        <img
                                                            src={v.thumbnailUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-4xl text-white/20">videocam_off</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                        <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                                                    </div>
                                                </div>
                                            </button>
                                            <div className="p-4 flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-white truncate">{v.title}</h4>
                                                    <p className="text-sm text-white/50 truncate mt-0.5">{v.description}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="size-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); handleMvDelete(v.id); }}
                                                    title="삭제"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </Surface>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 새 글 작성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                    <Surface variant="primary" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 sm:p-10">
                        <div className="flex justify-between items-center mb-6 sticky top-0 z-10">
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

                        {/* 첨부파일 */}
                        <div className="mt-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-sm text-white/40">attach_file</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
                                    첨부파일
                                </span>
                                <span className="text-[10px] font-bold text-white/40">
                                    {newPostMediaAssetIds.length}/{MAX_POST_ATTACHMENTS}
                                </span>
                                {newPostAttachmentPreviews.length > 1 && (
                                    <span className="text-[9px] text-violet-400/70 ml-auto">
                                        클릭하여 대표 이미지 선택
                                    </span>
                                )}
                            </div>
                            <input ref={newPostFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleNewPostFileChange} />
                            {newPostUploadError && (
                                <p className="text-red-400 text-xs mb-2">{newPostUploadError}</p>
                            )}
                            {newPostAttachmentPreviews.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-[10px] text-white/30 font-medium">
                                        클릭하여 대표 설정 · 드래그하여 순서 변경
                                    </p>
                                    <DraggableAttachmentGrid
                                        attachments={newPostAttachmentPreviews}
                                        representativeId={newPostRepresentativeId}
                                        onSetRepresentative={setNewPostRepresentative}
                                        onReorder={reorderNewPostAttachments}
                                        onRemove={removeNewPostAttachment}
                                    />
                                    {canAddNewPostAttachment && !newPostUploading && (
                                        <button
                                            type="button"
                                            onClick={() => newPostFileInputRef.current?.click()}
                                            className="w-full py-3 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/40 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                            <span className="text-[10px] font-bold">파일 추가</span>
                                        </button>
                                    )}
                                    {newPostUploading && (
                                        <div className="flex items-center gap-2 py-2">
                                            <div className="size-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-violet-300 text-xs font-medium">업로드 중...</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => newPostFileInputRef.current?.click()}
                                    disabled={newPostUploading}
                                    className="w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                    <span className="text-xs font-bold">{newPostUploading ? "업로드 중..." : "사진 또는 동영상 추가"}</span>
                                    <span className="text-[10px] text-white/30">이미지·영상 최대 {MAX_POST_ATTACHMENTS}개</span>
                                </button>
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
                                disabled={createPostLoading || newPostUploading || !newPostContent.trim()}
                            >
                                {createPostLoading ? "게시 중..." : "게시하기"}
                            </Button>
                        </div>
                    </Surface>
                </div>
            )}

            <ProfileImageModal
                isOpen={showProfileImageModal}
                onClose={() => setShowProfileImageModal(false)}
                currentImageUrl={displayAvatar}
                mode="artist"
                onSuccess={(newUrl) => {
                    setMyProfile((prev) => prev ? { ...prev, profileImageUrl: newUrl } : prev);
                    if (groupId === myId) {
                        setGroupProfile((prev) => prev ? { ...prev, profileImageUrl: newUrl } : prev);
                    }
                }}
            />
        </div>
    );
}