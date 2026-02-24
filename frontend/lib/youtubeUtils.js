/**
 * YouTube URL 유틸.
 * embed/short URL → watch URL 변환으로 새 탭 열기 시 153 오류 방지.
 */

/**
 * @param {string | null | undefined} url
 * @returns {string | null} watch URL 또는 null
 */
export function toYouTubeWatchUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
  if (/youtube\.com\/watch\?/i.test(trimmed)) return trimmed;
  return null;
}
