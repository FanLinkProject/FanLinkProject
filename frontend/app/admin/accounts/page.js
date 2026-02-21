"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import { redirectToGuestHome } from "@/lib/authRedirect";

const BASE_URL = "http://localhost:8080";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function AccountTable({ title, list, roleLabel }) {
  return (
    <Surface variant="primary" className="overflow-hidden">
      <h3 className="text-lg font-black text-white mb-4 px-8 pt-8">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-6 py-3 text-[10px] font-black text-white/55 uppercase tracking-widest">ID</th>
              <th className="px-6 py-3 text-[10px] font-black text-white/55 uppercase tracking-widest">닉네임</th>
              <th className="px-6 py-3 text-[10px] font-black text-white/55 uppercase tracking-widest">이메일</th>
              <th className="px-6 py-3 text-[10px] font-black text-white/55 uppercase tracking-widest">역할</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-white/50 text-sm">
                  계정이 없습니다.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-white/70">{row.id}</td>
                  <td className="px-6 py-4 font-bold text-white">{row.nickname}</td>
                  <td className="px-6 py-4 text-sm text-white/70">{row.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/80">
                      {row.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export default function AdminAccountsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    axios
      .get(`${BASE_URL}/api/admin/accounts-summary`, { headers })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 403 ? "관리자만 접근할 수 있습니다." : "목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-sm text-white/55">불러오는 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-sm text-red-400">{error || "데이터를 불러올 수 없습니다."}</p>
        <Link href="/admin" className="inline-block mt-4 text-violet-300 text-sm font-bold hover:underline">
          관리자 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">DB 계정 정리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            현재 DB에 등록된 팬(USER), 개인 아티스트(ARTIST), 그룹(GROUP) 계정 목록입니다.
          </p>
        </div>
        <Link
          href="/admin"
          className="px-5 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-xs font-bold text-white/80 hover:bg-white/[0.08] transition-colors"
        >
          관리자 홈
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-10">
        <AccountTable title="팬 계정 (USER)" list={data.fans ?? []} roleLabel="USER" />
        <AccountTable title="개인 아티스트 계정 (ARTIST)" list={data.artists ?? []} roleLabel="ARTIST" />
        <AccountTable title="그룹 아티스트 계정 (GROUP)" list={data.groups ?? []} roleLabel="GROUP" />
      </div>
    </div>
  );
}
