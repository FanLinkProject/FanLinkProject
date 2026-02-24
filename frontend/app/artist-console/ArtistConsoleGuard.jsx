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
    if (p === "/artist-console") {
      return pathname === "/artist-console" || pathname === "/artist-console/";
    }
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}

const DISALLOWED_ACCOUNT = "/artist-console/account";
const DISALLOWED_MEMBERS = "/artist-console/members";

function matchesPath(pathname, basePath) {
  if (!pathname || !basePath) return false;
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

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
    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

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

        if (isGroupMember) {
          if (!isAllowedForGroupMember(pathname)) {
            router.replace("/artist-console");
            return;
          }
          setChecked(true);
          return;
        }

        if (matchesPath(pathname, DISALLOWED_ACCOUNT)) {
          router.replace("/artist-console");
          return;
        }

        if (role === "ROLE_ARTIST" && matchesPath(pathname, DISALLOWED_MEMBERS)) {
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
