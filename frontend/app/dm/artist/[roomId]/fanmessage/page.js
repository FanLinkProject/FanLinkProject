"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { BASE_URL } from "@/lib/api";

/* JWT UTIL */
function parseJwtPayload(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "===".slice((base64.length + 3) % 4);

        return JSON.parse(
            decodeURIComponent(
                Array.prototype.map
                    .call(atob(padded), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            )
        );
    } catch (e) {
        return null;
    }
}

function getEmailFromTokenPayload(payload) {
    if (!payload) return "";
    return payload.email || payload.username || payload.sub || "";
}

// useSearchParams를 사용하는 컴포넌트를 분리
function FanMessageContent({ roomId }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const groupIndex = Number(searchParams.get("group"));

    const [tokenFromStorage, setTokenFromStorage] = useState("");
    const [messages, setMessages] = useState([]);
    const [fanMessages, setFanMessages] = useState([]);

    /* localStorage에서 토큰 로드 (마이페이지에서 로그인 후 이동) */
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.push("/login");
            return;
        }
        setTokenFromStorage(token);
    }, [router]);

    /* Token 분석 */
    const pureToken = useMemo(
        () => tokenFromStorage.trim().replace(/^Bearer\s+/i, ""),
        [tokenFromStorage]
    );
    const tokenPayload = useMemo(() => (pureToken ? parseJwtPayload(pureToken) : null), [pureToken]);
    const myEmail = useMemo(() => getEmailFromTokenPayload(tokenPayload), [tokenPayload]);

    const authHeaders = useMemo(
        () => (pureToken ? { Authorization: `Bearer ${pureToken}` } : {}),
        [pureToken]
    );

    /* 전체 메시지 다시 불러오기 */
    useEffect(() => {
        if (!pureToken) return;
        if (roomId == null) return;

        axios
            .get(`${BASE_URL}/api/chat/DM/artist/rooms/${roomId}/messages`, {
                headers: authHeaders,
            })
            .then((res) => {
                setMessages(res.data);

                const group = res.data[groupIndex];
                if (Array.isArray(group)) {
                    setFanMessages(group);
                } else {
                    setFanMessages([]);
                }
            })
            .catch((err) => console.log("[LOAD FAN MSG ERROR]", err));
    }, [pureToken, roomId, groupIndex]);

    return (
        <div className="p-8 lg:p-12 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
                💌 팬 메시지 모음
            </h2>

            <div className="rounded-2xl border border-white/[0.06] bg-[#201a33] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                {fanMessages.length === 0 && (
                    <p className="text-white/55 text-sm">팬 메시지가 없습니다.</p>
                )}

                <div className="space-y-4">
                    {fanMessages.map((msg) => (
                        <div key={msg.messageId} className="flex justify-start">
                            <div className="max-w-[70%] rounded-2xl rounded-bl-none border border-white/[0.06] bg-[#16102a] px-4 py-3 text-white/90">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-white/55 mb-1">
                                    {msg.senderNickName}
                                </div>
                                <div className="text-sm">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Suspense로 감싼 메인 컴포넌트
export default function FanMessagePage({ params }) {
    const resolvedParams = React.use(params);
    const roomId = resolvedParams?.roomId;
    
    return (
        <Suspense fallback={
            <div className="p-8 lg:p-12 max-w-5xl mx-auto">
                <div className="text-white/55">로딩 중...</div>
            </div>
        }>
            <FanMessageContent roomId={roomId} />
        </Suspense>
    );
}
