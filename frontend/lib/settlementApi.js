import { BASE_URL, normalizeToken } from "@/lib/api";

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || "";
}

async function request(path, { method = "GET", body, query } = {}) {
  const token = normalizeToken(getStoredToken());
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";

  const res = await fetch(`${BASE_URL}${path}${qs}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data || { status: res.status, message: "Request failed" };
    throw error;
  }
  return data;
}

export const settlementApi = {
  getMyEstimate() {
    return request("/api/settlements/estimated");
  },
  getMyHistory() {
    return request("/api/settlements/history");
  },
  getMyDetails(settlementId) {
    return request(`/api/settlements/${settlementId}/details`);
  },

  getAdminSummaries() {
    return request("/api/settlements/admin/summaries");
  },
  getAdminHistory(params = {}) {
    return request("/api/settlements/admin/history", { query: params });
  },
  getAdminArtistHistory(artistId, params = {}) {
    return request(`/api/settlements/admin/artists/${artistId}/history`, {
      query: params,
    });
  },
  getAdminArtistEstimate(artistId) {
    return request(`/api/settlements/admin/artists/${artistId}/estimated`);
  },
  getAdminDetails(settlementId) {
    return request(`/api/settlements/admin/${settlementId}/details`);
  },
  getFailureSummary() {
    return request("/api/settlements/admin/failure-logs/summary");
  },
  getFailureLogs(params = {}) {
    return request("/api/settlements/admin/failure-logs", { query: params });
  },
  executeManualBatch(payload = {}) {
    return request("/api/settlements/admin/execute", {
      method: "POST",
      body: payload,
    });
  },
};

