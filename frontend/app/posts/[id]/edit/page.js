"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { BASE_URL, request, getAuthHeaders } from "@/lib/api";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { usePostAttachments } from "@/lib/usePostAttachments";
import { MAX_POST_ATTACHMENTS } from "@/lib/mediaAssetApi";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : null;
  const [profile, setProfile] = useState(null);
  const [artistId, setArtistId] = useState(null);
  const [post, setPost] = useState(null);
  const [postLoaded, setPostLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [groupId, setGroupId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const fileInputRef = useRef(null);

  const postGroupId = groupId ?? artistId;
  const attachments = usePostAttachments({
    postGroupId,
    postIdOrTemp: id,
    initialAttachments: [],
  });

  useEffect(() => {
    if (!id) return;
    setPostLoaded(false);
    request(`/api/artist-posts/${id}`)
      .then((data) => {
        setPost(data);
        setContent(data?.content ?? "");
        attachments.setAttachmentsFromApi(data?.attachments ?? []);
      })
      .catch(() => setPost(null))
      .finally(() => setPostLoaded(true));
  }, [id]);

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) attachments.addAttachment(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitLoading(true);
    try {
      await request(`/api/artist-posts/${id}`, {
        method: "PUT",
        body: {
          title: "",
          content: content.trim(),
          isMembershipOnly: false,
          isNotice: false,
          mediaAssetIds: attachments.mediaAssetIds,
          representativeMediaAssetId: attachments.representativeMediaAssetId,
        },
      });
      router.back();
    } catch (err) {
      console.error(err);
      alert(err?.data?.message ?? err?.message ?? "수정에 실패했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => {
        const p = res.data?.profile;
        if (p?.id != null) setArtistId(p.id);
        setGroupId(p?.groupId ?? p?.id ?? null);
        setProfile(p ?? null);
      })
      .catch(() => { setArtistId(null); setProfile(null); setGroupId(null); });
  }, []);

  if (id && !postLoaded) {
    return (
      <div className="p-8 lg:p-12 max-w-3xl mx-auto">
        <p className="text-white/55">불러오는 중...</p>
      </div>
    );
  }
  if (id && postLoaded && !post) {
    return (
      <div className="p-8 lg:p-12 max-w-3xl mx-auto">
        <p className="text-white/55">게시물을 찾을 수 없습니다.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="size-10 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">글 수정</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">게시물 내용을 수정하세요.</p>
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="팬들에게 전할 말을 적어주세요."
              className="w-full min-h-[200px] bg-[#16102a] border border-white/[0.08] rounded-2xl p-4 text-white placeholder:text-white/40 font-medium outline-none focus:ring-2 focus:ring-violet-500/20 resize-y"
              required
            />
          </label>

          <div className="mt-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">첨부 (이미지·영상 최대 {MAX_POST_ATTACHMENTS}개, 목록 미리보기 첫 장)</span>
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
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="py-4 px-6 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-violet-500/40 text-sm">+ 추가</button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => attachments.canAddAttachment && fileInputRef.current?.click()} disabled={!attachments.canAddAttachment} className="w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                <span className="text-sm font-bold">{!postGroupId ? "프로필 로딩 중…" : "이미지 또는 영상 추가 (최대 " + MAX_POST_ATTACHMENTS + "개)"}</span>
              </button>
            )}
          </div>
        </Surface>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" variant="primary" className="px-8 py-3" disabled={submitLoading}>
            {submitLoading ? "저장 중..." : "수정 완료"}
          </Button>
        </div>
      </form>
    </div>
  );
}
