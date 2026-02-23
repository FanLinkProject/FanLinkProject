"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

import { BASE_URL } from "@/lib/api";
// 공연 등록용: ARTIST만 (그룹 계정 제외), 개인 아티스트 + 그룹 소속 멤버만 조회
const ARTISTS_FOR_CONCERT_API = `${BASE_URL}/api/user/artists/for-concert`;

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const bearer = token && (token.startsWith("Bearer ") ? token : `Bearer ${token.trim()}`);
  return {
    "Content-Type": "application/json",
    ...(bearer && { Authorization: bearer }),
  };
}

export default function SelectArtistsPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedArtists, setAddedArtists] = useState([]);

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchKeyword.trim()) params.set("nickname", searchKeyword.trim());
        params.set("page", page);
        params.set("size", 20);
        const res = await axios.get(`${ARTISTS_FOR_CONCERT_API}?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        setArtists(res.data?.content ?? []);
        setTotalPages(res.data?.totalPages ?? 0);
      } catch (err) {
        setArtists([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, [searchKeyword, page]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearchKeyword(keyword);
    setPage(0);
  };

  const addArtist = (artist) => {
    if (addedArtists.some((a) => a.id === artist.id)) return;
    setAddedArtists((prev) => [...prev, { id: artist.id, nickname: artist.nickname, profileImageUrl: artist.profileImageUrl }]);
  };

  const removeAdded = (id) => {
    setAddedArtists((prev) => prev.filter((a) => a.id !== id));
  };

  const getReturnPath = () => {
    try {
      const path = sessionStorage.getItem("concertSelectArtistsReturn");
      if (path && typeof path === "string" && path.startsWith("/artist-console/concerts")) return path;
    } catch (_) {}
    return "/artist-console/concerts/new";
  };

  const finishSelection = () => {
    if (addedArtists.length > 0) {
      try {
        sessionStorage.setItem("concertAddArtists", JSON.stringify(addedArtists));
      } catch (_) {}
    }
    let returnPath = getReturnPath();
    try {
      sessionStorage.removeItem("concertSelectArtistsReturn");
    } catch (_) {}
    if (returnPath.includes("/edit") && addedArtists.length > 0) {
      returnPath = returnPath.replace(/\?.*$/, "") + "?from=select-artists";
    }
    router.push(returnPath);
  };

  const handleBack = () => {
    const returnPath = getReturnPath();
    try {
      sessionStorage.removeItem("concertSelectArtistsReturn");
    } catch (_) {}
    router.push(returnPath);
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="size-10 rounded-full"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">아티스트 검색</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">공연에 참여할 아티스트를 검색해 추가하세요.</p>
        </div>
      </header>

      <Surface variant="primary" className="p-6 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="닉네임 또는 그룹명으로 검색"
            className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          <Button type="submit" variant="primary" className="px-6">
            검색
          </Button>
        </form>

        {addedArtists.length > 0 && (
          <div className="pt-2 border-t border-white/[0.08]">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2">
              이번에 추가할 아티스트 ({addedArtists.length}명)
            </p>
            <div className="flex flex-wrap gap-2">
              {addedArtists.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 text-white text-sm"
                >
                  {a.nickname}
                  <button
                    type="button"
                    onClick={() => removeAdded(a.id)}
                    className="hover:text-red-400"
                    aria-label="제거"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </span>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              className="mt-3"
              onClick={finishSelection}
            >
              선택 완료하고 공연 등록으로 돌아가기
            </Button>
          </div>
        )}
      </Surface>

      <Surface variant="primary" className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">검색 결과</h3>
        {loading ? (
          <p className="text-white/55">검색 중...</p>
        ) : artists.length === 0 ? (
          <p className="text-white/55">
            {searchKeyword ? "검색 결과가 없습니다." : "검색어를 입력하고 검색해 보세요."}
          </p>
        ) : (
          <ul className="space-y-2">
            {artists.map((artist) => {
              const added = addedArtists.some((a) => a.id === artist.id);
              return (
                <li
                  key={artist.id}
                  className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[#16102a] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    {artist.profileImageUrl ? (
                      <img
                        src={artist.profileImageUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/50">person</span>
                      </div>
                    )}
                    <span className="font-medium text-white">{artist.nickname}</span>
                  </div>
                  <Button
                    type="button"
                    variant={added ? "ghost" : "primary"}
                    className="shrink-0"
                    onClick={() => addArtist(artist)}
                    disabled={added}
                  >
                    {added ? "추가됨" : "추가"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              이전
            </Button>
            <span className="text-white/55 text-sm py-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              다음
            </Button>
          </div>
        )}
      </Surface>
    </div>
  );
}
