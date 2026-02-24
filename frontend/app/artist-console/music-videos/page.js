"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { list, create, remove } from "@/lib/musicVideoApi";
import { request } from "@/lib/api";

export default function ArtistMusicVideosPage() {
  const [artistId, setArtistId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.trim().toLowerCase();
    return videos.filter(
      (v) =>
        (v.title || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q)
    );
  }, [videos, searchQuery]);

  const loadList = () => {
    if (!artistId) return;
    setLoading(true);
    setError(null);
    list(artistId)
      .then(setVideos)
      .catch((e) => {
        setError(e?.data?.message || e.message || "목록 조회 실패");
        setVideos([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    request("/api/artist/mypage")
      .then((data) => {
        const id = data?.profile?.groupId ?? data?.profile?.id;
        setArtistId(id ?? null);
      })
      .catch(() => setArtistId(null));
  }, []);

  useEffect(() => {
    loadList();
  }, [artistId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.url.trim() || !form.title.trim() || !form.description.trim())
      return;
    setSubmitting(true);
    setError(null);
    try {
      await create(artistId, form);
      setForm({ url: "", title: "", description: "" });
      setShowForm(false);
      loadList();
    } catch (e) {
      setError(e?.data?.message || e.message || "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("이 뮤직비디오를 삭제할까요?")) return;
    setError(null);
    try {
      await remove(artistId, id);
      if (selectedVideo?.id === id) setSelectedVideo(null);
      loadList();
    } catch (e) {
      setError(e?.data?.message || e.message || "삭제 실패");
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">
            뮤직비디오 관리
          </SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            YouTube 뮤직비디오를 등록·삭제합니다.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "취소" : "영상 등록"}
        </Button>
      </header>

      {!artistId && !loading && (
        <p className="text-white/55 text-sm">아티스트 정보를 불러오는 중...</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {showForm && (
        <Surface variant="primary" className="p-6">
          <h3 className="font-bold text-white mb-4">새 뮤직비디오 등록</h3>
          <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
                YouTube URL
              </span>
              <input
                type="url"
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
                제목 (150자)
              </span>
              <input
                type="text"
                maxLength={150}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
                설명 (2000자)
              </span>
              <textarea
                maxLength={2000}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white min-h-[80px]"
                required
              />
            </label>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "등록 중..." : "등록"}
            </Button>
          </form>
        </Surface>
      )}

      {/* 인라인 플레이어 */}
      {selectedVideo && (
        <Surface variant="primary" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white truncate flex-1 mr-4">{selectedVideo.title}</h3>
            <button
              type="button"
              onClick={() => setSelectedVideo(null)}
              className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={selectedVideo.embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              title={selectedVideo.title}
            />
          </div>
          {selectedVideo.description && (
            <p className="text-white/60 text-sm mt-4 whitespace-pre-wrap line-clamp-4">{selectedVideo.description}</p>
          )}
        </Surface>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">등록된 뮤직비디오</h3>
          {videos.length > 0 && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목 또는 설명 검색"
                className="pl-9 pr-4 py-2 rounded-xl bg-[#16102a] border border-white/[0.08] text-white text-sm w-64 placeholder:text-white/30"
              />
            </div>
          )}
        </div>
        {loading ? (
          <p className="text-white/55">로딩 중...</p>
        ) : videos.length === 0 ? (
          <p className="text-white/55">등록된 영상이 없습니다.</p>
        ) : filteredVideos.length === 0 ? (
          <p className="text-white/55">검색 결과가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredVideos.map((v) => (
              <Surface
                key={v.id}
                variant="card"
                className={`overflow-hidden group transition-all ${selectedVideo?.id === v.id ? "ring-2 ring-violet-500" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedVideo(v)}
                  className="w-full text-left"
                >
                  <div className="aspect-video relative overflow-hidden">
                    {v.thumbnailUrl ? (
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white/20">videocam_off</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                      <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                    </div>
                  </div>
                </button>
                <div className="p-4">
                  <h4 className="font-bold text-white truncate mb-1">{v.title}</h4>
                  <p className="text-sm text-white/50 truncate">{v.description}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(v)}
                      className="px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-bold hover:bg-violet-500/30 transition-colors"
                    >
                      보기
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                      onClick={() => handleDelete(v.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/artist-console"
        className="text-white/70 hover:text-white underline"
      >
        ← 아티스트 콘솔
      </Link>
    </div>
  );
}
