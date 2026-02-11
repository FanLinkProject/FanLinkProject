"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Artist Console 영역 NavBar. FanNavBar 레이아웃/스타일 동일, 배지·메뉴만 역할에 맞게. */
export default function ArtistNavBar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0b0814]/95 backdrop-blur-md border-b border-white/[0.06] z-50 px-6 lg:px-12 flex items-center justify-between">
      <Link
        href="/artist-console"
        className="flex items-center gap-3 text-violet-300 cursor-pointer shrink-0 hover:opacity-90">
        <span className="material-symbols-outlined text-3xl font-black fill-icon">
          rocket_launch
        </span>
        <h2 className="text-xl font-black tracking-tighter text-white">
          FanLink
        </h2>
        <span className="ml-2 inline-flex items-center justify-center leading-none px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-violet-500/80 text-white">
          ARTIST
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-10 ml-12 mr-auto">
        <Link
          href="/artist-console"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname === "/artist-console" || pathname?.startsWith("/artist-console/")
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          Artist Console
        </Link>
        <Link
          href="/milestone"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname === "/milestone" || pathname?.startsWith("/milestone/")
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          등급 관리
        </Link>
        <Link
          href="/dm/artist"
          className={`inline-flex items-center leading-none h-8 text-[15px] font-bold transition-colors ${
            pathname === "/dm/artist" || pathname?.startsWith("/dm/artist")
              ? "text-violet-300"
              : "text-white/80 hover:text-violet-300"
          }`}>
          DM
        </Link>
      </nav>

      <div className="flex items-center gap-6 shrink-0">
        <Link
          href="/dm/artist"
          className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors"
          aria-label="DM">
          <span className="material-symbols-outlined">mail</span>
        </Link>
        <Link
          href="/notifications"
          className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors relative"
          aria-label="알림">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-violet-400 rounded-full border-2 border-[#0b0814]" />
        </Link>

        <Link
          href="/mypage"
          className="flex items-center gap-3 pl-2 cursor-pointer group"
          aria-label="마이페이지">
          <img
            src="https://picsum.photos/seed/alex/100/100"
            alt="Profile"
            className="size-9 rounded-full border border-white/20 group-hover:border-violet-400/50 transition-colors"
          />
        </Link>
      </div>
    </header>
  );
}
