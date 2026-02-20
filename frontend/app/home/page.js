"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import ArtistConsolePage from "../artist-console/page";

const BASE_URL = "http://localhost:8080";

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
      .get(`${BASE_URL}/api/user/artists?page=0&size=24`, { headers })
      .then((res) => {
        const list = res.data?.content ?? res.data ?? [];
        const recommended = Array.isArray(list) ? list.filter((a) => !followedIds.has(String(a.id))) : [];
        setRecommendedArtists(recommended);
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
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    setAllArtistsLoading(true);
    const params = nickname.trim() ? { nickname: nickname.trim(), page: 0, size: 100 } : { page: 0, size: 100 };
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
    const recommended = guestData.recommendedArtists ?? [];
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
          {recommended.length === 0 ? (
            <Surface variant="primary" className="p-8 text-center">
              <p className="text-sm text-white/55">추천 아티스트가 없습니다.</p>
            </Surface>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 -mx-1 px-1">
              {recommended.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="w-40 shrink-0">
                  <Surface variant="card" className="p-5 flex flex-col items-center text-center group h-full">
                    <div className="relative mb-4">
                      <img
                        src={artist.profileImageUrl || `https://picsum.photos/seed/guest-${artist.id}/200/200`}
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
            </div>
          )}
        </section>

        <section>
          <SectionTitle className="mb-6">새로운 아티스트</SectionTitle>
          {newArtists.length === 0 ? (
            <Surface variant="primary" className="p-8 text-center">
              <p className="text-sm text-white/55">새로운 아티스트가 없습니다.</p>
            </Surface>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 -mx-1 px-1">
              {newArtists.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="w-40 shrink-0">
                  <Surface variant="card" className="p-5 flex flex-col items-center text-center group h-full">
                    <div className="relative mb-4">
                      <img
                        src={artist.profileImageUrl || `https://picsum.photos/seed/new-${artist.id}/200/200`}
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
            </div>
          )}
        </section>
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
                    src={
                      artist.profileImageUrl ||
                      `https://picsum.photos/seed/reco-${artist.id}/200/200`
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
      </section>

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
                  placeholder="아티스트 닉네임으로 검색..."
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
                        src={artist.profileImageUrl || `https://picsum.photos/seed/a-${artist.id}/200/200`}
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
