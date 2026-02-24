/**
 * 게시물 첨부(이미지·영상 최대 5개) 공통 훅.
 * presign → S3 PUT → complete 후 mediaAssetIds/attachmentPreviews 유지.
 * 사용처: posts/new, posts/[id]/edit, artist-console/posts/[id]/edit
 */
import { useState, useCallback } from "react";
import { uploadFile, MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";
import { MAX_POST_ATTACHMENTS, POST_VIDEO_DURATION_SECONDS } from "@/lib/mediaAssetApi";

/**
 * @param {object} opts
 * @param {number | string | null} opts.postGroupId - artistId/groupId (presign 필수)
 * @param {string | number | null} opts.postIdOrTemp - "tmp_new" | "tmp_edit" | 실제 postId
 * @param {Array<{ mediaAssetId: number; url: string; isVideo?: boolean }>} [opts.initialAttachments] - 수정 시 기존 첨부
 */
export function usePostAttachments({ postGroupId, postIdOrTemp, initialAttachments = [] }) {
  const [mediaAssetIds, setMediaAssetIds] = useState(() =>
    initialAttachments.map((a) => a.mediaAssetId).filter(Boolean)
  );
  const [attachmentPreviews, setAttachmentPreviews] = useState(() =>
    initialAttachments.map((a) => ({
      mediaAssetId: a.mediaAssetId,
      url: a.url,
      isVideo: a.isVideo,
    }))
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const groupIdNum = postGroupId != null ? Number(postGroupId) : null;
  const canAdd = groupIdNum != null && !isNaN(groupIdNum) && mediaAssetIds.length < MAX_POST_ATTACHMENTS;

  const addAttachment = useCallback(
    async (file) => {
      if (!file || !canAdd) return;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        setUploadError("이미지 또는 영상 파일만 첨부할 수 있습니다.");
        return;
      }
      setUploadError("");
      setUploading(true);
      try {
        const postIdStr =
          postIdOrTemp != null && String(postIdOrTemp).trim() !== "" && !String(postIdOrTemp).startsWith("tmp_")
            ? String(postIdOrTemp)
            : typeof postIdOrTemp === "string"
              ? postIdOrTemp
              : "tmp_edit";
        const presignItem = {
          category: isVideo ? MediaAssetCategory.POST_VIDEO : MediaAssetCategory.POST_IMAGE,
          scope: MediaAssetScope.PUBLIC,
          artistId: groupIdNum,
          postIdOrTemp: postIdStr,
          attachmentCountInPost: mediaAssetIds.length + 1,
        };
        if (isVideo) presignItem.durationSecondsRequested = POST_VIDEO_DURATION_SECONDS;
        const result = await uploadFile(file, presignItem);
        if (result?.status === "READY" && result?.mediaAssetId && result?.url) {
          setMediaAssetIds((prev) => [...prev, result.mediaAssetId]);
          setAttachmentPreviews((prev) => [
            ...prev,
            { mediaAssetId: result.mediaAssetId, url: result.url, isVideo },
          ]);
        } else {
          setUploadError(result?.errorCode || "업로드 검증 실패");
        }
      } catch (err) {
        const msg = err?.data?.message || err?.message || "업로드 실패";
        setUploadError(msg);
        console.error("[게시글 첨부 업로드 실패]", err);
      } finally {
        setUploading(false);
      }
    },
    [canAdd, groupIdNum, mediaAssetIds.length, postIdOrTemp]
  );

  const removeAttachment = useCallback((mediaAssetId) => {
    setMediaAssetIds((prev) => prev.filter((id) => id !== mediaAssetId));
    setAttachmentPreviews((prev) => prev.filter((p) => p.mediaAssetId !== mediaAssetId));
  }, []);

  const setAttachmentsFromApi = useCallback((attachments) => {
    const list = attachments || [];
    setMediaAssetIds(list.map((a) => a.mediaAssetId).filter(Boolean));
    setAttachmentPreviews(
      list.map((a) => ({
        mediaAssetId: a.mediaAssetId,
        url: a.url,
        isVideo: a.contentType?.startsWith?.("video/"),
      }))
    );
  }, []);

  const setRepresentative = useCallback((mediaAssetId) => {
    setMediaAssetIds((prev) => {
      const idx = prev.indexOf(mediaAssetId);
      if (idx <= 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      next.unshift(mediaAssetId);
      return next;
    });
    setAttachmentPreviews((prev) => {
      const idx = prev.findIndex((p) => p.mediaAssetId === mediaAssetId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }, []);

  const resetAttachments = useCallback(() => {
    setMediaAssetIds([]);
    setAttachmentPreviews([]);
    setUploading(false);
    setUploadError("");
  }, []);

  return {
    mediaAssetIds,
    attachmentPreviews,
    addAttachment,
    removeAttachment,
    setRepresentative,
    setAttachmentsFromApi,
    resetAttachments,
    canAddAttachment: canAdd,
    uploading,
    uploadError,
    setUploadError,
    representativeMediaAssetId: mediaAssetIds[0] ?? null,
  };
}
