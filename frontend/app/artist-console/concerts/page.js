"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const CONCERTS_API = "http://localhost:8080/api/concerts";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: token }),
  };
}

export default function ArtistConcertsPage() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConcerts();
  }, []);

  const fetchConcerts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(CONCERTS_API, { headers: getAuthHeaders() });
      setConcerts(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "공연 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 이 공연을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${CONCERTS_API}/${id}`, { headers: getAuthHeaders() });
      await fetchConcerts();
    } catch (err) {
      alert(err.response?.data?.message || "삭제에 실패했습니다.");
    }
  };

  const formatDateTime = (instantStr) => {
    if (!instantStr) return "-";
    const date = new Date(instantStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto">
        <div className="text-white/55 text-center py-12">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">공연 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">공연 정보를 관리하고 예매 일정을 설정합니다.</p>
        </div>
        <Button variant="primary" href="/artist-console/concerts/new" className="text-xs uppercase tracking-widest">
          <span className="material-symbols-outlined text-sm mr-1.5">add</span>
          새 공연 등록
        </Button>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/90 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {concerts.length === 0 ? (
          <Surface variant="primary" className="p-12 text-center">
            <p className="text-white/55 font-medium mb-4">등록된 공연이 없습니다.</p>
            <Button variant="primary" href="/artist-console/concerts/new" className="text-xs uppercase tracking-widest">
              첫 공연 등록하기
            </Button>
          </Surface>
        ) : (
          concerts.map((concert) => (
            <Surface key={concert.id} variant="primary" className="p-8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-shadow">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    {concert.concertImageUrl && (
                      <img
                        src={concert.concertImageUrl}
                        className="size-24 rounded-xl object-cover border border-white/[0.08]"
                        alt=""
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{concert.title}</h3>
                      <p className="text-sm text-white/70 mb-3 line-clamp-2">{concert.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-white/55">
                        <span>
                          <span className="font-bold">장소:</span> {concert.venueName}
                        </span>
                        <span>
                          <span className="font-bold">시작:</span> {formatDateTime(concert.startDateTime)}
                        </span>
                        <span>
                          <span className="font-bold">종료:</span> {formatDateTime(concert.endDateTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-white/55 mt-4">
                    <span>
                      선예매: {concert.presaleTicketCount}장 ({formatDateTime(concert.presaleStartDateTime)} ~ {formatDateTime(concert.presaleEndDateTime)})
                    </span>
                    <span>
                      일반 예매: {concert.saleTicketCount}장 ({formatDateTime(concert.saleStartDateTime)} ~ {formatDateTime(concert.saleEndDateTime)})
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" href={`/artist-console/concerts/${concert.id}/edit`} className="px-4 py-2 text-[10px] uppercase tracking-widest">
                    수정
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(concert.id)}
                    className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </Surface>
          ))
        )}
      </div>
    </div>
  );
}
