"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BASE_URL } from "@/lib/api";

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

/** 그룹 멤버(ARTIST + 소속 그룹 있음)가 접근 가능한 artist-console 경로 */
const GROUP_MEMBER_ALLOWED = [
  "/artist-console",
  "/artist-console/posts",
  "/artist-console/live",
  "/artist-console/concerts",
  "/artist-console/settlement",
  "/artist-console/music-videos",
];

function isAllowedForGroupMember(pathname) {
  if (!pathname?.startsWith("/artist-console")) return true;
  return GROUP_MEMBER_ALLOWED.some((p) => {
    if (p === "/artist-console") return pathname === "/artist-console" || pathname === "/artist-console/";
    return pathname === p || pathname.startsWith(p + "/");
  });
}

/** 그룹/개인 아티스트 공통 비허용 경로 (정산 계좌) */
const DISALLOWED_ACCOUNT = "/artist-console/account";

/** 개인 아티스트만 비허용 (그룹은 허용): 멤버 관리 */
const DISALLOWED_MEMBERS = "/artist-console/members";

export default function ArtistConsoleGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/artist-console")) {
      setChecked(true);
      return;
    }
    const role = getRoleFromToken();
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setChecked(true);
      return;
    }
    const headers = {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token.trim()}`,
    };
    fetch(`${BASE_URL}/api/user/profile`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        const id = profile?.id;
        const groupId = profile?.groupId;
        const isGroupMember = groupId != null && id != null && id !== groupId;

        // 그룹 멤버: Business Studio는 정산 관리만 → 해당 경로만 허용
        if (isGroupMember) {
          if (!isAllowedForGroupMember(pathname)) {
            router.replace("/artist-console");
            return;
          }
          setChecked(true);
          return;
        }

        // 정산 계좌: 모든 아티스트/그룹에서 비노출 → URL 직접 접근 차단
        if (pathname === DISALLOWED_ACCOUNT || pathname.startsWith(DISALLOWED_ACCOUNT + "/")) {
          router.replace("/artist-console");
          return;
        }

        // 그룹 계정(ROLE_GROUP): 멤버 관리 허용. 개인 아티스트(ROLE_ARTIST): 멤버 관리 비허용
        if (role === "ROLE_ARTIST" && (pathname === DISALLOWED_MEMBERS || pathname.startsWith(DISALLOWED_MEMBERS + "/"))) {
          router.replace("/artist-console");
          return;
        }

        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [pathname, router]);

  if (!checked && pathname?.startsWith("/artist-console")) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-white/55 text-sm">확인 중...</p>
      </div>
    );
  }
  return <>{children}</>;
}
