"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfile, completeOAuthProfile } from "@/lib/userApi";

function InputGroup({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
        {label} {required && <span className="text-violet-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
      />
    </div>
  );
}

export default function OAuthCompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    gender: "MALE",
    birth: "",
    phoneNumber: "",
  });

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setForm((prev) => ({
          ...prev,
          name: profile.name || prev.name,
          gender: profile.gender || prev.gender,
          birth: profile.birth && profile.birth !== "1900-01-01" ? profile.birth : prev.birth,
        }));
      })
      .catch(() => {
        setError("프로필을 불러오지 못했습니다. 로그인 후 다시 시도해 주세요.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { name, gender, birth, phoneNumber } = form;
    if (!name?.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!birth?.trim()) {
      setError("생년월일을 입력해 주세요.");
      return;
    }
    if (!phoneNumber?.trim()) {
      setError("전화번호를 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await completeOAuthProfile({
        name: name.trim(),
        gender: gender || null,
        birth: birth.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      router.replace("/home");
    } catch (err) {
      setError(err?.data?.message || err?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-[#0b0814]">
        <p className="text-white/55 font-medium">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[#0b0814]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/home" className="inline-flex items-center gap-3 text-violet-300 mb-4">
            <span className="material-symbols-outlined text-4xl font-black fill-icon">rocket_launch</span>
            <h1 className="text-3xl font-black tracking-tighter text-white">FanLink</h1>
          </Link>
          <p className="text-white/55 font-medium italic">추가 정보를 입력해 주세요</p>
        </div>

        <div className="bg-[#201a33] rounded-[2.5rem] p-10 border border-white/[0.08]">
          <h2 className="text-xl font-bold text-white mb-2 text-center">추가 정보 입력</h2>
          <p className="text-[11px] text-white/55 text-center mb-8">
            서비스 이용을 위해 아래 정보를 입력해 주세요. DB에 안전하게 저장됩니다.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400 text-xl">error</span>
              <p className="text-xs font-bold text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <InputGroup
              label="이름 (본명)"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="홍길동"
              required
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">성별</label>
              <div className="flex gap-4">
                {["MALE", "FEMALE", "OTHER"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, gender: g }))}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                      form.gender === g
                        ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                        : "bg-[#16102a] border-white/[0.08] text-white/55 hover:text-white/80"
                    }`}
                  >
                    {g === "MALE" ? "남성" : g === "FEMALE" ? "여성" : "선택안함"}
                  </button>
                ))}
              </div>
            </div>
            <InputGroup
              label="생년월일"
              value={form.birth}
              onChange={(v) => setForm((p) => ({ ...p, birth: v }))}
              placeholder="YYYY-MM-DD"
              type="date"
              required
            />
            <InputGroup
              label="전화번호"
              value={form.phoneNumber}
              onChange={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
              placeholder="010-1234-5678"
              type="tel"
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all disabled:opacity-60"
            >
              {saving ? "저장 중…" : "저장하고 시작하기"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-white/45">
            <Link href="/home" className="text-violet-300 hover:underline">나중에 입력하기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
