"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { redirectToGuestHome } from "@/lib/authRedirect";

const BASE_URL = "http://localhost:8080";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ArtistPostsPage() {
  const [profile, setProfile] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMyPosts = useCallback(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/artist-posts/my-posts`, { headers, params: { page: 0, size: 100 } })
      .then((res) => setPosts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPosts([]));
  }, []);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    setLoading(true);
    axios
      .get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => {
        setProfile(res.data?.profile ?? null);
        setTeamInfo(res.data?.teamInfo ?? null);
      })
      .catch(() => {
        setProfile(null);
        setTeamInfo(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    fetchMyPosts();
  }, [fetchMyPosts]);

  const handleDelete = (postId) => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    setDeletingId(postId);
    axios
      .delete(`${BASE_URL}/api/artist-posts/${postId}`, { headers })
      .then(() => fetchMyPosts())
      .catch(() => alert("삭제에 실패했습니다."))
      .finally(() => setDeletingId(null));
  };

  const displayName = teamInfo?.type === "GROUP" ? teamInfo?.groupName : profile?.nickname;
  const firstMember = teamInfo?.members?.[0];

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">게시물 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">본인이 작성한 게시글 목록입니다. 수정·삭제할 수 있습니다.</p>
        </div>
        {(profile || firstMember) && (
          <div className="flex gap-3">
            <div className="px-5 py-3 bg-white/[0.06] border border-white/[0.08] rounded-2xl font-bold text-xs flex items-center gap-3 text-white/80">
              <img
                src={firstMember?.profileImageUrl || profile?.profileImageUrl || getDefaultAvatarUrl(displayName)}
                className="size-5 rounded-full border border-white/[0.08] object-cover"
                alt=""
              />
              <span>작성자: {firstMember?.nickname ?? profile?.nickname ?? displayName ?? "나"}</span>
            </div>
            <Button variant="primary" href="/posts/new" className="text-xs uppercase tracking-widest">
              새 글 작성
            </Button>
          </div>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-white/55">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-white/55 font-medium">작성한 게시글이 없습니다.</p>
          <Button variant="primary" href="/posts/new" className="mt-4 text-xs">
            새 글 작성
          </Button>
        </Surface>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Surface key={post.id} variant="primary" className="p-8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={getDefaultAvatarUrl(post.writerNickname)}
                    className="size-10 rounded-full border border-white/[0.08] object-cover"
                    alt=""
                  />
                  <div>
                    <p className="font-bold text-white">{post.writerNickname}</p>
                    <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                      {formatDate(post.createdAt)}
                      {post.isMembershipOnly ? " · 멤버십 전용" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    href={`/posts/${post.id}/edit`}
                    className="px-4 py-2 text-[10px] uppercase tracking-widest"
                  >
                    수정
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors disabled:opacity-50"
                  >
                    {deletingId === post.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
              {post.title && (
                <h3 className="font-bold text-white mb-2 line-clamp-1">{post.title}</h3>
              )}
              <p className="text-white/80 leading-relaxed font-medium line-clamp-3">
                {post.content ?? "(내용 없음)"}
              </p>
              {post.attachments?.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {post.attachments.slice(0, 3).map((att) => (
                    <img
                      key={att.id}
                      src={att.url || att.thumbnailUrl}
                      alt=""
                      className="size-16 rounded-lg object-cover border border-white/[0.08]"
                    />
                  ))}
                  {post.attachments.length > 3 && (
                    <span className="text-[10px] text-white/50 self-center">+{post.attachments.length - 3}</span>
                  )}
                </div>
              )}
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
