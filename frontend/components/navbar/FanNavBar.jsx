"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 팬(일반 사용자) 영역 NavBar. front-design 팬 NavBar DOM/스타일 유지. */
export default function FanNavBar() {
  const pathname = usePathname();

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
