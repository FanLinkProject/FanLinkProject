"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { request } from "@/lib/api";

function getRoleFromToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("accessToken");
  if (!raw) return null;
  try {
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return (payload?.role || "").replace("ROLE_", "");
  } catch {
    return null;
  }
}

function formatTimestamp(instant) {
  if (!instant) return "";
  try {
    const date = new Date(instant);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** 우상단 고정 공지 버튼. 클릭 시 최근 공지 3개 + 전체 보기 링크. 관리자는 /admin/notices, 그 외는 /notices로 이동 */
export default function NoticeButton() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allNoticesHref, setAllNoticesHref] = useState("/notices");
  const ref = useRef(null);

  useEffect(() => {
    const role = getRoleFromToken();
    setAllNoticesHref(role === "ADMIN" ? "/admin/notices" : "/notices");
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    request("/api/artist-posts/notices", { query: { limit: 3 } })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.content ?? [];
        setNotices(list);
      })
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors"
        aria-label="공지사항"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">campaign</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/[0.08] bg-[#16102a] shadow-xl z-[100] overflow-hidden">
          <div className="p-8 border-b border-white/[0.06]">
            <h3 className="font-bold text-white text-sm">최근 공지</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-white/55 text-sm">
                불러오는 중...
              </div>
            ) : notices.length === 0 ? (
              <div className="p-6 text-center text-white/55 text-sm">
                등록된 공지가 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {notices.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/posts/${n.id}?type=ARTIST&from=notices`}
                      onClick={() => setOpen(false)}
                      className="block p-4 hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-[10px] font-bold text-white/55 uppercase tracking-wider">
                        {formatTimestamp(n.createdAt)}
                      </span>
                      <p className="text-sm font-medium text-white mt-1 line-clamp-2">
                        {n.title || n.content?.slice(0, 50) || "공지"}
                        {n.content && n.content.length > 50 ? "..." : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-8 border-t border-white/[0.06]">
            <Link
              href={allNoticesHref}
              onClick={() => setOpen(false)}
              className="block w-full py-2.5 text-center text-sm font-bold text-violet-300 hover:text-violet-200 transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              전체 공지사항 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
