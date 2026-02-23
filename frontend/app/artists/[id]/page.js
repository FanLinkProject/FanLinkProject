"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

// 데이터 및 유틸리티
import { MOCK_ARTISTS, MOCK_POSTS, MOCK_LIVES } from "@/lib/mockData";
import { list as listMusicVideos } from "@/lib/musicVideoApi";
import { request, apiGet, apiPost, BASE_URL } from "@/lib/api";
import {
    isUpcoming,
    concertIncludesArtist,
    formatArtists,
    getArtistNamesArray,
    formatDateShort
} from "@/lib/concertUtils";

// 컴포넌트
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";
import MembershipOnlyModal from "@/components/common/MembershipOnlyModal";

// --- 상수 및 헬퍼 함수 ---
const CANDY_COST = 500;
const FAN_PROFILES_API = `${BASE_URL}/api/fan-profiles`;

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
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return { email: payload.sub, role: (payload.role || "").replace("ROLE_", "") };
    } catch { return null; }
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

// API 포스트 데이터를 UI용으로 변환
function transformPost(p, type, groupAvatar = "") {
    return {
        id: p.id,
        authorName: p.writerNickname || "Anonymous",
        authorAvatar: p.writerProfileImageUrl || groupAvatar,
        content: p.content || "",
        image: p.attachments?.[0]?.url || null,
        timestamp: formatTimestamp(p.createdAt),
        isMembershipOnly: p.isMembershipOnly ?? false,
        isLockedByServer: !!(p.isMembershipOnly && p.content === null),
        likes: p.likeCount || 0,
        comments: p.commentCount || 0,
        type: type, // "ARTIST" or "FAN" or "NOTICE"
    };
}

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

    // 참여 공연 / MV / 라이브
    const [artistConcerts, setArtistConcerts] = useState([]);
    const [artistConcertsLoading, setArtistConcertsLoading] = useState(false);
    const [musicVideos, setMusicVideos] = useState([]);
    const [musicVideosLoading, setMusicVideosLoading] = useState(false);
    const [liveSessions, setLiveSessions] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveError, setLiveError] = useState("");

    // 모달 및 UI 상태
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostImagePreview, setNewPostImagePreview] = useState(null);
    const [newPostImageFile, setNewPostImageFile] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [liveCardCheckingId, setLiveCardCheckingId] = useState(null);
    const [likedPostIds, setLikedPostIds] = useState(new Set());

    const fanPostFileInputRef = useRef(null);
    const groupId = Number(paramsId);
    const isRealGroup = !isNaN(groupId);

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

    // 2. 참여 공연 정보 로드
    useEffect(() => {
        if (!artist?.name) return;
        setArtistConcertsLoading(true);
        apiGet("/api/concerts")
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                const filtered = list.filter(c => isUpcoming(c) && concertIncludesArtist(c, artist.name));
                setArtistConcerts(filtered);
            })
            .catch(() => setArtistConcerts([]))
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

    // 4. 팬 프로필 (출석용) 로드
    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        if (!user) return;
        axios.get(`${FAN_PROFILES_API}/me`, { headers: getAuthHeaders() })
            .then(res => setFanProfiles(res.data || []))
            .catch(() => {});
    }, []);

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

    // 5. MV 탭 활성화 시 로드
    useEffect(() => {
        if (activeTab !== "MV" || !artist) return;
        setMusicVideosLoading(true);
        listMusicVideos(artist.backendId || artist.id)
            .then(res => setMusicVideos(Array.isArray(res) ? res : []))
            .catch(() => setMusicVideos([]))
            .finally(() => setMusicVideosLoading(false));
    }, [activeTab, artist]);

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
        const fanProfile = fanProfiles.find(p => String(p.artistId) === String(paramsId) || p.artistName === artist?.name);
        if (!fanProfile || attendanceLoading) return;
        setAttendanceLoading(true);
        try {
            await axios.post(`${FAN_PROFILES_API}/${fanProfile.id}/increase-visit`, {}, { headers: getAuthHeaders() });
            setFanProfiles(prev => prev.map(p => p.id === fanProfile.id ? { ...p, visitCount: (p.visitCount || 0) + 1 } : p));
            alert("출석 완료!");
        } catch (err) {
            console.error(err);
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

    const handleCreatePost = () => {
        if (!newPostContent.trim()) return;
        const newPost = {
            id: `p-new-${Date.now()}`,
            authorName: currentUser?.email?.split('@')[0] || "Me",
            authorAvatar: "",
            content: newPostContent,
            image: newPostImagePreview,
            timestamp: "방금 전",
            type: "FAN",
            likes: 0,
            comments: 0
        };
        setFanPosts([newPost, ...fanPosts]);
        setNewPostContent("");
        setNewPostImagePreview(null);
        setShowCreateModal(false);
    };

    if (!artist) return null;

    const tabs = [
        { id: "ARTIST", label: "Artist" },
        { id: "FAN", label: "Fan" },
        { id: "LIVE", label: "Live" },
        { id: "MARKET", label: "Market" },
        { id: "MV", label: "뮤직비디오" },
    ];

    // VOD (Mock 기반 유지)
    const vodList = MOCK_LIVES.filter(l => l.artistId === artist.id && (l.status === "ENDED" || l.status === "RECORDED"));

    return (
        <div className="flex flex-col min-h-full relative pb-20">
            {/* 커버 섹션 */}
            <div className="h-64 w-full relative overflow-hidden shrink-0">
                <img src={artist.cover} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0814]/40 to-[#0b0814]" />
            </div>

            {/* 헤더 프로필 */}
            <div className="max-w-6xl w-full mx-auto px-8 relative -mt-20 z-10 shrink-0">
                <Surface variant="primary" className="p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-end gap-6">
                        <div className="rounded-2xl border-2 border-white/[0.08] shadow-2xl -mt-24 overflow-hidden bg-[#201a33] size-40">
                            <img src={artist.avatar} className="w-full h-full object-cover" alt={artist.name} />
                        </div>
                        <div className="pb-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-4xl font-bold text-white tracking-tight">{artist.name}</h1>
                                <span className="material-symbols-outlined text-violet-300 text-2xl">verified</span>
                            </div>
                            <p className="text-white/55 font-medium mt-2">
                                팔로워 {artist.memberCount.toLocaleString()} • 포스트 {artist.postCount}개
                            </p>
                        </div>
                    </div>
                    <div className="pb-1 flex items-center gap-3">
                        {artist.isSubscribed ? (
                            <>
                                <Button variant="ghost" className="px-8" disabled>구독 중</Button>
                                <Button variant="primary" className="px-6" onClick={handleAttendance} disabled={attendanceLoading}>
                                    {attendanceLoading ? "..." : "출석"}
                                </Button>
                            </>
                        ) : artist.isFollowing ? (
                            <Button variant="ghost" className="px-8" disabled>팔로우중</Button>
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

            {/* 참여 공연 섹션 */}
            {artistConcerts.length > 0 && (
                <div className="max-w-6xl w-full mx-auto px-8 mt-12">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5 px-1">Upcoming Concerts</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {artistConcerts.map((c) => (
                            <Link key={c.id} href={`/concerts/${c.id}`} className="group block rounded-2xl border border-white/5 bg-white/[0.03] hover:border-violet-500/40 transition-all overflow-hidden">
                                <div className="aspect-[16/10] overflow-hidden">
                                    <img src={c.concertImageUrl || c.posterImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-5">
                                    <h4 className="font-bold text-white truncate">{c.title}</h4>
                                    <p className="text-white/50 text-xs mt-2">{formatDateShort(c.startDateTime)} • {c.placeName || c.venueName}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

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
                        ) : (() => {
                            const posts = isRealGroup ? artistPosts : MOCK_POSTS.filter(p => p.artistId === paramsId && p.type === "ARTIST");
                            if (posts.length === 0) {
                                return <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">아티스트 게시글이 없습니다.</p>;
                            }
                            return (
                                <PostFeed
                                    posts={posts}
                                    postLinkBase="/posts"
                                    isLikedMap={Object.fromEntries([...likedPostIds].map(id => [id, true]))}
                                    onLike={handleLike}
                                />
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
                                {artist.isSubscribed ? (
                                    <div className="space-y-6">
                                        <div className="flex justify-end">
                                            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                                                <span className="material-symbols-outlined mr-2">edit</span> 팬 포스트 작성
                                            </Button>
                                        </div>
                                        {(() => {
                                            const posts = isRealGroup ? fanPosts : MOCK_POSTS.filter(p => p.artistId === paramsId && p.type === "FAN");
                                            if (posts.length === 0) {
                                                return <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">팬 게시글이 없습니다.</p>;
                                            }
                                            return <PostFeed posts={posts} onLike={handleLike} />;
                                        })()}
                                    </div>
                                ) : (
                                    <Surface className="p-20 text-center italic text-white/40">구독자 전용 공간입니다.</Surface>
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
                                {vodList.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-6">
                                        {vodList.map(vod => (
                                            <Link key={vod.id} href={`/live/${vod.id}`} className="group">
                                                <div className="aspect-video rounded-2xl overflow-hidden relative mb-3">
                                                    <img src={vod.thumbnail} className="w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                        <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                                                    </div>
                                                </div>
                                                <h5 className="font-bold text-white truncate">{vod.title}</h5>
                                                <p className="text-white/40 text-xs mt-1">{vod.startTime}</p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">다시보기가 없습니다.</p>
                                )}
                            </section>
                        </div>
                    )}

                    {activeTab === "MV" && (
                        musicVideosLoading ? (
                            <p className="text-white/40">로딩 중...</p>
                        ) : musicVideos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-6">
                                {musicVideos.map(mv => (
                                    <Surface key={mv.id} className="p-4 group cursor-pointer">
                                        <a href={mv.embedUrl} target="_blank" rel="noreferrer">
                                            <div className="aspect-video rounded-xl overflow-hidden mb-4">
                                                <img src={mv.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                            </div>
                                            <h4 className="font-bold text-white truncate">{mv.title}</h4>
                                        </a>
                                    </Surface>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/30 py-20 text-center bg-white/5 rounded-2xl">뮤직비디오가 없습니다.</p>
                        )
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
                            <button onClick={() => setShowCreateModal(false)} className="text-white/50 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <textarea
                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-violet-500/50"
                            placeholder="아티스트에게 전할 메시지를 입력하세요..."
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                        />
                        <Button variant="primary" className="w-full mt-6 py-4" onClick={handleCreatePost}>게시하기</Button>
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