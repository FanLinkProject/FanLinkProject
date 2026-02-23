"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { sendPasswordResetCode, verifyPasswordResetCode, resetPassword } from "@/lib/authApi";

const STEPS = { EMAIL: "EMAIL", CODE: "CODE", PASSWORD: "PASSWORD", SUCCESS: "SUCCESS" };
const MAX_WRONG_ATTEMPTS = 5;

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);

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
      setStep(STEPS.EMAIL);
      setEmail("");
      setCode("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setError("");
      setLoading(false);
      setWrongAttempts(0);
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetCode(email.trim());
      setStep(STEPS.CODE);
      setCode("");
      setWrongAttempts(0);
    } catch (err) {
      const msg = err?.data?.message || err?.message || "인증 코드 발송에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndNext = async (e) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      setError("인증번호 6자리를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyPasswordResetCode(email.trim(), code.trim());
      setStep(STEPS.PASSWORD);
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err) {
      const nextAttempts = wrongAttempts + 1;
      setWrongAttempts(nextAttempts);
      const msg = err?.data?.message || err?.message || "인증번호가 올바르지 않습니다.";
      setError(msg);
      if (nextAttempts >= MAX_WRONG_ATTEMPTS) {
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReissueCode = async () => {
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetCode(email.trim());
      setWrongAttempts(0);
      setCode("");
    } catch (err) {
      const msg = err?.data?.message || err?.message || "인증 코드 발송에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      setStep(STEPS.SUCCESS);
    } catch (err) {
      const msg = err?.data?.message || err?.message || "비밀번호 변경에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all";

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div
        className="bg-[#201a33] rounded-2xl border border-white/[0.08] w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <h2 id="forgot-password-title" className="text-xl font-bold text-white">
            비밀번호 찾기
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

        <div className="px-6 pb-6">
          {step === STEPS.EMAIL && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="가입 시 사용한 이메일을 입력하세요"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm font-bold text-red-400 px-1">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "발송 중..." : "인증번호 발송"}
              </button>
            </form>
          )}

          {step === STEPS.CODE && (
            <div className="space-y-4">
              <p className="text-sm text-white/75">
                {email}로 인증번호를 발송했습니다. 6자리 숫자를 입력해주세요.
              </p>
              {wrongAttempts >= MAX_WRONG_ATTEMPTS ? (
                <>
                  <p className="text-sm font-bold text-amber-400 px-1">
                    인증번호를 {MAX_WRONG_ATTEMPTS}회 잘못 입력하셨습니다. 새 인증번호를 발급받아 주세요.
                  </p>
                  {error && (
                    <p className="text-sm font-bold text-red-400 px-1">{error}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(STEPS.EMAIL);
                        setError("");
                        setWrongAttempts(0);
                      }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/[0.12] text-white/80 hover:bg-white/[0.06] transition-colors"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={handleReissueCode}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-500/90 text-white hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {loading ? "발송 중..." : "인증번호 재발급"}
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleVerifyAndNext} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                      인증번호 {wrongAttempts > 0 && (
                        <span className="text-amber-400/90 font-normal">
                          (잘못된 입력 {wrongAttempts}/{MAX_WRONG_ATTEMPTS}회)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                      }}
                      placeholder="6자리 인증번호"
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                  {error && (
                    <p className="text-sm font-bold text-red-400 px-1">{error}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(STEPS.EMAIL);
                        setError("");
                        setWrongAttempts(0);
                      }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/[0.12] text-white/80 hover:bg-white/[0.06] transition-colors"
                    >
                      이전
                    </button>
                    <button
                      type="submit"
                      disabled={loading || code.length !== 6}
                      className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-500/90 text-white hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {step === STEPS.PASSWORD && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="8자 이상 입력"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => {
                    setNewPasswordConfirm(e.target.value);
                    setError("");
                  }}
                  placeholder="비밀번호 다시 입력"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm font-bold text-red-400 px-1">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(STEPS.CODE);
                    setError("");
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/[0.12] text-white/80 hover:bg-white/[0.06] transition-colors"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-500/90 text-white hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {loading ? "처리 중..." : "비밀번호 변경"}
                </button>
              </div>
            </form>
          )}

          {step === STEPS.SUCCESS && (
            <div className="space-y-6 text-center py-4">
              <div className="size-16 bg-emerald-500/80 text-white rounded-2xl flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl">check</span>
              </div>
              <p className="text-white font-medium">비밀번호가 변경되었습니다.</p>
              <p className="text-sm text-white/65">새 비밀번호로 로그인해주세요.</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all"
              >
                로그인하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
