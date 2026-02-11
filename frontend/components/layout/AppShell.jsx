"use client";

import { usePathname } from "next/navigation";
import AdminNavBar from "@/components/navbar/AdminNavBar";
import ArtistNavBar from "@/components/navbar/ArtistNavBar";
import FanNavBar from "@/components/navbar/FanNavBar";
import GroupNavBar from "@/components/navbar/GroupNavBar";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import ArtistSidebar from "@/components/sidebar/ArtistSidebar";
import FanSidebar from "@/components/sidebar/FanSidebar";
import GroupSidebar from "@/components/sidebar/GroupSidebar";

const AUTH_PATHS = ["/login", "/signup"];
const AUTH_PREFIX = "/signup/";

function getNavbarVariant(pathname) {
  if (!pathname) return "fan";
  if (pathname.startsWith("/admin")) return "admin";
  if (
    pathname.startsWith("/artist-console") ||
    pathname.startsWith("/milestone") ||
    pathname.startsWith("/dm/artist")
  )
    return "artist";
  if (pathname.startsWith("/group") || pathname.startsWith("/studio"))
    return "group";
  return "fan";
}

function getSidebarVariant(pathname) {
  if (!pathname) return "fan";
  if (pathname.startsWith("/admin")) return "admin";
  if (
    pathname.startsWith("/artist-console") ||
    pathname.startsWith("/milestone") ||
    pathname.startsWith("/dm/artist")
  )
    return "artist";
  if (pathname.startsWith("/group") || pathname.startsWith("/studio"))
    return "group";
  return "fan";
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isAuthView =
    AUTH_PATHS.some((p) => pathname === p) ||
    (pathname?.startsWith(AUTH_PREFIX) ?? false);
  const isLiveDetail = pathname?.startsWith("/live/");
  const showNavbar = !isAuthView;
  const showSidebar = !isAuthView && !isLiveDetail;
  const navVariant = getNavbarVariant(pathname);
  const sidebarVariant = getSidebarVariant(pathname);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0814] via-[#1a0f2e] to-[#0b0814] flex flex-col relative">
      {/* 가장자리 비네팅 — 절제 */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] shadow-[inset_0_0_80px_30px_rgba(0,0,0,0.25)]"
        aria-hidden
      />
      {showNavbar && (
        <>
          {navVariant === "admin" && <AdminNavBar />}
          {navVariant === "artist" && <ArtistNavBar />}
          {navVariant === "group" && <GroupNavBar />}
          {navVariant === "fan" && <FanNavBar />}
        </>
      )}

      <div className={`flex flex-1 relative ${showNavbar ? "pt-16" : ""}`}>
        {showSidebar && (
          <>
            {sidebarVariant === "admin" && <AdminSidebar />}
            {sidebarVariant === "artist" && <ArtistSidebar />}
            {sidebarVariant === "group" && <GroupSidebar />}
            {sidebarVariant === "fan" && <FanSidebar />}
          </>
        )}

        <main
          className={`flex-1 overflow-y-auto custom-scrollbar relative ${
            showSidebar ? "lg:pl-64" : ""
          }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
