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

/** 게시물 첨부 최대 개수 */
export const MAX_POST_ATTACHMENTS = 5;
/** presign 시 영상 최대 길이(초) 요청값 */
export const POST_VIDEO_DURATION_SECONDS = 600;

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
  const rawExt = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/gi, "") || "bin";
  const contentType = (file.type && file.type.trim()) || (file.name.match(/\.(png|jpe?g|gif|webp)$/i) ? "image/png" : "application/octet-stream");
  const item = {
    ...presignItem,
    contentType,
    sizeBytes: file.size,
    ext: rawExt,
  };
  if (
    file.type.startsWith("video/") &&
    presignItem.durationSecondsRequested != null
  ) {
    item.durationSecondsRequested = presignItem.durationSecondsRequested;
  }
  let presignResults;
  try {
    const res = await presign([item]);
    presignResults = res.items;
  } catch (e) {
    const msg = e?.data?.message || e?.message || "presign 실패";
    throw new Error(`Presign: ${msg}`);
  }
  if (!presignResults?.[0]) throw new Error("Presign 응답이 비어 있습니다.");
  const { objectKey, uploadUrl, requiredHeaders } = presignResults[0];

  // requiredHeaders에서 서명된 헤더를 구성 (Content-Type 포함)
  const putHeaders = {};
  if (requiredHeaders && typeof requiredHeaders === "object") {
    for (const [k, v] of Object.entries(requiredHeaders)) {
      if (k.toLowerCase() !== "host") {
        putHeaders[k] = v;
      }
    }
  }
  if (!putHeaders["Content-Type"] && !putHeaders["content-type"]) {
    putHeaders["Content-Type"] = contentType;
  }

  // File 객체를 Blob으로 변환하여 브라우저가 자동으로 Content-Type을 추가하는 것을 방지
  const blob = new Blob([file], { type: putHeaders["Content-Type"] || contentType });

  let putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: putHeaders,
    body: blob,
  });
  // 403 재시도: Content-Type 없이 순수 바이너리로 전송
  if (putRes.status === 403) {
    const rawBlob = new Blob([file]);
    putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: rawBlob,
    });
  }
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(`S3 업로드 실패 (${putRes.status})${text ? `: ${text.slice(0, 80)}` : ""}`);
  }

  let completeResults;
  try {
    const res = await complete([{ objectKey }]);
    completeResults = res.items;
  } catch (e) {
    const msg = e?.data?.message || e?.message || "complete 실패";
    throw new Error(`Complete: ${msg}`);
  }
  const result = completeResults?.[0];
  if (!result) throw new Error("Complete 응답이 비어 있습니다.");
  return {
    mediaAssetId: result.mediaAssetId,
    objectKey: result.objectKey,
    status: result.status,
    url: result.url,
    errorCode: result.errorCode,
  };
}
