"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { request } from "@/lib/api";
import { getDefaultAvatarUrl } from "@/lib/avatar";

const personalMenuItems = [
  { id: "ARTIST_ME", label: "My Studio", icon: "person", href: "/artist-console" },
  { id: "ARTIST_POSTS", label: "게시물 관리", icon: "article", href: "/artist-console/posts" },
  { id: "ARTIST_LIVE_MGMT", label: "라이브 관리", icon: "sensors", href: "/artist-console/live" },
];

const businessMenuItems = [
  { id: "BUSINESS_DASHBOARD", label: "운영 요약", icon: "dashboard", href: "/artist-console/dashboard" },
  { id: "ARTIST_MARKET_MGMT", label: "상품 관리", icon: "shopping_bag", href: "/artist-console/market" },
  { id: "ARTIST_ORDERS", label: "주문/배송", icon: "local_shipping", href: "/artist-console/orders" },
  { id: "ARTIST_SETTLEMENT", label: "정산 관리", icon: "account_balance_wallet", href: "/artist-console/settlement" },
];

const adminMenuItems = [
  { id: "ADMIN_DASHBOARD", label: "시스템 요약", icon: "monitoring", href: "/admin" },
  { id: "ADMIN_USERS", label: "회원 관리", icon: "group", href: "/admin/users" },
  { id: "ADMIN_ARTISTS", label: "아티스트 관리", icon: "brush", href: "/admin/artists" },
  { id: "ADMIN_SETTLEMENTS", label: "정산 승인", icon: "approval", href: "/admin/settlements" },
  { id: "ADMIN_NOTICES", label: "공지사항 관리", icon: "campaign", href: "/admin/notices" },
];

export default function Sidebar({ userRole = "FAN", canManageBusiness = false }) {
  const pathname = usePathname();
  const [followingArtists, setFollowingArtists] = useState([]);
  const [dmArtists, setDmArtists] = useState([]);

  useEffect(() => {
    if (userRole !== "FAN") return;
    request("/api/user/followings", { query: { page: 0, size: 20 } })
      .then((data) => {
        const list = data?.content ?? [];
        setFollowingArtists(list);
        setDmArtists(list);
      })
      .catch(() => {
        setFollowingArtists([]);
        setDmArtists([]);
      });
  }, [userRole]);

  const isActive = (href) => pathname === href || (href !== "/artist-console" && pathname?.startsWith(href));

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col p-6 z-40 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-8">
        {userRole === "FAN" && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  팔로잉 아티스트
                </h3>
                <span className="inline-flex items-center leading-none text-[10px] font-medium text-slate-300">{followingArtists.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {followingArtists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artists/${a.id}`}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-all text-left group"
                  >
                    <img
                      src={a.profileImageUrl || getDefaultAvatarUrl(a.nickname)}
                      className="size-9 rounded-full border border-slate-100 group-hover:border-primary-300 shadow-sm object-cover"
                      alt=""
                    />
                    <span className="text-[13px] font-medium text-slate-700 truncate group-hover:text-primary-600 transition-colors leading-tight">
                      {a.nickname ?? a.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">DM</h3>
              </div>
              <div className="flex flex-col gap-1">
                {dmArtists.map((a) => (
                  <Link
                    key={`dm-${a.id}`}
                    href="/dm/fan"
                    className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                  >
                    <img
                      src={a.profileImageUrl || getDefaultAvatarUrl(a.nickname)}
                      className="size-10 rounded-2xl border border-slate-100 group-hover:border-primary-200 shadow-sm object-cover"
                      alt=""
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors leading-tight">
                        {a.nickname ?? a.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-normal uppercase tracking-wider truncate leading-tight">
                        아티스트
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {(userRole === "ARTIST" || userRole === "GROUP") && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  My Studio
                </h3>
              </div>
              <div className="flex flex-col gap-1">
                {personalMenuItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                      isActive(item.href) ? "bg-primary-50 text-primary-600 shadow-sm" : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-xl ${isActive(item.href) ? "fill-icon" : ""}`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-bold leading-none">{item.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {canManageBusiness && (
              <section>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Business Studio
                  </h3>
                </div>
                <div className="flex flex-col gap-1">
                  {businessMenuItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                        isActive(item.href) ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-xl ${isActive(item.href) ? "fill-icon" : ""}`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm font-bold leading-none">{item.label}</span>
                    </Link>
                  ))}
                  {userRole === "GROUP" && (
                    <Link
                      href="/artist-console/members"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                        pathname?.startsWith("/artist-console/members")
                          ? "bg-slate-900 text-white shadow-lg"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-xl ${
                          pathname?.startsWith("/artist-console/members") ? "fill-icon" : ""
                        }`}
                      >
                        groups
                      </span>
                      <span className="text-sm font-bold leading-none">멤버 관리</span>
                    </Link>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {userRole === "ADMIN" && (
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                관리 메뉴
              </h3>
            </div>
            <div className="flex flex-col gap-1">
              {adminMenuItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
                    isActive(item.href) ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${isActive(item.href) ? "fill-icon" : ""}`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-bold leading-none">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
