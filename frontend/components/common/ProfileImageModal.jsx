"use client";

import { useState, useRef, useCallback } from "react";
import { useMediaUpload } from "@/lib/useMediaUpload";
import { MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";
import { BASE_URL, getAuthHeaders, request } from "@/lib/api";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";

/**
 * 프로필 이미지 변경 모달 (팬/아티스트 공용).
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string|null} currentImageUrl - 현재 프로필 이미지
 * @param {"fan"|"artist"} mode - 팬: PUT /api/user/profile, 아티스트: PATCH /api/artist/profile
 * @param {string} nickname - 팬 모드에서 필요
 * @param {Function} onSuccess - (newUrl) => void
 */
export default function ProfileImageModal({
  isOpen,
  onClose,
  currentImageUrl,
  mode = "fan",
  nickname = "",
  onSuccess,
}) {
  const [mediaAssetId, setMediaAssetId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const presignItem = {
    category: MediaAssetCategory.PROFILE_IMAGE,
    scope: MediaAssetScope.PUBLIC,
  };
  const { upload, loading: uploading } = useMediaUpload(presignItem);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e?.target?.files?.[0];
      if (!file || !file.type.startsWith("image/") || !upload) return;
      setMessage("");
      const result = await upload(file);
      if (result?.mediaAssetId && result?.url) {
        setMediaAssetId(result.mediaAssetId);
        setPreviewUrl(result.url);
      }
      e.target.value = "";
    },
    [upload],
  );

  const handleSave = useCallback(async () => {
    if (!mediaAssetId) return;
    setSaving(true);
    setMessage("");
    try {
      if (mode === "artist") {
        await request("/api/artist/profile", {
          method: "PATCH",
          body: { profileImageMediaAssetId: mediaAssetId },
        });
      } else {
        const headers = getAuthHeaders();
        await axios.put(
          `${BASE_URL}/api/user/profile`,
          { nickname, profileImageMediaAssetId: mediaAssetId },
          { headers },
        );
      }
      onSuccess?.(previewUrl);
      handleClose();
    } catch (e) {
      setMessage(
        e?.response?.data?.message ?? e?.data?.message ?? e?.message ?? "저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }, [mediaAssetId, mode, nickname, previewUrl, onSuccess]);

  const handleClose = useCallback(() => {
    setMediaAssetId(null);
    setPreviewUrl(null);
    setMessage("");
    onClose?.();
  }, [onClose]);

  if (!isOpen) return null;

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <Surface
        variant="primary"
        className="w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">프로필 이미지 변경</h3>
          <button
            type="button"
            onClick={handleClose}
            className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-5">
          {/* 현재/미리보기 이미지 */}
          <div className="relative group">
            <div className="size-32 rounded-full overflow-hidden border-2 border-white/[0.08] bg-[#201a33]">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-white/20">
                    person
                  </span>
                </div>
              )}
            </div>
            {previewUrl && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-violet-600 text-[9px] font-bold text-white">
                미리보기
              </span>
            )}
          </div>

          {/* 파일 선택 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">
              add_photo_alternate
            </span>
            <span className="text-sm font-bold">
              {uploading ? "업로드 중..." : "새 이미지 선택"}
            </span>
          </button>

          {message && (
            <p className="text-xs text-red-400 text-center">{message}</p>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="ghost"
              className="flex-1 py-3 text-sm"
              onClick={handleClose}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-3 text-sm"
              onClick={handleSave}
              disabled={saving || uploading || !mediaAssetId}
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
