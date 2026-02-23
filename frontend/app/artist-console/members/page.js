"use client";

import { useEffect, useState } from "react";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import axios from "axios";
import { redirectToGuestHome } from "@/lib/authRedirect";

import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function ArtistMembersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [isArtistWithGroup, setIsArtistWithGroup] = useState(false);
  const [members, setMembers] = useState([]);

  // 그룹 계정 여부 및 멤버 목록 조회
  // - GROUP 계정: 멤버 + 권한 관리 가능
  // - ARTIST 계정이지만 그룹에 속해있으면: 멤버 정보만 조회 (권한 변경은 불가)
  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    axios
      .get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => {
        const data = res.data;
        const teamInfo = data?.teamInfo;
        const type = teamInfo?.type;
        const membersList = teamInfo?.members ?? [];

        if (type === "GROUP") {
          setIsGroup(true);
          setIsArtistWithGroup(false);
          setMembers(membersList);
        } else if (type === "ARTIST" && membersList.length > 0) {
          setIsGroup(false);
          setIsArtistWithGroup(true);
          setMembers(membersList);
        } else {
          setIsGroup(false);
          setIsArtistWithGroup(false);
          setMembers([]);
        }

        setLoading(false);
      })
      .catch(() => {
        setError("멤버 정보를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto">
        <p className="text-sm text-white/55">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-3">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!isGroup && !isArtistWithGroup) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-4">
        <SectionTitle className="text-2xl font-bold">Members Management</SectionTitle>
        <Surface variant="primary" className="p-8">
          <p className="text-sm text-white/70">
            이 기능은 <span className="font-semibold text-violet-300">그룹 계정</span>에서만 사용할 수 있습니다.
          </p>
        </Surface>
      </div>
    );
  }

  const canManagePermissions = isGroup;

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">Members Management</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            {canManagePermissions
              ? "그룹에 소속된 멤버들을 관리하고 권한을 부여하세요."
              : "소속된 그룹의 멤버 정보를 확인할 수 있습니다. 권한 변경은 그룹 계정에서만 가능합니다."}
          </p>
        </div>
        {canManagePermissions && (
          <Button
            variant="primary"
            href="/home"
            className="text-xs uppercase tracking-widest"
          >
            멤버 초대하기
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {members.map((member) => (
          <Surface key={member.id} variant="primary" className="p-8 flex flex-col items-center text-center">
            <div className="mb-6">
              <img
                src={
                  member.profileImageUrl ||
                  "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=800"
                }
                className="size-24 rounded-2xl border-2 border-white/[0.08]"
                alt=""
              />
            </div>
            <h3 className="text-xl font-black text-white mb-8">{member.nickname}</h3>
            {canManagePermissions ? (
              <div className="flex gap-2 w-full">
                <Button variant="ghost" className="flex-1 py-3 text-[10px] uppercase tracking-widest">
                  설정
                </Button>
                <button
                  type="button"
                  className="flex-1 py-3 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
                >
                  권한 해제
                </button>
              </div>
            ) : (
              <div className="w-full text-xs text-white/55 mt-2">
                권한 변경은 그룹 계정에서만 가능합니다.
              </div>
            )}
          </Surface>
        ))}
      </div>
    </div>
  );
}
