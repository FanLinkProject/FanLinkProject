"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BASE_URL } from "@/lib/api";

const personalMenuItems = [
  { id: "ARTIST_ME", label: "My Studio", icon: "person", href: "/home" },
  { id: "ARTIST_POSTS", label: "게시물 관리", icon: "article", href: "/artist-console/posts" },
  { id: "ARTIST_LIVE_MGMT", label: "라이브 관리", icon: "sensors", href: "/artist-console/live" },
  { id: "ARTIST_MILESTONES", label: "등급 관리", icon: "military_tech", href: "/milestone" },
  { id: "ARTIST_DM", label: "DM", icon: "mail", href: "/dm/artist" },
];

const businessMenuItems = [
  {
    id: "BUSINESS_DASHBOARD",
    label: "운영 요약",
    icon: "dashboard",
    href: "/artist-console/dashboard",
  },
  {
    id: "ARTIST_MARKET_MGMT",
    label: "상품 관리",
    icon: "shopping_bag",
    href: "/artist-console/market",
  },
  {
    id: "ARTIST_ORDERS",
    label: "주문/배송",
    icon: "local_shipping",
    href: "/artist-console/orders",
  },
  {
    id: "ARTIST_SETTLEMENT",
    label: "정산 관리",
    icon: "account_balance_wallet",
    href: "/artist-console/settlement",
  },
  {
    id: "ARTIST_ACCOUNT",
    label: "정산 계좌",
    icon: "payments",
    href: "/artist-console/account",
  },
];
export default function ArtistSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [canSeeMemberMenu, setCanSeeMemberMenu] = useState(false);
  const [isGroupMember, setIsGroupMember] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    fetch(`${BASE_URL}/api/user/profile`, { headers: { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (profile && profile.groupId != null && profile.id !== profile.groupId) setIsGroupMember(true);
      })
      .catch(() => {});
  }, []);

  const isActive = (href) =>
    pathname === href ||
    (href !== "/artist-console" && pathname?.startsWith(href));

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/home";
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#16102a] backdrop-blur-sm border-r border-white/[0.05] hidden md:flex flex-col pt-16 px-6 pb-6 z-40 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-8 flex-1">
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              My Studio
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {personalMenuItems
              .filter((item) => item.id !== "ARTIST_MILESTONES" || !isGroupMember)
              .map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                  isActive(item.href)
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                    : "hover:bg-white/[0.06] text-white/80"
                }`}>
                <span className={`material-symbols-outlined text-xl ${isActive(item.href) ? "fill-icon" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold leading-none">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Business Studio
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {businessMenuItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                  isActive(item.href)
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                    : "hover:bg-white/[0.06] text-white/80"
                }`}>
                <span className={`material-symbols-outlined text-xl ${isActive(item.href) ? "fill-icon" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold leading-none">{item.label}</span>
              </Link>
            ))}
            {canSeeMemberMenu && (
              <Link
                href="/artist-console/members"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                  pathname?.startsWith("/artist-console/members")
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                    : "hover:bg-white/[0.06] text-white/80"
                }`}>
                <span
                  className={`material-symbols-outlined text-xl ${
                    pathname?.startsWith("/artist-console/members") ? "fill-icon" : ""
                  }`}>
                  groups
                </span>
                <span className="text-sm font-bold leading-none">멤버 관리</span>
              </Link>
            )}
          </div>
        </section>
      </div>
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
    </aside>
  );
}
