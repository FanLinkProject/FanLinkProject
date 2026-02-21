/**
 * 프로필 이미지가 없을 때 닉네임 첫 글자를 보여주는 기본 아바타 data URI 생성
 * @param {string} [nickname] - 유저 닉네임 (예: "FAN_ALL" → "F")
 * @returns {string} data URI SVG
 */
export function getDefaultAvatarUrl(nickname) {
  let letter = "?";
  if (nickname && typeof nickname === "string" && nickname.trim().length > 0) {
    letter = nickname.trim()[0].toUpperCase();
    letter = letter.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="%234b5563" cx="50" cy="50" r="50"/><text x="50" y="58" font-size="44" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-weight="600">${letter}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
