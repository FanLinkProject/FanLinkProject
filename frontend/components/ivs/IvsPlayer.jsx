"use client";

import React, { useRef, useEffect, useState } from "react";

const IVS_PLAYER_SCRIPT = "https://player.live-video.net/1.40.0/amazon-ivs-player.min.js";

/**
 * Amazon IVS 라이브 스트림 플레이어.
 * @param {string} playbackUrl - IVS 재생 URL (백엔드 playback-token 응답에서 제공)
 * @param {string} token - Playback Authorization 토큰 (있으면 전달)
 * @param {string} className - 컨테이너 클래스
 * @param {object} videoProps - video 엘리먼트에 넘길 props
 */
export default function IvsPlayer({ playbackUrl, token, className = "", videoProps = {} }) {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const [error, setError] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || window.IVSPlayer) {
            setScriptLoaded(!!window.IVSPlayer);
            return;
        }
        const script = document.createElement("script");
        script.src = IVS_PLAYER_SCRIPT;
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => setError("IVS 플레이어 로드 실패");
        document.head.appendChild(script);
        return () => {
            script.remove();
        };
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !playbackUrl || !containerRef.current || !videoRef.current) return;

        setError(null);
        try {
            const IVSPlayer = window.IVSPlayer;
            if (!IVSPlayer) return;

            if (playerRef.current) {
                try {
                    playerRef.current.delete();
                } catch (_) {}
                playerRef.current = null;
            }

            const player = IVSPlayer.create();
            player.attachHTMLVideoElement(videoRef.current);

            // IVS Playback Authorization: 토큰은 URL 쿼리로 전달 (AWS 공식 문서)
            // https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/private-channels-generate-tokens.html
            const urlToLoad = token
                ? `${playbackUrl}${playbackUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
                : playbackUrl;

            player.load(urlToLoad);
            // IVS Player play() returns void (not Promise). Errors are handled via PlayerEventType.ERROR listener.
            player.play();

            playerRef.current = player;

            return () => {
                try {
                    player.delete();
                } catch (_) {}
                playerRef.current = null;
            };
        } catch (e) {
            setError(e?.message || "재생 시작 실패");
        }
    }, [scriptLoaded, playbackUrl, token]);

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-black aspect-video ${className}`}>
                <p className="text-white/70 text-sm">{error}</p>
            </div>
        );
    }

    if (!playbackUrl) {
        return (
            <div className={`flex items-center justify-center bg-black aspect-video ${className}`}>
                <p className="text-white/50 text-sm">재생 URL 대기 중...</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative w-full bg-black ${className}`}>
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                muted={false}
                controls
                {...videoProps}
            />
        </div>
    );
}
