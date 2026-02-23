"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import AdminNavBar from "@/components/navbar/AdminNavBar";
import ArtistNavBar from "@/components/navbar/ArtistNavBar";
import FanNavBar from "@/components/navbar/FanNavBar";
import GroupNavBar from "@/components/navbar/GroupNavBar";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import ArtistSidebar from "@/components/sidebar/ArtistSidebar";
import FanSidebar from "@/components/sidebar/FanSidebar";
import GroupSidebar from "@/components/sidebar/GroupSidebar";
import { BASE_URL } from "@/lib/api";

const AUTH_PATHS = ["/login", "/signup"];
const AUTH_PREFIX = "/signup/";

function getRoleFromToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("accessToken");
  if (!raw) return null;
  try {
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload?.role || null;
  } catch {
    return null;
  }
}

/** 경로·역할에 따라 nav/sidebar variant 반환 (admin | artist | group | fan) */
function getLayoutVariant(pathname, role) {
  if (!pathname) return "fan";
  if (pathname.startsWith("/admin")) return "admin";
  if (
    pathname === "/home" ||
    pathname === "/mypage" ||
    pathname === "/notifications" ||
    pathname.startsWith("/posts")
  ) {
    if (role === "ROLE_ADMIN") return "admin";
    if (role === "ROLE_GROUP") return "group";
    if (role === "ROLE_ARTIST") return "artist";
    return "fan";
  }
  if (
    pathname.startsWith("/artist-console") ||
    pathname.startsWith("/milestone") ||
    pathname.startsWith("/dm/artist") ||
    pathname.startsWith("/group") ||
    pathname.startsWith("/studio")
  )
    return "artist";
  return "fan";
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRole(getRoleFromToken());
  }, []);
  useEffect(() => {
    const tokenRole = getRoleFromToken();
    setRole(tokenRole);

    if (tokenRole != null) return;
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    const pure = token?.replace(/^Bearer\s+/i, "").trim();
    if (!pure) return;

    fetch(`${BASE_URL}/api/home`, {
      headers: { Authorization: `Bearer ${pure}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload) return;
        const looksArtist =
          Array.isArray(payload.recentPosts) && payload.followedArtists == null;
        setRole(looksArtist ? "ROLE_ARTIST" : "ROLE_USER");
      })
      .catch(() => {});
  }, [pathname]);

  const isAuthView =
    AUTH_PATHS.some((p) => pathname === p) ||
    (pathname?.startsWith(AUTH_PREFIX) ?? false);
  const isLiveDetail = pathname?.startsWith("/live/");
  const showNavbar = !isAuthView;
  const showSidebar =
    mounted && pathname != null && !isAuthView && !isLiveDetail;
  const layoutVariant = getLayoutVariant(pathname, role);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0814] via-[#1a0f2e] to-[#0b0814] flex flex-col relative">
      {/* 가장자리 비네팅 — 절제 */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] shadow-[inset_0_0_80px_30px_rgba(0,0,0,0.25)]"
        aria-hidden
      />
      {showNavbar && (
        <>
          {layoutVariant === "admin" && (
            <AdminNavBar
              showSidebarToggle={showSidebar}
              sidebarOpen={sidebarOpen}
              onSidebarToggle={() => setSidebarOpen((v) => !v)}
            />
          )}
          {layoutVariant === "artist" && (
            <ArtistNavBar
              showSidebarToggle={showSidebar}
              sidebarOpen={sidebarOpen}
              onSidebarToggle={() => setSidebarOpen((v) => !v)}
            />
          )}
          {layoutVariant === "group" && (
            <GroupNavBar
              showSidebarToggle={showSidebar}
              sidebarOpen={sidebarOpen}
              onSidebarToggle={() => setSidebarOpen((v) => !v)}
            />
          )}
          {layoutVariant === "fan" && (
            <FanNavBar
              showSidebarToggle={showSidebar}
              sidebarOpen={sidebarOpen}
              onSidebarToggle={() => setSidebarOpen((v) => !v)}
            />
          )}
        </>
      )}

      <div className={`flex flex-1 relative ${showNavbar ? "pt-16" : ""}`}>
        {showSidebar && (
          <div
            className={`fixed left-0 top-0 bottom-0 w-64 z-40 transition-[transform] duration-200 ease-in-out hidden md:block ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            aria-hidden={!sidebarOpen}
          >
            {layoutVariant === "admin" && <AdminSidebar />}
            {layoutVariant === "artist" && <ArtistSidebar />}
            {layoutVariant === "group" && <GroupSidebar />}
            {layoutVariant === "fan" && <FanSidebar />}
          </div>
        )}

        <main
          className={`flex-1 overflow-y-auto custom-scrollbar relative transition-[padding] duration-200 ${
            showSidebar ? (sidebarOpen ? "lg:pl-64" : "lg:pl-0") : ""
          }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
