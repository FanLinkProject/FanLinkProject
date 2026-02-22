"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { getDefaultAvatarUrl } from "@/lib/avatar";

import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function FanSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [followingArtists, setFollowingArtists] = useState([]);
  const [dmRooms, setDmRooms] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAuthHeaders().Authorization);
  }, [pathname]);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setFollowingArtists([]);
      return;
    }
    axios
      .get(`${BASE_URL}/api/home`, { headers })
      .then((res) => {
        const list = res.data?.followedArtists ?? [];
        setFollowingArtists(Array.isArray(list) ? list : []);
      })
      .catch(() => setFollowingArtists([]));
  }, [pathname]);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/chat/DM/rooms`, { headers })
      .then((res) => setDmRooms(res.data || []))
      .catch(() => setDmRooms([]));
  }, [pathname]);

  const getRoomAvatar = (room) =>
    `https://picsum.photos/seed/${room?.roomId || room?.hostName || "dm"}/100/100`;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/home";
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#16102a] backdrop-blur-sm border-r border-white/[0.05] hidden md:flex flex-col pt-16 px-6 pb-6 z-40 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-8 flex-1 pt-6">
        {isLoggedIn && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  팔로잉 아티스트
                </h3>
                <span className="inline-flex items-center leading-none text-[10px] font-medium text-white/55">
                  {followingArtists.length}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {followingArtists.length === 0 ? (
                  <p className="px-2 py-2 text-[13px] text-white/55">팔로우한 아티스트가 없습니다</p>
                ) : (
                  followingArtists.map((a) => (
                    <Link
                      key={a.artistId}
                      href={`/artists/${a.artistId}`}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all text-left group">
                      <img
                        src={a.profileImageUrl || getDefaultAvatarUrl(a.nickname)}
                        className="size-9 rounded-full border border-white/10 group-hover:border-violet-400/30 shadow-sm object-cover"
                        alt=""
                      />
                      <span className="text-[13px] font-medium text-white/80 truncate group-hover:text-violet-300 transition-colors leading-tight">
                        {a.nickname}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  DM
                </h3>
              </div>
              <div className="flex flex-col gap-1">
                {dmRooms.length === 0 ? (
                    <Link
                      href="/dm/fan"
                    className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/10 transition-all text-left group">
                    <span className="text-sm text-white/55">DM 방이 없습니다</span>
                  </Link>
                ) : (
                  dmRooms.map((room) => (
                    <Link
                      key={`dm-${room.roomId}`}
                      href={`/dm/fan?roomId=${room.roomId}`}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/10 transition-all text-left group">
                      <img
                        src={getRoomAvatar(room)}
                        className="size-10 rounded-2xl border border-white/10 group-hover:border-violet-400/30 shadow-sm"
                        alt=""
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors leading-tight">
                          {room.hostName}
                        </p>
                        <p className="text-[10px] text-white/55 font-normal uppercase tracking-wider truncate leading-tight">
                          {room.groupName || "아티스트"}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </>
        )}
        <section className="flex flex-col gap-2">
          <Link
            href="/market"
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
          >
            <span className="material-symbols-outlined text-xl text-white/80 group-hover:text-violet-300">storefront</span>
            <span className="text-[13px] font-medium text-white/80 group-hover:text-violet-300 transition-colors">마켓</span>
          </Link>
          <Link
            href="/candy/recharge"
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left group"
          >
            <span className="material-symbols-outlined text-xl text-white/80 group-hover:text-violet-300">redeem</span>
            <span className="text-[13px] font-medium text-white/80 group-hover:text-violet-300 transition-colors">캔디샵</span>
          </Link>
        </section>
      </div>
      {isLoggedIn && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
            className="w-full text-left text-[11px] text-white/55 hover:text-white/80 hover:bg-white/[0.06] px-3 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="font-medium">로그아웃</span>
          </button>
        </div>
      )}
    </aside>
  );
}
