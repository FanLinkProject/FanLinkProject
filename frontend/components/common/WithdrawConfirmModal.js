"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * 회원탈퇴 비밀번호 확인 모달
 * - document.body에 포탈로 렌더링하여 전체 화면에 표시
 * - isOpen, onClose, onConfirm(password) 필수
 */
export default function WithdrawConfirmModal({ isOpen, onClose, onConfirm }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEscape = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleEscape]);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(password);
      onClose?.();
    } catch (err) {
      setError(err?.data?.message || err?.message || "회원탈퇴에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
    >
      <div
        className="bg-[#201a33] rounded-2xl border border-white/[0.08] w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-6">
          <h2 id="withdraw-modal-title" className="text-2xl font-bold text-white">
            회원탈퇴
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 size-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/70 hover:bg-white/[0.12] hover:text-white transition-colors"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          <p className="text-base text-white/75 leading-relaxed">
            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 비밀번호를 입력해 확인해주세요.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/55 px-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="비밀번호 입력"
              className="w-full px-5 py-4 bg-[#16102a] border border-white/[0.08] rounded-xl text-base font-medium text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/20"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-red-400">{error}</p>
          )}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl text-base font-bold border border-white/[0.12] text-white/80 hover:bg-white/[0.06] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-xl text-base font-bold bg-red-500/90 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {loading ? "처리 중..." : "탈퇴하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
