/**
 * Media Asset 도메인 API (Presigned PUT 업로드 파이프라인).
 * - POST /api/media-assets/presign  → uploadUrl, objectKey, requiredHeaders
 * - PUT  uploadUrl (S3 직접)          → requiredHeaders 그대로 사용
 * - POST /api/media-assets/complete → objectKey만 전달, 검증 후 url 반환
 *
 * 카테고리: PROFILE_IMAGE, ARTIST_COVER_IMAGE, POST_IMAGE, POST_VIDEO,
 *           REPLAY_VIDEO, REPLAY_THUMBNAIL, PRODUCT_IMAGE, PRODUCT_DESCRIBE_IMAGE, CONCERT_POSTER
 * 스코프: PUBLIC, RESTRICTED (RESTRICTED는 ARTIST만)
 */
import { BASE_URL, normalizeToken, request } from "@/lib/api";

export const MediaAssetCategory = {
  PROFILE_IMAGE: "PROFILE_IMAGE",
  ARTIST_COVER_IMAGE: "ARTIST_COVER_IMAGE",
  POST_IMAGE: "POST_IMAGE",
  POST_VIDEO: "POST_VIDEO",
  REPLAY_VIDEO: "REPLAY_VIDEO",
  REPLAY_THUMBNAIL: "REPLAY_THUMBNAIL",
  PRODUCT_IMAGE: "PRODUCT_IMAGE",
  PRODUCT_DESCRIBE_IMAGE: "PRODUCT_DESCRIBE_IMAGE",
  CONCERT_POSTER: "CONCERT_POSTER",
};

export const MediaAssetScope = { PUBLIC: "PUBLIC", RESTRICTED: "RESTRICTED" };

export const MediaAssetStatus = {
  INITIATED: "INITIATED",
  READY: "READY",
  REJECTED: "REJECTED",
  ORPHAN: "ORPHAN",
  DELETED: "DELETED",
};

/**
 * Presign 요청 (배치)
 * @param {Array<{
 *   category: string;
 *   scope: string;
 *   artistId?: number;
 *   contentType: string;
 *   sizeBytes: number;
 *   durationSecondsRequested?: number;
 *   ext: string;
 *   postIdOrTemp?: string;
 *   replayIdOrTemp?: string;
 *   productIdOrTemp?: string;
 *   concertIdOrTemp?: string;
 *   attachmentCountInPost?: number;
 *   attachmentCountInProduct?: number;
 * }>} items
 * @returns {Promise<{ items: Array<{ objectKey: string; uploadUrl: string; expiresAt: string; requiredHeaders: Record<string, string> }> }>}
 */
export function presign(items) {
  return request("/api/media-assets/presign", {
    method: "POST",
    body: { items },
  });
}

/**
 * Complete 요청 (배치) - S3 업로드 완료 후 서버에 통보
 * @param {Array<{ objectKey: string }>} items
 * @returns {Promise<{ items: Array<{ mediaAssetId: number; objectKey: string; status: string; url: string | null; reason: string | null; actualContentType: string; actualSizeBytes: number; errorCode: string | null }> }>}
 */
export function complete(items) {
  return request("/api/media-assets/complete", {
    method: "POST",
    body: { items },
  });
}

/**
 * 단일 파일 업로드 플로우: presign → S3 PUT → complete
 * @param {File} file
 * @param {object} presignItem - presign 요청 item (category, scope, artistId, postIdOrTemp 등)
 * @returns {Promise<{ mediaAssetId: number; objectKey: string; status: string; url: string | null; errorCode?: string }>}
 */
export async function uploadFile(file, presignItem) {
  const item = {
    ...presignItem,
    contentType: file.type,
    sizeBytes: file.size,
    ext:
      (file.name.split(".").pop() || "bin")
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "") || "bin",
  };
  if (
    file.type.startsWith("video/") &&
    presignItem.durationSecondsRequested != null
  ) {
    item.durationSecondsRequested = presignItem.durationSecondsRequested;
  }
  const { items: presignResults } = await presign([item]);
  const { objectKey, uploadUrl, requiredHeaders } = presignResults[0];

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: requiredHeaders || { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status}`);
  }

  const { items: completeResults } = await complete([{ objectKey }]);
  const result = completeResults[0];
  return {
    mediaAssetId: result.mediaAssetId,
    objectKey: result.objectKey,
    status: result.status,
    url: result.url,
    errorCode: result.errorCode,
  };
}
