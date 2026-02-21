"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { BASE_URL } from "@/lib/api";
const API_BASE = `${BASE_URL}/api/fan-profiles`;

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function FanProfileTestPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createArtistId, setCreateArtistId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/me`, { headers: getAuthHeaders() });
      setProfiles(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "목록 조회 실패.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      router.push("/login");
      return;
    }
    const userData = parseJwt(token);
    const role = userData?.role;
    const isArtist = role === "ARTIST" || role === "ROLE_ARTIST";
    if (isArtist) {
      router.push("/mypage");
      return;
    }
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleCreate = async () => {
    const aid = Number(createArtistId);
    if (!aid) {
      setError("아티스트 ID를 입력하세요.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await axios.post(API_BASE, { artistId: aid }, { headers: getAuthHeaders() });
      setCreateArtistId("");
      await fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || "생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const handleIncrease = async (profileId, type) => {
    setError("");
    try {
      await axios.post(`${API_BASE}/${profileId}/increase-${type}`, {}, { headers: getAuthHeaders() });
      await fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || "실패");
    }
  };

  const handleDecrease = async (profileId, type) => {
    setError("");
    try {
      await axios.post(`${API_BASE}/${profileId}/decrease-${type}`, {}, { headers: getAuthHeaders() });
      await fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.message || "실패");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">내 등급 현황</h1>
            <p className="text-slate-500 text-sm">
              게시글/댓글/방문/가입일을 확인하고 테스트용으로 ±1 조정할 수 있습니다. (게시글·댓글 삭제 대비)
            </p>
          </div>
          <button
            onClick={() => router.push("/mypage")}
            className="text-sm text-slate-600 hover:text-slate-800 underline"
          >
            마이페이지로 돌아가기
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <section className="bg-white rounded-xl shadow border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">팬 프로필 생성 (테스트용)</h2>
          <p className="text-slate-500 text-xs mb-2">
            아티스트 ID를 입력하고 생성하면 해당 아티스트에 대한 팬 프로필이 만들어집니다.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="아티스트 ID"
              value={createArtistId}
              onChange={(e) => setCreateArtistId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 w-32"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {creating ? "생성 중..." : "생성"}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">아티스트별 팬 프로필</h2>
          {profiles.length === 0 ? (
            <p className="text-slate-500">등록된 팬 프로필이 없습니다. 위에서 아티스트 ID로 생성해 주세요.</p>
          ) : (
            <div className="space-y-6">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-800">
                      {p.artistName || `아티스트 #${p.artistId}`}
                    </span>
                    {p.gradeName && (
                      <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        현재 등급: {p.gradeName}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "post", label: "게시글", value: p.postCount, canDecrease: true, buttonText: "+1" },
                      { key: "comment", label: "댓글", value: p.commentCount, canDecrease: true, buttonText: "+1" },
                      { key: "visit", label: "방문일", value: p.visitCount, canDecrease: false, buttonText: "방문일 체크" },
                      { key: "join-days", label: "가입일", value: p.joinDays, canDecrease: false, buttonText: "+1" },
                    ].map(({ key, label, value, canDecrease, buttonText }) => (
                      <div key={key} className="flex items-center justify-between gap-4 px-4 py-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-sm text-slate-600">{label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {canDecrease && (
                            <button
                              onClick={() => handleDecrease(p.id, key)}
                              className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium"
                            >
                              -1
                            </button>
                          )}
                          <span className="font-semibold min-w-[1.5rem]">{value}</span>
                          <button
                            onClick={() => handleIncrease(p.id, key)}
                            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-sm font-medium"
                          >
                            {buttonText}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
