"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { BASE_URL, request } from "@/lib/api";
import { useMediaUpload } from "@/lib/useMediaUpload";
import { MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function NewPostPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [artistId, setArtistId] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [content, setContent] = useState("");
  const [mediaAssetIds, setMediaAssetIds] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const fileInputRef = useRef(null);

  const presignItem = {
    category: MediaAssetCategory.POST_IMAGE,
    scope: MediaAssetScope.PUBLIC,
    artistId: groupId ?? artistId ?? undefined,
    postIdOrTemp: "new",
    attachmentCountInPost: mediaAssetIds.length + 1,
  };
  const { upload } = useMediaUpload(presignItem);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || !upload) return;
    const result = await upload(file);
    if (result?.mediaAssetId && result?.url) {
      setMediaAssetIds((prev) => [...prev, result.mediaAssetId]);
      setAttachmentPreviews((prev) => [...prev, { mediaAssetId: result.mediaAssetId, url: result.url }]);
    }
    e.target.value = "";
  };

  const removeImage = (mediaAssetId) => {
    setMediaAssetIds((prev) => prev.filter((id) => id !== mediaAssetId));
    setAttachmentPreviews((prev) => prev.filter((p) => p.mediaAssetId !== mediaAssetId));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!artistId && !groupId) {
      router.push("/home");
      return;
    }
    setSubmitLoading(true);
    try {
      await request("/api/artist-posts", {
        method: "POST",
        body: {
          groupId: groupId ?? artistId,
          title: "",
          content: content.trim(),
          isMembershipOnly: false,
          isNotice: false,
          mediaAssetIds,
        },
      });
      router.push("/posts");
    } catch (err) {
      console.error(err);
      alert(err?.data?.message ?? err?.message ?? "게시에 실패했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios.get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => {
        const p = res.data?.profile;
        if (p?.id != null) setArtistId(p.id);
        if (p?.groupId != null) setGroupId(p.groupId);
        setProfile(p ?? null);
      })
      .catch(() => { setArtistId(null); setGroupId(null); setProfile(null); });
  }, []);

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" href="/posts" className="size-10 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">새 글 작성</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">아티스트 소식을 팬들과 공유하세요.</p>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Surface variant="primary" className="p-8">
          {profile && (
            <div className="flex items-center gap-4 mb-6">
              <img src={profile.profileImageUrl || getDefaultAvatarUrl(profile.nickname)} className="size-12 rounded-full border border-white/[0.08] object-cover" alt="" />
              <div>
                <p className="font-bold text-white">{profile.nickname ?? profile.name}</p>
                <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">Official Artist</p>
              </div>
            </div>
          )}
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">내용</span>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="팬들에게 전할 말을 적어주세요." className="w-full min-h-[200px] bg-[#16102a] border border-white/[0.08] rounded-2xl p-4 text-white placeholder:text-white/40 font-medium outline-none focus:ring-2 focus:ring-violet-500/20 resize-y" required />
          </label>
          <div className="mt-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">사진 첨부</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {attachmentPreviews.length > 0 ? (
              <div className="space-y-3">
                {attachmentPreviews.map((p) => (
                  <div key={p.mediaAssetId} className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                    <img src={p.url} alt="미리보기" className="w-full max-h-80 object-contain bg-black/20" />
                    <button type="button" onClick={() => removeImage(p.mediaAssetId)} className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="py-4 px-6 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-violet-500/40 text-sm">
                  + 추가
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                <span className="text-sm font-bold">클릭하여 사진 추가</span>
              </button>
            )}
          </div>
        </Surface>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" href="/posts">취소</Button>
          <Button type="submit" variant="primary" className="px-8 py-3" disabled={submitLoading}>
            {submitLoading ? "게시 중..." : "게시하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
