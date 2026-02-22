/**
 * 카카오맵 JS SDK 로더 (client 전용).
 * - autoload=false, libraries=services (Places 사용)
 * - 중복 로드 방지, script.onload 후 kakao.maps.load를 Promise로 감싸서 반환
 * @returns {Promise<typeof window.kakao>}
 */
let loadPromise = null;

export async function loadKakaoMap() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadKakaoMap is for client only"));
  }
  if (window.kakao?.maps?.load) {
    return new Promise((resolve) => {
      window.kakao.maps.load(() => resolve(window.kakao));
    });
  }
  if (loadPromise) return loadPromise;

  const key =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_KAKAO_MAP_JS_KEY
      ? process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY
      : "";

  if (!key) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_MAP_JS_KEY is not set")
    );
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("Kakao Maps SDK failed to load"));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Kakao Maps script"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
