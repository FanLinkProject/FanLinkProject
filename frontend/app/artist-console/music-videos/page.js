"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { list, create, remove } from "@/lib/musicVideoApi";
import { request } from "@/lib/api";
import { toYouTubeWatchUrl } from "@/lib/youtubeUtils";

export default function ArtistMusicVideosPage() {
  const [artistId, setArtistId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

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
            YouTube 뮤직비디오를 등록·삭제합니다. (ARTIST 본인 또는 ADMIN)
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

      <Surface variant="primary" className="p-6">
        <h3 className="font-bold text-white mb-4">등록된 뮤직비디오</h3>
        {loading ? (
          <p className="text-white/55">로딩 중...</p>
        ) : videos.length === 0 ? (
          <p className="text-white/55">등록된 영상이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {videos.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-4 p-4 bg-white/[0.04] rounded-xl"
              >
                {v.thumbnailUrl && (
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="w-32 aspect-video object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{v.title}</p>
                  <p className="text-sm text-white/55 truncate">
                    {v.description}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">
                    videoId: {v.videoId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={toYouTubeWatchUrl(v.embedUrl) || v.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
                  >
                    보기
                  </a>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(v.id)}
                  >
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <Link
        href="/artist-console"
        className="text-white/70 hover:text-white underline"
      >
        ← 아티스트 콘솔
      </Link>
    </div>
  );
}
