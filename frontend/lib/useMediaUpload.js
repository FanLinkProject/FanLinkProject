/**
 * Presigned PUT 업로드 플로우 훅 (media_asset 도메인).
 * presign → S3 PUT → complete 한 번에 처리.
 * 게시물 이미지/영상, 커버, 다시보기, 상품 이미지 등에 사용.
 */
import { useState, useCallback } from "react";
import { uploadFile } from "@/lib/mediaAssetApi";

/**
 * @param {object} presignItem - presign 요청 시 넘길 item (category, scope, artistId, postIdOrTemp 등)
 *   - category: PROFILE_IMAGE | ARTIST_COVER_IMAGE | POST_IMAGE | POST_VIDEO | REPLAY_VIDEO | REPLAY_THUMBNAIL | PRODUCT_IMAGE | PRODUCT_DESCRIBE_IMAGE | CONCERT_POSTER
 *   - scope: PUBLIC | RESTRICTED
 *   - artistId (temp 사용 시 필수), postIdOrTemp, replayIdOrTemp, productIdOrTemp
 *   - attachmentCountInPost, attachmentCountInProduct (해당 시 필수)
 *   - durationSecondsRequested (video 시 필수)
 * @returns {{ upload: (file: File) => Promise<...>, loading: boolean, error: string | null }}
 */
export function useMediaUpload(presignItem) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(
    async (file) => {
      if (!file || !presignItem) return null;
      setLoading(true);
      setError(null);
      try {
        const result = await uploadFile(file, presignItem);
        if (result.status !== "READY") {
          setError(result.errorCode || result.status || "업로드 검증 실패");
          return null;
        }
        return result;
      } catch (e) {
        const msg = e?.data?.message || e.message || "업로드 실패";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [presignItem],
  );

  return { upload, loading, error };
}
