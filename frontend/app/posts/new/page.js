"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { BASE_URL, request, getAuthHeaders } from "@/lib/api";
import { usePostAttachments } from "@/lib/usePostAttachments";
import { MAX_POST_ATTACHMENTS } from "@/lib/mediaAssetApi";

export default function NewPostPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [artistId, setArtistId] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [content, setContent] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const fileInputRef = useRef(null);

  const postGroupId = groupId ?? artistId;
  const postGroupIdNum = postGroupId != null ? Number(postGroupId) : null;
  const attachments = usePostAttachments({
    postGroupId: postGroupIdNum,
    postIdOrTemp: "tmp_new",
    initialAttachments: [],
  });

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!attachments.canAddAttachment && profile != null && (postGroupIdNum == null || isNaN(postGroupIdNum))) {
      attachments.setUploadError("첨부는 아티스트 프로필 로드 후 가능합니다.");
      return;
    }
    attachments.addAttachment(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const gid = groupId ?? artistId;
    if (!gid) {
      router.push("/home");
      return;
    }
    setSubmitLoading(true);
    try {
      await request("/api/artist-posts", {
        method: "POST",
        body: {
          groupId: gid,
          title: "",
          content: content.trim(),
          isMembershipOnly: false,
          isNotice: false,
          mediaAssetIds: attachments.mediaAssetIds.length ? attachments.mediaAssetIds : null,
          representativeMediaAssetId: attachments.representativeMediaAssetId,
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

  // 아티스트 마이페이지에서 프로필 로드. groupId = 게시글이 소속될 팬페이지(그룹) ID.
  // 그룹 계정이면 본인 id, 소속 아티스트면 소속 그룹 id, 솔로 아티스트면 본인 id.
  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    setProfileError("");
    axios.get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => {
        const p = res.data?.profile;
        setProfile(p ?? null);
        if (p?.id != null) setArtistId(p.id);
        setGroupId(p?.groupId ?? p?.id ?? null);
      })
      .catch((err) => {
        setArtistId(null);
        setGroupId(null);
        setProfile(null);
        setProfileError(err?.response?.data?.message || "아티스트 프로필을 불러올 수 없습니다. 새 글 작성은 아티스트 계정에서 가능합니다.");
      });
  }, []);

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="size-10 rounded-full">
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
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">첨부 (이미지·영상 최대 5개, 목록 미리보기용 첫 장 표시)</span>
            {profileError && <p className="text-amber-400 text-xs mb-2">{profileError}</p>}
            {attachments.uploadError && <p className="text-red-400 text-xs mb-2">{attachments.uploadError}</p>}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleAttachmentChange} className="hidden" />
            {attachments.attachmentPreviews.length > 0 ? (
              <div className="space-y-3">
                {attachments.attachmentPreviews.map((p) => (
                  <div key={p.mediaAssetId} className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                    {p.isVideo ? (
                      <video src={p.url} controls className="w-full max-h-80 object-contain bg-black/20" />
                    ) : (
                      <img src={p.url} alt="미리보기" className="w-full max-h-80 object-contain bg-black/20" />
                    )}
                    <button type="button" onClick={() => attachments.removeAttachment(p.mediaAssetId)} className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
                {attachments.canAddAttachment && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={attachments.uploading} className="py-4 px-6 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-violet-500/40 text-sm disabled:opacity-50">
                    {attachments.uploading ? "업로드 중..." : "+ 추가"}
                  </button>
                )}
                {attachments.attachmentPreviews.length >= MAX_POST_ATTACHMENTS && <p className="text-white/50 text-xs">최대 {MAX_POST_ATTACHMENTS}개까지 첨부 가능합니다.</p>}
              </div>
            ) : (
              <button type="button" onClick={() => attachments.canAddAttachment && fileInputRef.current?.click()} disabled={!attachments.canAddAttachment || attachments.uploading} className="w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                <span className="text-sm font-bold">{profileError ? "프로필을 불러올 수 없음" : !postGroupIdNum ? "프로필 로딩 중…" : "이미지 또는 영상 추가 (최대 " + MAX_POST_ATTACHMENTS + "개)"}</span>
              </button>
            )}
          </div>
        </Surface>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => router.back()}>취소</Button>
          <Button type="submit" variant="primary" className="px-8 py-3" disabled={submitLoading}>
            {submitLoading ? "게시 중..." : "게시하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
