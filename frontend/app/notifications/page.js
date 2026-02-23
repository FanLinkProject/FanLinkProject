"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "../providers/NotificationProvider";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

const NOTIFICATION_TYPE_CONFIG = {
  LIVE_STARTED: {
    icon: "sensors",
    badgeClass: "bg-red-500/90",
    label: "라이브",
  },
  ARTIST_MESSAGE: {
    icon: "mail",
    badgeClass: "bg-violet-500",
    label: "DM",
  },
  FAN_MESSAGE: {
    icon: "mail",
    badgeClass: "bg-violet-500",
    label: "DM",
  },
};

function formatTimestamp(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLink(notification) {
  const { type, roomId, targetId } = notification;
  if (type === "LIVE_STARTED") {
    if (targetId != null && targetId !== "") return `/live/${targetId}`;
    console.warn("[notifications] LIVE_STARTED 알림에 targetId가 없어 라우팅하지 않습니다.", notification);
    return "#";
  }
  if (type === "ARTIST_MESSAGE" || type === "FAN_MESSAGE") {
    return roomId ? `/dm/fan?roomId=${roomId}` : "/dm/fan";
  }
  return "#";
}

export default function NotificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteReadNotifications,
    refreshNotifications,
  } = useNotifications();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    refreshNotifications().finally(() => setLoading(false));
  }, [router, refreshNotifications]);

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl mx-auto">
        <SectionTitle className="text-2xl font-bold mb-8">알림</SectionTitle>
        <Surface variant="primary" className="p-20 text-center">
          <p className="text-white/55 font-medium">로딩 중...</p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <SectionTitle className="text-2xl font-bold">알림</SectionTitle>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/[0.06] transition-colors"
          >
            모두 읽음
          </button>
          <button
            onClick={deleteReadNotifications}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/[0.06] transition-colors"
          >
            읽은 알림 삭제
          </button>
        </div>
      </div>

      <Surface variant="primary" className="overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">
              notifications_off
            </span>
            <p className="text-white/55 font-medium">새로운 알림이 없습니다.</p>
          </div>
        ) : (
          notifications.map((n, idx) => {
            const config = NOTIFICATION_TYPE_CONFIG[n.type] || {
              icon: "notifications",
              badgeClass: "bg-white/20",
              label: "알림",
            };
            const avatarSeed = n.id || n.type || "notif";

            return (
              <Link
                key={n.id}
                href={getLink(n)}
                onClick={() => !n.isRead && markAsRead(n.id)}
                className={`block p-6 flex gap-5 hover:bg-white/[0.03] transition-colors ${
                  idx !== notifications.length - 1
                    ? "border-b border-white/[0.06]"
                    : ""
                } ${n.isRead ? "opacity-70" : ""}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={`https://picsum.photos/seed/${avatarSeed}/100/100`}
                    className="size-12 rounded-2xl object-cover border border-white/[0.08]"
                    alt=""
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 size-6 rounded-full flex items-center justify-center text-white border-2 border-[#201a33] ${config.badgeClass}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {config.icon}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {!n.isRead && (
                    <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-2 align-middle" />
                  )}
                  <p className="text-white/90 font-bold mb-1 leading-snug">
                    {n.content}
                  </p>
                  <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                    {formatTimestamp(n.createdAt)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </Surface>
    </div>
  );
}
