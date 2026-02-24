"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";

function isLoggedIn() {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem("accessToken");
  return !!raw?.trim();
}

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

/** 우상단 고정 공지 버튼. 클릭 시 최근 공지 3개 + 전체 보기 링크. 관리자는 /admin/notices, 그 외는 /notices로 이동 */
export default function NoticeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allNoticesHref, setAllNoticesHref] = useState("/notices");
  const [showLoginModal, setShowLoginModal] = useState(false);
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
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h3 className="font-bold text-white text-sm">최근 공지</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-white/55 text-sm">
                불러오는 중...
              </div>
            ) : notices.length === 0 ? (
              <div className="px-4 py-6 text-center text-white/55 text-sm">
                등록된 공지가 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {notices.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn()) {
                          setShowLoginModal(true);
                          return;
                        }
                        setOpen(false);
                        router.push(`/posts/${n.id}?type=ARTIST&from=notices`);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    >
                      <p className="text-sm font-medium text-white line-clamp-2 break-words">
                        {n.title || n.content?.slice(0, 50) || "공지"}
                        {n.content && n.content.length > 50 ? "..." : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-4 py-3 border-t border-white/[0.06]">
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

      {showLoginModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
            role="presentation"
          >
            <div
              className="my-auto bg-[#201a33] rounded-2xl border border-white/[0.08] p-6 w-full max-w-sm shadow-xl shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white font-medium text-center mb-6 leading-relaxed">
                로그인 후 이용 가능한 서비스입니다.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="flex-1 py-3 text-center text-sm font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-xl transition-colors"
                >
                  로그인
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-white/70 hover:text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-xl transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
