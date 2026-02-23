"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import PostCard from "@/components/PostCard";
import ArtistConsolePage from "../artist-console/page";
import { BASE_URL } from "@/lib/api";
import { getDefaultAvatarUrl } from "@/lib/avatar";

const FEED_POSTS_LIMIT_PER_GROUP = 15;

/** 배열을 셔플 후 최대 n개 반환 (길이 < n이면 전부 반환) */
function pickRandomUpTo(arr, n) {
  if (!Array.isArray(arr) || arr.length <= n) return arr ?? [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
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

function transformArtistPost(p, groupId, groupAvatar = "") {
  return {
    id: p.id,
    groupId,
    authorName: p.writerNickname || "",
    authorMemberName: null,
    authorAvatar: p.writerProfileImageUrl || groupAvatar,
    content: p.content || "",
    image: p.attachments?.[0]?.url || null,
    timestamp: formatTimestamp(p.createdAt),
    createdAt: p.createdAt,
    isMembershipOnly: p.isMembershipOnly ?? false,
    isLockedByServer: !!(p.isMembershipOnly && p.content === null),
    isNotice: !!p.isNotice,
    type: "ARTIST",
  };
}

/** 드래그로 스크롤 가능한 가로 목록 (스크롤바 숨김) */
function DragScrollContainer({ children, className = "" }) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const didDrag = useRef(false);

  const handlePointerDown = useCallback((e) => {
    if (!ref.current) return;
    setIsDragging(true);
    didDrag.current = false;
    startX.current = e.pageX ?? e.touches?.[0]?.pageX ?? 0;
    scrollLeftStart.current = ref.current.scrollLeft;
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!ref.current) return;
    const pageX = e.pageX ?? e.touches?.[0]?.pageX ?? 0;
    const walk = pageX - startX.current;
    if (Math.abs(walk) > 5) didDrag.current = true;
    ref.current.scrollLeft = scrollLeftStart.current - walk;
    if (e.touches) e.preventDefault();
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleClickCapture = useCallback((e) => {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  }, []);

  /** 마우스 휠/트랙패드로 가로 스크롤 (스크롤바 없이 스크롤 가능) */
  const handleWheel = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={ref}
      className={`flex gap-6 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      onMouseDownCapture={handlePointerDown}
      onMouseLeave={handlePointerUp}
      onTouchStartCapture={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      {children}
    </div>
  );
}

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function UserHomePage() {
  const [data, setData] = useState(null);
  const [recommendedArtists, setRecommendedArtists] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isArtistHome, setIsArtistHome] = useState(false);

  const [showAllArtistsModal, setShowAllArtistsModal] = useState(false);
  const [allArtistsSearch, setAllArtistsSearch] = useState("");
  const [allArtistsList, setAllArtistsList] = useState([]);
  const [allArtistsLoading, setAllArtistsLoading] = useState(false);

  const [isGuestHome, setIsGuestHome] = useState(false);
  const [guestData, setGuestData] = useState(null);
  const [showGuestAllArtistsModal, setShowGuestAllArtistsModal] = useState(false);
  const [guestAllArtistsList, setGuestAllArtistsList] = useState([]);
  const [guestAllArtistsLoading, setGuestAllArtistsLoading] = useState(false);
  const [guestAllArtistsSearch, setGuestAllArtistsSearch] = useState("");

  const guestRecommended = useMemo(
    () => pickRandomUpTo(guestData?.recommendedArtists ?? [], 5),
    [guestData?.recommendedArtists]
  );

  const [feedPosts, setFeedPosts] = useState([]);
  const [feedPostsLoading, setFeedPostsLoading] = useState(false);

  // 홈 데이터: 비로그인 → GuestHomeResponse / 로그인 → UserHome 또는 ArtistHome
  useEffect(() => {
    const headers = getAuthHeaders();

    if (!headers.Authorization) {
      axios
        .get(`${BASE_URL}/api/home`)
        .then((res) => {
          const payload = res.data;
          if (payload) {
            setGuestData({
              ...payload,
              recommendedArtists: Array.isArray(payload.recommendedArtists) ? payload.recommendedArtists : [],
              newArtists: Array.isArray(payload.newArtists) ? payload.newArtists : [],
            });
            setIsGuestHome(true);
          } else {
            setError("홈 데이터를 불러오지 못했습니다.");
          }
          setLoading(false);
        })
        .catch(() => {
          setError("홈 데이터를 불러오지 못했습니다.");
          setLoading(false);
        });
      return;
    }

    axios
      .get(`${BASE_URL}/api/home`, { headers })
      .then((res) => {
        const payload = res.data;
        const isFanHome =
          payload != null &&
          Array.isArray(payload.followedArtists);
        if (isFanHome) {
          setData(payload);
        } else if (
          payload != null &&
          Array.isArray(payload.recentPosts) &&
          payload.followedArtists == null
        ) {
          setIsArtistHome(true);
        } else {
          setData(payload);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("홈 데이터를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, []);

  // 추천 아티스트 (팔로우하지 않은 아티스트)
  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    // 로그인 팬 홈일 때만 (data가 있고 followedArtists 배열이 있을 때; 없으면 빈 배열로 처리)
    const followed = data?.followedArtists ?? [];
    const followedIds = new Set(followed.map((a) => String(a.artistId)));
    axios
      .get(`${BASE_URL}/api/user/artists?page=0&size=60`, { headers })
      .then((res) => {
        const list = res.data?.content ?? res.data ?? [];
        const recommended = Array.isArray(list) ? list.filter((a) => !followedIds.has(String(a.id))) : [];
        setRecommendedArtists(pickRandomUpTo(recommended, 5));
      })
      .catch(() => setRecommendedArtists([]));
  }, [data?.followedArtists, data != null]);

  // 팔로우한 아티스트 중 라이브 중인 세션
  useEffect(() => {
    const followed = data?.followedArtists ?? [];
    const headers = getAuthHeaders();
    if (!headers.Authorization || followed.length === 0) return;

    const fetchLive = async () => {
      const result = [];
      for (const artist of followed.slice(0, 5)) {
        try {
          const res = await axios.get(
            `${BASE_URL}/api/live-sessions?artistId=${artist.artistId}&status=LIVE`,
            { headers }
          );
          const list = res.data || [];
          list.forEach((session) => {
            result.push({ ...session, artist });
          });
        } catch (_) {}
      }
      setLiveSessions(result);
    };

    fetchLive();
  }, [data?.followedArtists]);

  const fetchAllArtists = useCallback((nickname = "") => {
    setAllArtistsLoading(true);
    const params = { page: 0, size: 100 };
    if (nickname.trim()) params.nickname = nickname.trim();
    const headers = getAuthHeaders();
    axios
      .get(`${BASE_URL}/api/user/artists`, { headers, params })
      .then((res) => {
        const list = res.data?.content ?? res.data ?? [];
        setAllArtistsList(Array.isArray(list) ? list : []);
      })
      .catch(() => setAllArtistsList([]))
      .finally(() => setAllArtistsLoading(false));
  }, []);

  useEffect(() => {
    if (!showAllArtistsModal) return;
    const t = setTimeout(() => fetchAllArtists(allArtistsSearch), 300);
    return () => clearTimeout(t);
  }, [showAllArtistsModal, allArtistsSearch, fetchAllArtists]);

  const fetchGuestAllArtists = useCallback((nickname = "") => {
    setGuestAllArtistsLoading(true);
    const search = new URLSearchParams({ page: "0", size: "100" });
    if (nickname.trim()) search.set("nickname", nickname.trim());
    fetch(`${BASE_URL}/api/user/artists?${search}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fail"))))
      .then((data) => {
        const list = data?.content ?? data ?? [];
        setGuestAllArtistsList(Array.isArray(list) ? list : []);
      })
      .catch(() => setGuestAllArtistsList([]))
      .finally(() => setGuestAllArtistsLoading(false));
  }, []);

  useEffect(() => {
    if (!showGuestAllArtistsModal) return;
    const t = setTimeout(() => fetchGuestAllArtists(guestAllArtistsSearch), 300);
    return () => clearTimeout(t);
  }, [showGuestAllArtistsModal, guestAllArtistsSearch, fetchGuestAllArtists]);

  // 팔로우한 아티스트 그룹들의 게시글 통합 피드 (팬 홈)
  useEffect(() => {
    const followed = data?.followedArtists ?? [];
    if (followed.length === 0) {
      setFeedPosts([]);
      return;
    }
    setFeedPostsLoading(true);
    const artistIds = followed.map((a) => a.artistId);
    const avatarByGroupId = Object.fromEntries(
      followed.map((a) => [a.artistId, a.profileImageUrl || ""])
    );
    Promise.all(
      artistIds.map((groupId) =>
        request("/api/artist-posts/artist-only", {
          query: { groupId, limit: FEED_POSTS_LIMIT_PER_GROUP },
        }).then((list) => {
          const raw = Array.isArray(list) ? list : list?.content ?? list?.posts ?? [];
          return raw.map((p) =>
            transformArtistPost(p, groupId, avatarByGroupId[groupId] || "")
          );
        }).catch(() => [])
      )
    )
      .then((arrays) => {
        const merged = arrays.flat();
        merged.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        setFeedPosts(merged);
      })
      .catch(() => setFeedPosts([]))
      .finally(() => setFeedPostsLoading(false));
  }, [data?.followedArtists]);

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <p className="text-sm text-white/55">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-4">
        <p className="text-sm text-red-400">{error}</p>
        <Button href="/login" variant="primary" className="px-6 py-3 text-xs">
          로그인 페이지로 이동
        </Button>
      </div>
    );
  }

  if (isArtistHome) {
    return <ArtistConsolePage />;
  }

  // 비로그인 유저 메인 홈: 로그인 버튼, 추천 아티스트, 새로운 아티스트만 표시
  if (isGuestHome && guestData) {
    const recommended = guestRecommended;
    const newArtists = guestData.newArtists ?? [];

    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16 pb-20">
        <section className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">FanLink에 오신 것을 환영합니다</h2>
            <p className="text-sm text-white/60">로그인하고 아티스트를 구독해 보세요.</p>
          </div>
          <div className="flex gap-3">
            <Button href="/login" variant="primary" className="px-8 py-3 text-sm">
              로그인
            </Button>
            <Button href="/signup" variant="ghost" className="px-8 py-3 text-sm border border-white/[0.12]">
              회원가입
            </Button>
          </div>
        </section>

        <section>
          <SectionTitle className="mb-6">추천 아티스트</SectionTitle>
          <DragScrollContainer>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowGuestAllArtistsModal(true);
              }}
              className="w-40 shrink-0 flex flex-col items-center justify-center min-h-[180px] rounded-2xl border-2 border-dashed border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all text-white/60 hover:text-violet-300"
            >
              <span className="material-symbols-outlined text-4xl mb-2">add</span>
              <span className="text-xs font-bold">모든 아티스트 보기</span>
            </button>
            {recommended.length === 0 ? null : (
              recommended.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="w-40 shrink-0">
                  <Surface variant="card" className="p-5 flex flex-col items-center text-center group h-full">
                    <div className="relative mb-4">
                      <img
                        src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                        className="size-20 rounded-2xl border border-white/[0.08] group-hover:scale-[1.03] transition-transform object-cover"
                        alt=""
                      />
                    </div>
                    <h3 className="font-medium text-white text-sm truncate w-full mb-1">{artist.nickname}</h3>
                    {artist.followerCount != null && (
                      <p className="text-[10px] text-white/55 font-medium">팔로워 {artist.followerCount}</p>
                    )}
                  </Surface>
                </Link>
              ))
            )}
          </DragScrollContainer>
        </section>

        <section>
          <SectionTitle className="mb-6">새로운 아티스트</SectionTitle>
          {newArtists.length === 0 ? (
            <Surface variant="primary" className="p-8 text-center">
              <p className="text-sm text-white/55">새로운 아티스트가 없습니다.</p>
            </Surface>
          ) : (
            <DragScrollContainer>
              {newArtists.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="w-40 shrink-0">
                  <Surface variant="card" className="p-5 flex flex-col items-center text-center group h-full">
                    <div className="relative mb-4">
                      <img
                        src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                        className="size-20 rounded-2xl border border-white/[0.08] group-hover:scale-[1.03] transition-transform object-cover"
                        alt=""
                      />
                    </div>
                    <h3 className="font-medium text-white text-sm truncate w-full mb-1">{artist.nickname}</h3>
                    {artist.followerCount != null && (
                      <p className="text-[10px] text-white/55 font-medium">팔로워 {artist.followerCount}</p>
                    )}
                  </Surface>
                </Link>
              ))}
            </DragScrollContainer>
          )}
        </section>

        {/* 비로그인 전체 아티스트 모달 */}
        {showGuestAllArtistsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#201a33] rounded-2xl border border-white/[0.08] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-lg font-black text-white">모든 아티스트</h3>
                <button
                  type="button"
                  onClick={() => setShowGuestAllArtistsModal(false)}
                  className="size-10 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-4 border-b border-white/[0.06]">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/55 text-xl">search</span>
                  <input
                    type="text"
                    value={guestAllArtistsSearch}
                    onChange={(e) => setGuestAllArtistsSearch(e.target.value)}
                    placeholder="아티스트 활동명으로 검색..."
                    className="w-full pl-12 pr-4 py-3 bg-[#16102a] border border-white/[0.08] rounded-xl text-sm font-medium text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {guestAllArtistsLoading ? (
                  <p className="text-sm text-white/55 py-8 text-center">불러오는 중...</p>
                ) : guestAllArtistsList.length === 0 ? (
                  <p className="text-sm text-white/55 py-8 text-center">검색 결과가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {guestAllArtistsList.map((artist) => (
                      <Link
                        key={artist.id}
                        href={`/artists/${artist.id}`}
                        onClick={() => setShowGuestAllArtistsModal(false)}
                        className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-violet-500/20 transition-all"
                      >
                        <img
                          src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                          className="size-16 rounded-xl border border-white/[0.08] object-cover mb-2"
                          alt=""
                        />
                        <span className="font-bold text-white text-sm truncate w-full">{artist.nickname}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const followedArtists = data?.followedArtists ?? [];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16 pb-20">
      {/* 팔로우한 아티스트 중 라이브 중인 것 — 맨 위 */}
      <section>
        <SectionTitle className="mb-6">라이브 중인 내 아티스트</SectionTitle>
        {liveSessions.length === 0 ? (
          <Surface variant="primary" className="p-8 text-center">
            <p className="text-sm text-white/60">
              현재 라이브 중인 팔로우 아티스트가 없습니다.
            </p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map((live) => (
              <Link key={live.id} href={`/live/${live.id}`} className="block">
                <Surface
                  variant="card"
                  className="overflow-hidden group cursor-pointer"
                >
                  <div className="relative aspect-video">
                    <img
                      src={
                        live.thumbnailUrl ||
                        `https://picsum.photos/seed/live-${live.id}/800/450`
                      }
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200 ease-out"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#201a33]/90 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-red-500/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase backdrop-blur-sm">
                        LIVE
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-violet-300 text-[10px] font-black uppercase tracking-widest mb-1">
                      {live.artist?.nickname}
                    </p>
                    <h4 className="font-medium text-white truncate">
                      {live.title || "라이브"}
                    </h4>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 내 아티스트 (팔로우/구독 아티스트) */}
      <section>
        <SectionTitle className="mb-6">내 아티스트</SectionTitle>
        {followedArtists.length === 0 ? (
          <Surface variant="primary" className="p-8 text-center">
            <p className="text-sm text-white/60 mb-4">
              아직 팔로우 또는 구독한 아티스트가 없습니다.
            </p>
            <Button href="/artists" variant="primary" className="text-xs">
              아티스트 둘러보기
            </Button>
          </Surface>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-1 px-1">
            {followedArtists.map((artist) => (
              <Link
                key={artist.artistId}
                href={`/artists/${artist.artistId}`}
                className="w-40 shrink-0"
              >
                <Surface
                  variant="card"
                  className="p-5 flex flex-col items-center text-center group h-full"
                >
                  <div className="relative mb-4">
                    <img
                      src={
                        artist.profileImageUrl ||
                        `https://picsum.photos/seed/artist-${artist.artistId}/200/200`
                      }
                      className="size-20 rounded-2xl border border-white/[0.08] group-hover:scale-[1.03] transition-transform object-cover"
                      alt=""
                    />
                  </div>
                  <h3 className="font-medium text-white text-sm truncate w-full mb-1">
                    {artist.nickname}
                  </h3>
                </Surface>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 추천 아티스트 + 전체 아티스트 보기 */}
      <section>
        <SectionTitle className="mb-6">추천 아티스트</SectionTitle>
        <div className="flex gap-6 overflow-x-auto pb-4 -mx-1 px-1">
          <button
            type="button"
            onClick={() => {
              setShowAllArtistsModal(true);
              setAllArtistsSearch("");
            }}
            className="w-40 shrink-0 flex flex-col items-center justify-center min-h-[180px] rounded-2xl border-2 border-dashed border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all text-white/60 hover:text-violet-300"
          >
            <span className="material-symbols-outlined text-4xl mb-2">add</span>
            <span className="text-xs font-bold">모든 아티스트 보기</span>
          </button>
          {recommendedArtists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="w-40 shrink-0"
            >
              <Surface
                variant="card"
                className="p-5 flex flex-col items-center text-center group h-full"
              >
                <div className="relative mb-4">
                  <img
                    src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                    className="size-20 rounded-2xl border border-white/[0.08] group-hover:scale-[1.03] transition-transform object-cover"
                    alt=""
                  />
                </div>
                <h3 className="font-medium text-white text-sm truncate w-full mb-1">
                  {artist.nickname}
                </h3>
              </Surface>
            </Link>
          ))}
        </div>
      </section>

      {/* 팔로우한 아티스트 그룹 게시글 피드 */}
      {followedArtists.length > 0 && (
        <section>
          <SectionTitle className="mb-6">내 아티스트의 최신 게시글</SectionTitle>
          {feedPostsLoading ? (
            <Surface variant="primary" className="py-12 text-center">
              <p className="text-white/55">게시글을 불러오는 중...</p>
            </Surface>
          ) : feedPosts.length === 0 ? (
            <Surface variant="primary" className="py-12 text-center">
              <p className="text-white/55">아직 게시글이 없습니다.</p>
            </Surface>
          ) : (
            <div className="space-y-6">
              {feedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  href={`/posts/${post.id}?type=ARTIST&groupId=${post.groupId}`}
                  showVerified={true}
                  isLocked={post.isLockedByServer ?? false}
                  showCommentButton={!post.isNotice}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 전체 아티스트 조회 모달 */}
      {showAllArtistsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#201a33] rounded-2xl border border-white/[0.08] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-black text-white">모든 아티스트</h3>
              <button
                type="button"
                onClick={() => setShowAllArtistsModal(false)}
                className="size-10 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 border-b border-white/[0.06]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/55 text-xl">search</span>
                <input
                  type="text"
                  value={allArtistsSearch}
                  onChange={(e) => setAllArtistsSearch(e.target.value)}
                  placeholder="아티스트 활동명으로 검색..."
                  className="w-full pl-12 pr-4 py-3 bg-[#16102a] border border-white/[0.08] rounded-xl text-sm font-medium text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {allArtistsLoading ? (
                <p className="text-sm text-white/55 py-8 text-center">불러오는 중...</p>
              ) : allArtistsList.length === 0 ? (
                <p className="text-sm text-white/55 py-8 text-center">검색 결과가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {allArtistsList.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/artists/${artist.id}`}
                      onClick={() => setShowAllArtistsModal(false)}
                      className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-violet-500/20 transition-all"
                    >
                      <img
                        src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                        className="size-16 rounded-xl border border-white/[0.08] object-cover mb-2"
                        alt=""
                      />
                      <span className="font-bold text-white text-sm truncate w-full">{artist.nickname}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
