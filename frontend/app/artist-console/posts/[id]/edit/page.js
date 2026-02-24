"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { usePostAttachments } from "@/lib/usePostAttachments";
import { MAX_POST_ATTACHMENTS } from "@/lib/mediaAssetApi";

function EditPostContent() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : null;
  const numericId = Number(id);

  const [isIndividualArtist, setIsIndividualArtist] = useState(false);
  const [content, setContent] = useState("");
  const [isMembershipOnly, setIsMembershipOnly] = useState(false);
  const [isNotice, setIsNotice] = useState(false);
  const [canSetNotice, setCanSetNotice] = useState(false);
  const [writerNickname, setWriterNickname] = useState("");
  const [writerAvatar, setWriterAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [groupId, setGroupId] = useState(null);
  const fileInputRef = useRef(null);

  const postGroupId = groupId;
  const attachments = usePostAttachments({
    postGroupId,
    postIdOrTemp: numericId,
    initialAttachments: [],
  });

  // 기존 게시물 로드
  useEffect(() => {
    if (!numericId || isNaN(numericId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    request(`/api/artist-posts/${numericId}`)
      .then((data) => {
        setContent(data.content || "");
        setIsMembershipOnly(data.isMembershipOnly ?? false);
        setIsNotice(!!data.isNotice);
        setWriterNickname(data.writerNickname || "");
        setWriterAvatar(data.writerProfileImageUrl || "");
        attachments.setAttachmentsFromApi(data.attachments || []);
        setCanSetNotice(!!data.canSetNotice);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [numericId]);

  // 개인 아티스트 여부 (공지 토글 노출용)
  useEffect(() => {
    request("/api/user/profile")
      .then((data) => {
        const role = (data.role || "").replace("ROLE_", "");
        const gid = data.groupId ?? data.id;
        setIsIndividualArtist(role === "ARTIST" && gid === data.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    request("/api/user/profile").then((d) => setGroupId(d?.groupId ?? d?.id ?? null)).catch(() => {});
  }, []);

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) attachments.addAttachment(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitLoading) return;
    setSubmitLoading(true);
    try {
      await request(`/api/artist-posts/${numericId}`, {
        method: "PUT",
        body: {
          title: "",
          content: content.trim(),
          isMembershipOnly,
          isNotice,
          mediaAssetIds: attachments.mediaAssetIds,
          representativeMediaAssetId: attachments.representativeMediaAssetId,
        },
      });
      router.push("/artist-console/posts");
    } catch (err) {
      console.error("수정 실패", err);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-3xl mx-auto">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  if (notFound) {
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
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="size-10 rounded-full"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">글 수정</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            게시물 내용을 수정하세요.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Surface variant="primary" className="p-8">
          {/* 작성자 정보 */}
          {writerAvatar && (
            <div className="flex items-center gap-4 mb-6">
              <img
                src={writerAvatar}
                className="size-12 rounded-full border border-white/[0.08]"
                alt=""
              />
              <div>
                <p className="font-bold text-white">{writerNickname}</p>
                <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                  Official Artist
                </p>
              </div>
            </div>
          )}

          {/* 내용 */}
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
              내용
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="팬들에게 전할 말을 적어주세요."
              className="w-full min-h-[200px] bg-[#16102a] border border-white/[0.08] rounded-2xl p-4 text-white placeholder:text-white/40 font-medium outline-none focus:ring-2 focus:ring-violet-500/20 resize-y"
              required
            />
          </label>

          {/* 멤버십 전용 토글 */}
          <label className="flex items-center gap-3 mt-5 cursor-pointer w-fit">
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isMembershipOnly ? "bg-violet-500" : "bg-white/[0.12]"
              }`}
              onClick={() => setIsMembershipOnly((v) => !v)}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                  isMembershipOnly ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm font-bold text-white/70">멤버십 전용</span>
            {isMembershipOnly && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">
                멤버 한정
              </span>
            )}
          </label>

          {/* 공지사항 토글 (개인 아티스트만) */}
          {isIndividualArtist && (
            <label className="flex items-center gap-3 mt-5 cursor-pointer w-fit">
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  isNotice ? "bg-violet-500" : "bg-white/[0.12]"
                }`}
                onClick={() => setIsNotice((v) => !v)}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                    isNotice ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-sm font-bold text-white/70">공지사항</span>
              {isNotice && (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">
                  공지로 노출
                </span>
              )}
            </label>
          )}

          {/* 첨부 (최대 5개, 미리보기 첫 장으로 목록 노출) */}
          <div className="mt-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">
              첨부 (이미지·영상 최대 {MAX_POST_ATTACHMENTS}개, 목록 미리보기 첫 장)
            </span>
            {attachments.uploadError && (
              <p className="text-red-400 text-sm mb-2">{attachments.uploadError}</p>
            )}
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
          <Button
            type="submit"
            variant="primary"
            className="px-8 py-3"
            disabled={submitLoading || !content.trim()}
          >
            {submitLoading ? "저장 중..." : "수정 완료"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditPostPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/55">로딩 중...</div>}>
      <EditPostContent />
    </Suspense>
  );
}
