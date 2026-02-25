"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

import { apiGet, getToken, normalizeToken, WS_CHAT_URL } from "@/lib/api";
import { publish, createManualReplay, publishManualReplay, getReplay, getCandidates, deleteReplay, ReplayAccessType } from "@/lib/replayApi";
import { useMediaUpload } from "@/lib/useMediaUpload";
import { MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";

export default function ArtistLivePage() {
    // --- artist context (현재 로그인 계정 = groupId 또는 본인 id) ---
    const [artistId, setArtistId] = useState(null);

    useEffect(() => {
        apiGet("/api/user/profile").then((p) => {
            const id = p?.groupId ?? p?.id;
            if (id != null) setArtistId(Number(id));
        }).catch(() => {});
    }, []);

    // --- live list (API) ---
    const [liveSessions, setLiveSessions] = useState([]);
    const [replayCandidates, setReplayCandidates] = useState([]);

    const [liveLoading, setLiveLoading] = useState(false);
    const [replayLoading, setReplayLoading] = useState(false);

    const [liveError, setLiveError] = useState("");
    const [replayError, setReplayError] = useState("");
    const [authError, setAuthError] = useState("");

    const fetchLiveData = useCallback(async () => {
        const numericArtistId = artistId != null ? Number(artistId) : NaN;
        if (Number.isNaN(numericArtistId) || numericArtistId < 1) {
            setLiveSessions([]);
            setReplayCandidates([]);
            setLiveLoading(false);
            setReplayLoading(false);
            setLiveError("");
            setReplayError("");
            return;
        }

        setAuthError("");
        setLiveError("");
        setReplayError("");
        setLiveLoading(true);
        setReplayLoading(true);

        const [liveResult, replayResult] = await Promise.allSettled([
            apiGet("/api/live-sessions", { query: { artistId: numericArtistId, status: "LIVE" } }),
            getCandidates(numericArtistId),
        ]);

        if (liveResult.status === "fulfilled") {
            const list = Array.isArray(liveResult.value) ? liveResult.value : [];
            setLiveSessions(list);
        } else {
            const e = liveResult.reason;
            console.error(e);
            if (e?.isAuth) setAuthError("로그인이 필요합니다.");
            else if (e?.isForbidden) setAuthError("권한이 없습니다.");
            setLiveSessions([]);
            setLiveError(e?.message || "진행 중 라이브를 불러오지 못했습니다.");
        }

        if (replayResult.status === "fulfilled") {
            const arr = Array.isArray(replayResult.value) ? replayResult.value : [];
            setReplayCandidates(arr);
        } else {
            const e = replayResult.reason;
            console.error(e);
            if (e?.isAuth) setAuthError("로그인이 필요합니다.");
            else if (e?.isForbidden) setAuthError("권한이 없습니다.");
            setReplayCandidates([]);
            setReplayError(e?.message || "다시보기 후보를 불러오지 못했습니다.");
        }

        setLiveLoading(false);
        setReplayLoading(false);
    }, [artistId]);

    useEffect(() => {
        if (artistId != null && !Number.isNaN(Number(artistId)) && Number(artistId) >= 1) {
            fetchLiveData();
        } else {
            setLiveLoading(false);
            setReplayLoading(false);
        }
    }, [artistId, fetchLiveData]);

    // --- LIVE_LIST_CHANGED -> refresh list (no polling) ---
    const fetchLiveDataRef = useRef(fetchLiveData);
    fetchLiveDataRef.current = fetchLiveData;

    useEffect(() => {
        const token = getToken();
        const pure = token ? normalizeToken(token).replace(/^Bearer\s+/i, "") : "";
        if (!pure) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_CHAT_URL),
            connectHeaders: { Authorization: `Bearer ${pure}` },
            onConnect: () => {
                client.subscribe("/sub/live/global", (frame) => {
                    try {
                        const parsed = JSON.parse(frame.body);
                        if (parsed?.event === "LIVE_LIST_CHANGED") {
                            fetchLiveDataRef.current?.();
                        }
                    } catch (_) {}
                });
            },
        });

        client.activate();
        return () => {
            try {
                client.deactivate();
            } catch (_) {}
        };
    }, []);

    const normalizedReplayCandidates = replayCandidates.filter(
        (c) => c && typeof c === "object"
    );

    // --- replay publish (Replay API) ---
    const [publishForm, setPublishForm] = useState({
        liveSessionId: "",
        accessType: ReplayAccessType.FREE,
        title: "",
        thumbnailMediaAssetId: null,
        thumbnailPreviewUrl: null,
    });

    const thumbnailPresignItem = {
        category: MediaAssetCategory.REPLAY_THUMBNAIL,
        scope: MediaAssetScope.PUBLIC,
        artistId: artistId ?? undefined,
        replayIdOrTemp: "tmp_publish",
    };
    const { upload: uploadThumbnail } = useMediaUpload(thumbnailPresignItem);

    const [publishing, setPublishing] = useState(false);
    const [publishedReplay, setPublishedReplay] = useState(null);
    const [publishError, setPublishError] = useState(null);

    // --- 다시보기 수동 업로드 (라이브 녹화 없이 직접 영상 업로드) ---
    const [manualStep, setManualStep] = useState("idle"); // idle | created | uploading | processing | ready | published
    const [manualReplay, setManualReplay] = useState(null);
    const [manualAccessType, setManualAccessType] = useState(ReplayAccessType.FREE);
    const [manualTitle, setManualTitle] = useState("");
    const [manualError, setManualError] = useState("");
    const [manualPublishing, setManualPublishing] = useState(false);
    const manualVideoPresignItem = manualReplay?.replayId
        ? {
            category: MediaAssetCategory.REPLAY_VIDEO,
            scope: MediaAssetScope.RESTRICTED,
            artistId: artistId ?? undefined,
            replayIdOrTemp: String(manualReplay.replayId),
        }
        : null;
    const { upload: uploadManualVideo } = useMediaUpload(manualVideoPresignItem ?? { category: MediaAssetCategory.REPLAY_VIDEO, scope: MediaAssetScope.RESTRICTED, artistId: artistId ?? undefined, replayIdOrTemp: "tmp_manual" });

    const handlePublish = async (e) => {
        e.preventDefault();

        const numericArtistId = artistId != null ? Number(artistId) : NaN;
        const liveSessionId = Number(publishForm.liveSessionId);
        if (Number.isNaN(numericArtistId) || numericArtistId < 1 || !liveSessionId) return;

        setPublishing(true);
        setPublishError(null);

        try {
            const res = await publish({
                artistId: numericArtistId,
                liveSessionId,
                accessType: publishForm.accessType,
                title: publishForm.title || null,
                thumbnailMediaAssetId: publishForm.thumbnailMediaAssetId || null,
            });

            setPublishedReplay(res);
            setPublishForm({
                liveSessionId: "",
                accessType: ReplayAccessType.FREE,
                title: "",
                thumbnailMediaAssetId: null,
                thumbnailPreviewUrl: null,
            });

            fetchLiveDataRef.current?.();
        } catch (e) {
            setPublishError(e?.data?.message || e?.message || "발행 실패");
        } finally {
            setPublishing(false);
        }
    };

    // 수동 업로드: 슬롯 생성
    const handleCreateManualSlot = async (e) => {
        e.preventDefault();
        const numericArtistId = artistId != null ? Number(artistId) : NaN;
        if (Number.isNaN(numericArtistId) || numericArtistId < 1) {
            setManualError("artistId를 확인해 주세요.");
            return;
        }
        setManualError("");
        try {
            const res = await createManualReplay({
                artistId: numericArtistId,
                accessType: manualAccessType,
                title: manualTitle.trim() || null,
            });
            setManualReplay({
                replayId: res.replayId,
                artistId: res.artistId,
                accessType: res.accessType,
                status: res.status,
                createdAt: res.createdAt,
            });
            setManualStep("created");
        } catch (e) {
            setManualError(e?.data?.message || e?.message || "슬롯 생성 실패");
        }
    };

    // 수동 업로드: 영상 파일 업로드 후 변환 대기
    const handleManualVideoUpload = async (e) => {
        const file = e?.target?.files?.[0];
        if (!file || !manualReplay?.replayId || !uploadManualVideo) return;
        setManualStep("uploading");
        setManualError("");
        try {
            await uploadManualVideo(file);
            setManualStep("processing");
        } catch (err) {
            setManualError(err?.message || "업로드 실패");
            setManualStep("created");
        }
        e.target.value = "";
    };

    // 수동 업로드: READY 상태 폴링
    useEffect(() => {
        if (manualStep !== "processing" || !manualReplay?.replayId) return;
        const interval = setInterval(async () => {
            try {
                const r = await getReplay(manualReplay.replayId);
                const status = r?.status;
                if (status === "READY") {
                    setManualReplay((prev) => (prev ? { ...prev, status: "READY" } : null));
                    setManualStep("ready");
                } else if (status === "REJECTED") {
                    setManualError("변환 실패");
                    setManualStep("created");
                }
            } catch (_) {}
        }, 4000);
        return () => clearInterval(interval);
    }, [manualStep, manualReplay?.replayId]);

    // 수동 업로드: 발행
    const handlePublishManual = async () => {
        if (!manualReplay?.replayId) return;
        setManualPublishing(true);
        setManualError("");
        try {
            await publishManualReplay(manualReplay.replayId);
            setManualStep("published");
        } catch (e) {
            setManualError(e?.data?.message || e?.message || "발행 실패");
        } finally {
            setManualPublishing(false);
        }
    };

    const resetManualFlow = () => {
        setManualStep("idle");
        setManualReplay(null);
        setManualTitle("");
        setManualError("");
    };

    return (
        <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <SectionTitle className="text-2xl font-bold">라이브 관리</SectionTitle>
                    <p className="text-sm text-white/55 font-medium mt-1">
                        라이브 스트리밍 일정을 관리하고 다시보기를 발행하세요.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        className="px-4 py-2 text-[10px] uppercase tracking-widest"
                        onClick={fetchLiveData}
                    >
                        새로고침
                    </Button>

                    <Link
                        href="/artist-console/live/create"
                        className={`px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
                            liveSessions.length > 0
                                ? "bg-white/10 text-white/40 cursor-not-allowed pointer-events-none"
                                : "bg-red-500/90 text-white hover:brightness-110"
                        }`}
                        aria-disabled={liveSessions.length > 0}
                    >
                        라이브 시작하기
                    </Link>
                </div>
            </header>

            {authError && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    {authError}
                </div>
            )}

            {/* 진행 중 라이브 */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-white/55 px-1">
                    진행 중 라이브
                </h2>

                {liveLoading ? (
                    <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
                        <p className="text-white/55 text-sm">불러오는 중...</p>
                    </div>
                ) : liveError && !authError ? (
                    <div className="py-4 px-4 rounded-2xl bg-red-500/10 border border-red-500/40">
                        <p className="text-xs text-red-200">{liveError}</p>
                    </div>
                ) : liveSessions.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
                        <p className="text-white/55 text-sm">
                            현재 진행 중인 라이브가 없습니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveSessions.map((live) => (
                            <Surface key={live.id} variant="card" className="overflow-hidden">
                                <div className="aspect-video relative overflow-hidden bg-white/5">
                                    <img
                                        src="https://picsum.photos/seed/live/800/450"
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/90 text-white">
                      LIVE
                    </span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-black/40 text-white/90">
                      {live.isPaid ? "유료 라이브" : "무료 라이브"}
                    </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h4 className="font-bold text-white truncate mb-2">
                                        {live.title ?? "라이브"}
                                    </h4>
                                    <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mb-4">
                                        {live.isPaid ? "멤버십 전용" : "전체 공개"}
                                    </p>

                                    <div className="flex gap-2">
                                        <Link
                                            href={`/artist-console/live/${live.id}`}
                                            className="flex-1 py-3 bg-[#201a33] border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors text-center"
                                        >
                                            라이브로 이동
                                        </Link>
                                    </div>
                                </div>
                            </Surface>
                        ))}
                    </div>
                )}
            </section>

            {/* 다시보기 발행 가능 목록 (자동녹화 포함) */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-white/55 px-1">
                    다시보기 발행 가능 목록
                </h2>

                {replayLoading ? (
                    <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
                        <p className="text-white/55 text-sm">불러오는 중...</p>
                    </div>
                ) : replayError && !authError ? (
                    <div className="py-4 px-4 rounded-2xl bg-red-500/10 border border-red-500/40">
                        <p className="text-xs text-red-200">{replayError}</p>
                    </div>
                ) : normalizedReplayCandidates.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
                        <p className="text-white/55 text-sm">
                            발행 가능한 다시보기가 없습니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {normalizedReplayCandidates.map((candidate) => {
                            const sid = candidate.liveSessionId ?? candidate.id;
                            const isSelected = String(publishForm.liveSessionId) === String(sid);

                            return (
                                <Surface
                                    key={sid}
                                    variant="card"
                                    className={`overflow-hidden transition-all ${isSelected ? "ring-2 ring-violet-500" : ""}`}
                                >
                                    <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-violet-900/40 to-fuchsia-900/30">
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-violet-500/80 text-white">
                                                발행 가능
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <h4 className="font-bold text-white truncate mb-1">라이브 다시보기</h4>
                                        <p className="text-[10px] text-white/50 mb-4">
                                            세션 #{sid} · {candidate.isPaid ? "유료" : "무료"}
                                            {candidate.endedAt && ` · ${new Date(candidate.endedAt).toLocaleDateString("ko-KR")}`}
                                        </p>
                                        <Button
                                            type="button"
                                            variant={isSelected ? "ghost" : "primary"}
                                            className="w-full py-3 text-[10px] uppercase tracking-widest"
                                            onClick={() => {
                                                setPublishForm((f) => ({ ...f, liveSessionId: String(sid) }));
                                                document.getElementById("replay-publish-section")?.scrollIntoView({ behavior: "smooth" });
                                            }}
                                        >
                                            {isSelected ? "선택됨" : "다시보기 발행"}
                                        </Button>
                                    </div>
                                </Surface>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* 다시보기 발행 (Replay API) */}
            <Surface id="replay-publish-section" variant="primary" className="p-8">
                <SectionTitle className="text-lg font-bold mb-1">다시보기 발행</SectionTitle>
                <p className="text-sm text-white/55 mb-6">녹화 완료된 라이브 세션을 다시보기로 발행합니다.</p>

                {publishError && <p className="text-red-400 text-sm mb-4">{publishError}</p>}
                {publishedReplay && (
                    <p className="text-green-400 text-sm mb-4">
                        발행 완료!{" "}
                        <Link href={`/replay/${publishedReplay.replayId}`} className="underline">시청하기</Link>
                    </p>
                )}

                {!publishForm.liveSessionId && (
                    <div className="py-8 text-center rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
                        <span className="material-symbols-outlined text-3xl text-white/20 mb-2 block">touch_app</span>
                        <p className="text-white/40 text-sm">위 목록에서 발행할 세션을 선택해 주세요</p>
                    </div>
                )}

                {publishForm.liveSessionId && (
                    <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
                        <span className="material-symbols-outlined text-violet-400">videocam</span>
                        <p className="text-violet-300 text-sm font-bold">세션 #{publishForm.liveSessionId} 선택됨</p>
                        <button
                            type="button"
                            onClick={() => setPublishForm((f) => ({ ...f, liveSessionId: "" }))}
                            className="ml-auto text-white/40 hover:text-white/70 text-xs"
                        >
                            선택 해제
                        </button>
                    </div>
                )}

                <form onSubmit={handlePublish} className="space-y-5 max-w-lg">
                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/55">제목</span>
                        <input
                            type="text"
                            maxLength={200}
                            value={publishForm.title}
                            onChange={(e) => setPublishForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="다시보기 제목을 입력하세요"
                            className="mt-2 w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/30"
                        />
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                        <div
                            className={`relative w-11 h-6 rounded-full transition-colors ${publishForm.accessType === ReplayAccessType.PAID ? "bg-violet-500" : "bg-white/15"}`}
                            onClick={() => setPublishForm((f) => ({ ...f, accessType: f.accessType === ReplayAccessType.PAID ? ReplayAccessType.FREE : ReplayAccessType.PAID }))}
                        >
                            <div className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${publishForm.accessType === ReplayAccessType.PAID ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-sm text-white/80 font-bold">
                            {publishForm.accessType === ReplayAccessType.PAID ? "유료 (멤버십 전용)" : "무료 (전체 공개)"}
                        </span>
                    </label>

                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/55">썸네일 (선택)</span>
                        <input type="file" accept="image/*" className="hidden" id="replay-thumbnail-input"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !file.type.startsWith("image/") || !uploadThumbnail) return;
                                const result = await uploadThumbnail(file);
                                if (result?.mediaAssetId && result?.url) {
                                    setPublishForm((f) => ({ ...f, thumbnailMediaAssetId: result.mediaAssetId, thumbnailPreviewUrl: result.url }));
                                }
                                e.target.value = "";
                            }}
                        />
                        {publishForm.thumbnailPreviewUrl ? (
                            <div className="mt-3 relative inline-block">
                                <img src={publishForm.thumbnailPreviewUrl} alt="썸네일" className="w-full max-w-xs rounded-xl border border-white/10 object-cover aspect-video" />
                                <button type="button" onClick={() => setPublishForm((f) => ({ ...f, thumbnailMediaAssetId: null, thumbnailPreviewUrl: null }))} className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors">&times;</button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => document.getElementById("replay-thumbnail-input")?.click()}
                                className="mt-3 w-full py-5 rounded-xl border-2 border-dashed border-white/15 text-white/50 hover:border-violet-500/40 hover:text-violet-300/70 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                                이미지 선택
                            </button>
                        )}
                    </div>

                    <Button type="submit" variant="primary" className="w-full py-4" disabled={publishing || !publishForm.liveSessionId}>
                        {publishing ? "발행 중..." : "발행"}
                    </Button>
                </form>
            </Surface>

            {/* 다시보기 수동 업로드 */}
            <Surface variant="primary" className="p-8">
                <SectionTitle className="text-lg font-bold mb-1">다시보기 수동 업로드</SectionTitle>
                <p className="text-sm text-white/55 mb-6">직접 녹화한 영상이나 행사·TV 출연 영상을 올려 다시보기로 발행할 수 있습니다.</p>

                {manualError && <p className="text-red-400 text-sm mb-4">{manualError}</p>}

                {manualStep === "idle" && (
                    <form onSubmit={handleCreateManualSlot} className="space-y-5 max-w-lg">
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/55">제목</span>
                            <input
                                type="text"
                                maxLength={200}
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                placeholder="다시보기 제목을 입력하세요"
                                className="mt-2 w-full bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/30"
                            />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                            <div
                                className={`relative w-11 h-6 rounded-full transition-colors ${manualAccessType === ReplayAccessType.PAID ? "bg-violet-500" : "bg-white/15"}`}
                                onClick={() => setManualAccessType((v) => v === ReplayAccessType.PAID ? ReplayAccessType.FREE : ReplayAccessType.PAID)}
                            >
                                <div className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${manualAccessType === ReplayAccessType.PAID ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                            </div>
                            <span className="text-sm text-white/80 font-bold">
                                {manualAccessType === ReplayAccessType.PAID ? "유료 (멤버십 전용)" : "무료 (전체 공개)"}
                            </span>
                        </label>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/55">썸네일 (선택)</span>
                            <input type="file" accept="image/*" className="hidden" id="manual-thumbnail-input"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !file.type.startsWith("image/") || !uploadThumbnail) return;
                                    const result = await uploadThumbnail(file);
                                    if (result?.mediaAssetId && result?.url) {
                                        setPublishForm((f) => ({ ...f, thumbnailMediaAssetId: result.mediaAssetId, thumbnailPreviewUrl: result.url }));
                                    }
                                    e.target.value = "";
                                }}
                            />
                            {publishForm.thumbnailPreviewUrl ? (
                                <div className="mt-3 relative inline-block">
                                    <img src={publishForm.thumbnailPreviewUrl} alt="썸네일" className="w-full max-w-xs rounded-xl border border-white/10 object-cover aspect-video" />
                                    <button type="button" onClick={() => setPublishForm((f) => ({ ...f, thumbnailMediaAssetId: null, thumbnailPreviewUrl: null }))} className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors">&times;</button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => document.getElementById("manual-thumbnail-input")?.click()}
                                    className="mt-3 w-full py-5 rounded-xl border-2 border-dashed border-white/15 text-white/50 hover:border-violet-500/40 hover:text-violet-300/70 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                                    이미지 선택
                                </button>
                            )}
                        </div>

                        <Button type="submit" variant="primary" className="w-full py-4">영상 업로드 시작</Button>
                    </form>
                )}

                {manualStep === "created" && manualReplay && (
                    <div className="space-y-4 max-w-lg">
                        <p className="text-white/70 text-sm">영상 파일을 선택해 업로드하세요.</p>
                        <label className="block w-full py-8 rounded-xl border-2 border-dashed border-white/15 text-white/50 hover:border-violet-500/40 hover:text-violet-300/70 text-sm font-bold transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                            <span>영상 파일 선택</span>
                            <input type="file" accept="video/*" className="hidden" onChange={handleManualVideoUpload} disabled={manualStep === "uploading"} />
                        </label>
                        {manualStep === "uploading" && <p className="text-white/55 text-sm">업로드 중...</p>}
                        <Button type="button" variant="ghost" className="text-xs" onClick={resetManualFlow}>취소</Button>
                    </div>
                )}

                {manualStep === "processing" && (
                    <div className="py-12 text-center space-y-3">
                        <div className="inline-block size-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-white/70 text-sm">영상 변환 중입니다. 잠시만 기다려 주세요.</p>
                    </div>
                )}

                {manualStep === "ready" && manualReplay && (
                    <div className="space-y-4 max-w-lg">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                            <span className="material-symbols-outlined text-green-400">check_circle</span>
                            <p className="text-green-400 text-sm font-bold">변환 완료. 발행하면 팬 페이지에 노출됩니다.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="primary" className="flex-1 py-4" onClick={handlePublishManual} disabled={manualPublishing}>
                                {manualPublishing ? "발행 중..." : "발행"}
                            </Button>
                            <Button type="button" variant="ghost" onClick={resetManualFlow}>취소</Button>
                        </div>
                    </div>
                )}

                {manualStep === "published" && manualReplay && (
                    <div className="space-y-4 max-w-lg">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                            <span className="material-symbols-outlined text-green-400">celebration</span>
                            <p className="text-green-400 text-sm font-bold">발행 완료!</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href={`/replay/${manualReplay.replayId}`} className="flex-1 py-3 bg-violet-500/90 text-white rounded-xl font-bold text-sm text-center hover:brightness-110 transition-all">시청하기</Link>
                            <Button type="button" variant="ghost" onClick={resetManualFlow}>새로 올리기</Button>
                        </div>
                    </div>
                )}
            </Surface>
        </div>
    );
}
