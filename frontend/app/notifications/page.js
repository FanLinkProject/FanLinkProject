"use client";

import Link from "next/link";
import { MOCK_ARTISTS, MOCK_POSTS, MOCK_LIVES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

export default function NotificationsPage() {
  const notifications = [
    {
      id: "n1",
      type: "LIVE",
      artistId: "luna-ray",
      text: '루나 레이님이 라이브 스트리밍을 시작했습니다: "Luna Ray Q&A"',
      timestamp: "방금 전",
      data: MOCK_LIVES[0],
    },
    {
      id: "n2",
      type: "DM",
      artistId: "luna-ray",
      text: "루나 레이님에게 새로운 메시지가 도착했습니다.",
      timestamp: "10분 전",
      data: MOCK_ARTISTS[0],
    },
    {
      id: "n3",
      type: "POST",
      artistId: "solaris",
      text: '솔라리스님이 새로운 포스트를 올렸습니다: "새로운 한정판 굿즈..." ',
      timestamp: "2시간 전",
      data: MOCK_POSTS[1],
    },
  ];

  function getIcon(type) {
    if (type === "LIVE") return "sensors";
    if (type === "DM") return "mail";
    if (type === "POST") return "article";
    return "notifications";
  }

  function getLink(notif) {
    if (notif.type === "LIVE") return `/live/${notif.data.id}`;
    if (notif.type === "DM") return "/dm";
    if (notif.type === "POST") return `/posts/${notif.data.id}`;
    return "#";
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto">
      <SectionTitle className="text-2xl font-bold mb-8">알림</SectionTitle>

      <Surface variant="primary" className="overflow-hidden">
        {notifications.map((notif, idx) => {
          const artist = MOCK_ARTISTS.find((a) => a.id === notif.artistId);
          return (
            <Link
              key={notif.id}
              href={getLink(notif)}
              className={`block p-6 flex gap-5 hover:bg-white/[0.03] transition-colors ${
                idx !== notifications.length - 1
                  ? "border-b border-white/[0.06]"
                  : ""
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={artist?.avatar}
                  className="size-12 rounded-2xl object-cover border border-white/[0.08]"
                  alt=""
                />
                <div
                  className={`absolute -bottom-1 -right-1 size-6 rounded-full flex items-center justify-center text-white border-2 border-[#201a33] ${
                    notif.type === "LIVE"
                      ? "bg-red-500/90"
                      : notif.type === "DM"
                        ? "bg-violet-500"
                        : "bg-white/20"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {getIcon(notif.type)}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 font-bold mb-1 leading-snug">
                  {notif.text}
                </p>
                <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                  {notif.timestamp}
                </p>
              </div>
            </Link>
          );
        })}
        {notifications.length === 0 && (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">
              notifications_off
            </span>
            <p className="text-white/55 font-medium">새로운 알림이 없습니다.</p>
          </div>
        )}
      </Surface>
    </div>
  );
}
