import { getDefaultAvatarUrl } from "@/lib/avatar";

export function getCurrentUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("accessToken");
    if (!raw) return null;
    try {
        const token = raw.replace(/^Bearer\s+/i, "").trim();
        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        return {
            email: payload.sub,
            role: (payload.role || "").replace("ROLE_", ""),
        };
    } catch {
        return null;
    }
}

export function formatTimestamp(instant) {
    if (!instant) return "방금 전";
    try {
        const date = new Date(instant);
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);
        if (diffSec < 60) return "방금 전";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}분 전`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}시간 전`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay}일 전`;
        return date.toLocaleDateString("ko-KR");
    } catch {
        return "방금 전";
    }
}

export function transformArtistPost(p) {
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    return {
        id: p.id,
        writerId: p.writerId ?? null,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorAvatar:
            p.writerProfileImageUrl ||
            getDefaultAvatarUrl(p.writerNickname || "?"),
        content: p.content || "",
        image: attachments[0]?.url || null,
        attachmentCount: attachments.length,
        timestamp: formatTimestamp(p.createdAt),
        isMembershipOnly: p.isMembershipOnly ?? false,
        isLockedByServer: !!(p.isMembershipOnly && p.content === null),
        isNotice: !!p.isNotice,
        type: "ARTIST",
    };
}

export function transformFanPost(p) {
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    return {
        id: p.id,
        writerId: p.writerId ?? null,
        authorName: p.writerNickname || "",
        authorMemberName: null,
        authorGradeName: p.writerGradeName ?? null,
        authorAvatar: p.writerProfileImageUrl || "",
        content: p.content || "",
        image: attachments[0]?.url || null,
        attachmentCount: attachments.length,
        timestamp: formatTimestamp(p.createdAt),
        type: "FAN",
    };
}

export const POSTS_LIMIT = 10;
