"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

import { BASE_URL } from "@/lib/api";
const API_BASE = `${BASE_URL}/api/milestones`;
const CONDITION_FIELDS = [
  { type: "POST_COUNT", formKey: "postCount", label: "게시글", unit: "개" },
  { type: "COMMENT_COUNT", formKey: "commentCount", label: "댓글", unit: "개" },
  { type: "VISIT_COUNT", formKey: "visitCount", label: "방문", unit: "회" },
  { type: "JOIN_DAYS", formKey: "joinDays", label: "가입", unit: "일 후 만족 시 자동 등업" },
];

const emptyGrade = () => ({
  id: null,
  name: "",
  description: "",
  postCount: 0,
  commentCount: 0,
  visitCount: 0,
  joinDays: 0,
});

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const pureToken = token?.replace(/^Bearer\s+/i, "").trim();
  return {
    "Content-Type": "application/json",
    ...(pureToken && { Authorization: `Bearer ${pureToken}` }),
  };
}

function parseJwt(token) {
  if (!token) return null;
  const pureToken = token.replace(/^Bearer\s+/i, "").trim();
  try {
    const base64Url = pureToken.split(".")[1];
    if (!base64Url) return null;
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

export default function MilestonePage() {
  const router = useRouter();
  const [grades, setGrades] = useState([emptyGrade(), emptyGrade(), emptyGrade(), emptyGrade()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoUpgrading, setAutoUpgrading] = useState(false);

  const runAutoUpgrade = async () => {
    try {
      setAutoUpgrading(true);
      setError("");
      await axios.post(
        `${BASE_URL}/api/milestone/fan-grade/auto-upgrade`,
        {},
        { headers: getAuthHeaders() }
      );
      setError("");
      alert("자동승급이 실행되었습니다.");
    } catch (err) {
      setError(err.response?.data?.message || "자동승급 실행 실패.");
    } finally {
      setAutoUpgrading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(API_BASE, { headers: getAuthHeaders() });
      const list = res.data || [];
      const sorted = [...list].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
      const mapped = sorted.map((m) => {
        const cond = { postCount: 0, commentCount: 0, visitCount: 0, joinDays: 0 };
        m.conditions?.forEach((c) => {
          const f = CONDITION_FIELDS.find((x) => x.type === c.type);
          if (f) cond[f.formKey] = c.requiredValue ?? 0;
        });
        return {
          id: m.id,
          name: m.name,
          description: m.description || "",
          ...cond,
        };
      });
      while (mapped.length < 4) mapped.push(emptyGrade());
      setGrades(mapped);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 401 || status === 403) {
        setError("인증이 필요합니다. 그룹 계정으로 로그인 후 다시 시도해주세요.");
      } else {
        setError(msg || "목록 조회 실패. 로그인 후 시도하세요.");
      }
      setGrades([emptyGrade(), emptyGrade(), emptyGrade(), emptyGrade()]);
    } finally {
      setLoading(false);
    }
  };

  const [canManageMilestone, setCanManageMilestone] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      router.push("/login");
      return;
    }
    const userData = parseJwt(token);
    const role = userData?.role;
    const canManage = role === "GROUP" || role === "ROLE_GROUP" || role === "ARTIST" || role === "ROLE_ARTIST";
    setCanManageMilestone(!!canManage);
    if (canManage) {
      fetchMilestones();
    } else {
      setLoading(false);
    }
  }, [router]);

  const updateGrade = (idx, field, value) => {
    const numFields = ["postCount", "commentCount", "visitCount", "joinDays"];
    const val = numFields.includes(field) ? Number(value) || 0 : value;
    setGrades((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: val } : g))
    );
  };

  const addGradeBlock = () => {
    setGrades((prev) => [...prev, emptyGrade()]);
  };

  const removeGradeBlock = (idx) => {
    if (grades.length <= 1) return;
    setGrades((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildConditions = (g) =>
    CONDITION_FIELDS.map((f) => ({ type: f.type, requiredValue: g[f.formKey] ?? 0 })).filter((c) => c.requiredValue > 0);

  const handleSave = async () => {
    setError("");
    const filled = grades.filter((g) => g.name.trim() && buildConditions(g).length > 0);
    if (filled.length === 0) {
      setError("등급명과 조건(하나 이상 0보다 큰 값)을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const count = filled.length;
      for (let i = 0; i < filled.length; i++) {
        const g = filled[i];
        const sortOrder = count - i;
        const payload = {
          name: g.name.trim(),
          description: g.description.trim(),
          sortOrder,
          autoUpgrade: true,
          active: true,
          conditions: buildConditions(g),
        };
        if (g.id) {
          await axios.put(`${API_BASE}/${g.id}`, payload, { headers: getAuthHeaders() });
        } else {
          await axios.post(API_BASE, payload, { headers: getAuthHeaders() });
        }
      }
      await fetchMilestones();
    } catch (err) {
      setError(err.response?.data?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (idx) => {
    const g = grades[idx];
    if (!g.id) {
      removeGradeBlock(idx);
      return;
    }
    if (!confirm(`"${g.name}" 등급을 삭제할까요?`)) return;
    try {
      await axios.delete(`${API_BASE}/${g.id}`, { headers: getAuthHeaders() });
      await fetchMilestones();
    } catch (err) {
      setError(err.response?.data?.message || "삭제 실패 (사용 중인 등급은 삭제 불가)");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/55 font-medium">로딩 중...</p>
      </div>
    );
  }

  if (!canManageMilestone) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-white/80 font-semibold text-lg">권한 없음</p>
        <p className="text-white/55 text-sm mt-2">멤버 등급 관리는 아티스트(그룹·개인) 계정에서만 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <SectionTitle className="text-2xl font-bold">멤버 등급 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            등급별 조건을 입력합니다. 1번이 가장 높은 등급입니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runAutoUpgrade}
            disabled={autoUpgrading}
            className="px-5 py-3 rounded-2xl bg-amber-500/90 text-white text-sm font-bold hover:bg-amber-500 disabled:opacity-60 transition-all border border-amber-400/30"
          >
            {autoUpgrading ? "실행 중..." : "지금 자동승급 실행"}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <Surface variant="primary" className="p-8">
        <div className="space-y-6">
          {grades.map((g, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white/55 uppercase tracking-widest">
                  {idx + 1}. {idx === 0 ? "(가장 높은 등급)" : `(${idx + 1}번째 등급)`}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="text-sm text-red-400 hover:text-red-300 font-bold transition-colors"
                >
                  삭제
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/55 uppercase tracking-widest mb-2 px-1">
                    등급명
                  </label>
                  <input
                    type="text"
                    value={g.name}
                    onChange={(e) => updateGrade(idx, "name", e.target.value)}
                    placeholder="예: 열심멤버"
                    className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-medium text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/55 uppercase tracking-widest mb-2 px-1">
                    설명
                  </label>
                  <input
                    type="text"
                    value={g.description}
                    onChange={(e) => updateGrade(idx, "description", e.target.value)}
                    placeholder="예: 카페 활동을 열심히 하는 멤버"
                    className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-medium text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/55 uppercase tracking-widest mb-3 px-1">
                  등업 조건
                </label>
                <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
                  {CONDITION_FIELDS.map((f) => (
                    <div key={f.type} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/80">{f.label}</span>
                      <input
                        type="number"
                        min={0}
                        value={g[f.formKey]}
                        onChange={(e) => updateGrade(idx, f.formKey, e.target.value)}
                        className="w-16 px-3 py-2 rounded-xl border border-white/[0.08] bg-[#16102a] text-center text-sm font-medium text-white focus:ring-2 focus:ring-violet-500/20 outline-none"
                      />
                      <span className="text-xs text-white/55">{f.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={addGradeBlock}
            className="text-sm font-bold text-violet-300 hover:text-violet-200 transition-colors"
          >
            + 등급 추가
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </Surface>
    </div>
  );
}
