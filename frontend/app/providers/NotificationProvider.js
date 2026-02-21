"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";

import { BASE_URL } from "@/lib/api";

const NotificationContext = createContext(null);
const API_BASE = `${BASE_URL}/api/notifications`;

export function NotificationProvider({ children }) {
    const pathname = usePathname();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const abortRef = useRef(null);
    const reconnectRef = useRef(null);
    const mountedRef = useRef(true);

    /* ===== 초기 unread 개수 로드 ===== */
    const fetchUnreadCount = useCallback(async () => {
        const token = localStorage.getItem("accessToken");
        const pure = token?.replace(/^Bearer\s+/i, "").trim();
        if (!pure) return;

        try {
            const res = await axios.get(`${API_BASE}/unread`, {
                headers: { Authorization: `Bearer ${pure}` },
            });
            setUnreadCount(res.data?.length || 0);
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem("accessToken");
            }
            setUnreadCount(0);
        }
    }, []);

    /* ===== SSE 구독 ===== */
    useEffect(() => {
        mountedRef.current = true;

        const connectSSE = async () => {
            const token = localStorage.getItem("accessToken");
            const pure = token?.replace(/^Bearer\s+/i, "").trim();
            if (!pure || !mountedRef.current) return;

            abortRef.current = new AbortController();
            let skipReconnect = false;

            try {
                const res = await fetch(`${API_BASE}/subscribe`, {
                    headers: { Authorization: `Bearer ${pure}` },
                    signal: abortRef.current.signal,
                });

                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("accessToken");
                    skipReconnect = true;
                    return;
                }
                if (!res.ok || !res.body) throw new Error("SSE 실패");

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (mountedRef.current) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const events = buffer.split("\n\n");
                    buffer = events.pop() || "";

                    events.forEach(handleEvent);
                }
            } catch (e) {
                if (!mountedRef.current) return;
            } finally {
                if (mountedRef.current && !skipReconnect) {
                    reconnectRef.current = setTimeout(connectSSE, 3000);
                }
            }
        };

        const handleEvent = async (raw) => {
            let type = null;
            let data = "";

            raw.split("\n").forEach((line) => {
                if (line.startsWith("event:")) {
                    type = line.replace("event:", "").trim();
                }
                if (line.startsWith("data:")) {
                    data += line.replace("data:", "").trim();
                }
            });

            if (type !== "notification" || !data) return;

            try {
                const parsed = JSON.parse(data);

                setNotifications((prev) => {
                    if (prev.some((n) => n.id === parsed.id)) return prev;
                    return [parsed, ...prev];
                });

                // ✅ unreadCount는 서버 기준으로 다시 동기화
                await fetchUnreadCount();
            } catch (e) {
                console.error("[SSE] 파싱 실패", e);
            }
        };

        const token = localStorage.getItem("accessToken");
        const pure = token?.replace(/^Bearer\s+/i, "").trim();
        if (pure) {
            fetchUnreadCount();
            connectSSE();
        }

        return () => {
            mountedRef.current = false;
            abortRef.current?.abort();
            clearTimeout(reconnectRef.current);
        };
        // pathname 포함: 알림 페이지 접근 시 effect 재실행 → SSE 재연결 (새로고침 없이 실시간 수신)
    }, [fetchUnreadCount, pathname]);

    /* ===== 읽음 처리 ===== */
    const markAsRead = useCallback(async (id) => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        try {
            await axios.post(`${API_BASE}/${id}/read`, null, {
                headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
            });

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
            // ✅ 서버 상태와 동기화
            await fetchUnreadCount();
        } catch (e) {
            // 에러 처리
        }
    }, [fetchUnreadCount]);

    /* ===== 모두 읽음 처리 ===== */
    const markAllAsRead = useCallback(async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        try {
            await axios.post(`${API_BASE}/read-all`, null, {
                headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
            });

            setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true }))
            );
            // ✅ 서버 상태와 동기화
            await fetchUnreadCount();
        } catch (e) {
            // 에러 처리
        }
    }, [fetchUnreadCount]);

    /* ===== 읽은 알림 삭제 ===== */
    const deleteReadNotifications = useCallback(async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        try {
            await axios.delete(`${API_BASE}/delete-read`, {
                headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
            });

            setNotifications((prev) => prev.filter((n) => !n.isRead));
            // ✅ 서버 상태와 동기화
            await fetchUnreadCount();
        } catch (e) {
            // 에러 처리
        }
    }, [fetchUnreadCount]);

    /* ===== 알림 목록 새로고침 ===== */
    const refreshNotifications = useCallback(async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        try {
            const res = await axios.get(API_BASE, {
                headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
            });
            setNotifications(res.data || []);
            // 읽지 않은 알림 개수도 함께 업데이트
            await fetchUnreadCount();
        } catch (e) {
            // 에러 처리
        }
    }, [fetchUnreadCount]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                deleteReadNotifications,
                refreshNotifications,
                fetchUnreadCount,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
