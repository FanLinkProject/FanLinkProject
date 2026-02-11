"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

/** 팬(일반 사용자) 영역 NavBar. DM 목록은 DB에서 불러와 드롭다운으로 표시. */
export default function FanNavBar() {
  const pathname = usePathname();
  const [dmRooms, setDmRooms] = useState([]);
  const [dmOpen, setDmOpen] = useState(false);
  const dmNavRef = useRef(null);
  const dmIconRef = useRef(null);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get("http://localhost:8080/api/chat/DM/rooms", { headers })
      .then((res) => setDmRooms(res.data || []))
      .catch(() => setDmRooms([]));
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inNav = dmNavRef.current?.contains(e.target);
      const inIcon = dmIconRef.current?.contains(e.target);
      if (!inNav && !inIcon) setDmOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getRoomAvatar = (room) =>
    `https://picsum.photos/seed/${room?.roomId || room?.hostName || "dm"}/100/100`;

  const isDmPage = pathname === "/dm/fan" || pathname?.startsWith("/dm/fan");

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0b0814]/95 backdrop-blur-md border-b border-white/[0.06] z-50 px-6 lg:px-12 flex items-center justify-between">
      <Link
        href="/home"
        className="flex items-center gap-3 text-violet-300 cursor-pointer shrink-0 hover:opacity-90">
        <span className="material-symbols-outlined text-3xl font-black fill-icon">
          rocket_launch
        </span>
        <h2 className="text-xl font-black tracking-tighter text-white">
          FanLink
        </h2>
        <span className="ml-2 inline-flex items-center justify-center leading-none px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-white/10 text-white/55">
          FAN
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-10 ml-12 mr-auto">
        <Link
          href="/home"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname === "/home"
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          홈
        </Link>
        <Link
          href="/artists"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname?.startsWith("/artists")
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          아티스트
        </Link>
        <Link
          href="/market"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname?.startsWith("/market")
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          마켓
        </Link>
      </nav>

      <div className="flex items-center gap-6 shrink-0">
        <div className="relative" ref={dmIconRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDmOpen((o) => !o); }}
            className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors"
            aria-label="DM">
            <span className="material-symbols-outlined">mail</span>
          </button>
          {dmOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl border border-white/[0.06] bg-[#201a33] shadow-xl py-2 z-50 max-h-80 overflow-y-auto custom-scrollbar">
              {dmRooms.length === 0 ? (
                <Link
                  href="/dm/fan"
                  onClick={() => setDmOpen(false)}
                  className="block px-4 py-3 text-sm text-white/55 hover:bg-white/[0.06]">
                  DM 방이 없습니다
                </Link>
              ) : (
                dmRooms.map((room) => (
                  <Link
                    key={room.roomId}
                    href={`/dm/fan?roomId=${room.roomId}`}
                    onClick={() => setDmOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors">
                    <img
                      src={getRoomAvatar(room)}
                      alt=""
                      className="size-9 rounded-full border border-white/[0.08]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-white truncate block">
                        {room.hostName}
                      </span>
                      {room.groupName && (
                        <span className="text-[10px] text-white/55 font-medium uppercase tracking-wider truncate block">
                          {room.groupName}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
        <Link
          href="/notifications"
          className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors relative"
          aria-label="알림">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-violet-400 rounded-full border-2 border-[#0b0618]" />
        </Link>

        <Link
          href="/mypage"
          className="flex items-center gap-3 pl-2 cursor-pointer group"
          aria-label="마이페이지">
          <img
            src="https://picsum.photos/seed/alex/100/100"
            alt="Profile"
            className="size-9 rounded-full border border-white/20 group-hover:border-violet-400/50 transition-colors shadow-lg"
          />
        </Link>
      </div>
    </header>
  );
}
