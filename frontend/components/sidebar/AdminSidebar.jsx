"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminMenuItems = [
  {
    id: "ADMIN_DASHBOARD",
    label: "시스템 요약",
    icon: "monitoring",
    href: "/admin",
  },
  {
    id: "ADMIN_USERS",
    label: "회원 관리",
    icon: "group",
    href: "/admin/users",
  },
  {
    id: "ADMIN_ARTISTS",
    label: "아티스트 관리",
    icon: "brush",
    href: "/admin/artists",
  },
  {
    id: "ADMIN_SETTLEMENTS",
    label: "정산 승인",
    icon: "approval",
    href: "/admin/settlements",
  },
  {
    id: "ADMIN_NOTICES",
    label: "공지사항 관리",
    icon: "campaign",
    href: "/admin/notices",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (href) =>
    pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[#16102a] backdrop-blur-sm border-r border-white/[0.05] hidden lg:flex flex-col p-6 z-40 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-8">
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              관리 메뉴
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {adminMenuItems.map((item) => (
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
      </div>
    </aside>
  );
}
