"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASE_URL } from "@/lib/api";
import {
  sendEmailCode,
  verifyEmailCode,
  sendPhoneCode,
  verifyPhoneCode,
  signup as signupApi,
} from "@/lib/authApi";

function InputGroup({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
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

function AgreementItem({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 p-4 bg-white/[0.04] rounded-2xl border border-white/[0.06] hover:bg-white/[0.06] transition-all cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 rounded border-white/20 text-violet-500 focus:ring-violet-500/20 bg-[#16102a]"
      />
      <span
        className={`text-xs font-bold ${
          checked ? "text-white" : "text-white/55 group-hover:text-white/75"
        }`}
      >
        {label}
      </span>
      <span className="material-symbols-outlined ml-auto text-white/40 text-lg">
        chevron_right
      </span>
    </label>
  );
}

function SocialSignupButton({ provider, onClick }) {
  const configs = {
    google: {
      label: "Google로 간편가입",
      color: "#FFFFFF",
      textColor: "#000000",
      border: "border-white/20",
    },
    kakao: {
      label: "카카오로 간편가입",
      color: "#FEE500",
      textColor: "#000000",
      border: "border-transparent",
    },
    naver: {
      label: "네이버로 간편가입",
      color: "#03C75A",
      textColor: "#FFFFFF",
      border: "border-transparent",
    },
    instagram: {
      label: "Instagram으로 간편가입",
      color: "transparent",
      textColor: "#FFFFFF",
      border: "border-transparent",
      gradient:
        "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    },
  };

  const config = configs[provider];
  const isInstagram = provider === "instagram";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: isInstagram ? undefined : config.color,
        backgroundImage: isInstagram ? config.gradient : undefined,
        color: config.textColor,
      }}
      className={`w-full py-3 px-4 rounded-2xl text-xs font-bold border hover:opacity-90 transition-opacity ${config.border}`}
    >
      {config.label}
    </button>
  );
}

export default function SignupForm({ role }) {
  const router = useRouter();
  const [step, setStep] = useState("INFO");
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    name: "",
    password: "",
    passwordConfirm: "",
    gender: "FEMALE",
    birth: "",
    phoneNumber: "",
    phonePart1: "010",
    phonePart2: "",
    phonePart3: "",
    privacyPolicyAgreed: false,
    marketingAgreed: false,
  });
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [timer, setTimer] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleOAuthSignup = (provider) => {
    window.location.href = `${BASE_URL}/oauth2/authorization/${provider}`;
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.nickname || !formData.password || !formData.birth) {
      setError("모든 필수 정보를 입력해주세요.");
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setError("");
    try {
      await sendEmailCode(formData.email);
      setStep("EMAIL_VERIFY");
    } catch (err) {
      setError(err?.data?.message || err?.message || "이메일 인증코드 발송에 실패했습니다.");
    }
  };

  const handleEmailVerify = async () => {
    if (!emailCode || emailCode.length !== 6) {
      setError("인증코드 6자리를 입력해주세요.");
      return;
    }

    setError("");
    try {
      await verifyEmailCode(formData.email, emailCode);
      setStep("PHONE_VERIFY");
    } catch (err) {
      setError(err?.data?.message || err?.message || "인증코드가 올바르지 않습니다.");
    }
  };

  const resendEmailCode = async () => {
    setError("");
    try {
      await sendEmailCode(formData.email);
      setTimer(180);
      setIsTimerRunning(true);
    } catch (err) {
      setError(err?.data?.message || err?.message || "인증코드 재발송에 실패했습니다.");
    }
  };

  const phoneNumberCombined = [
    formData.phonePart1,
    formData.phonePart2,
    formData.phonePart3,
  ]
    .filter(Boolean)
    .join("-");

  const sendSmsCode = async () => {
    if (!formData.phonePart1 || !formData.phonePart2 || !formData.phonePart3) {
      setError("휴대폰 번호를 모두 입력해주세요.");
      return;
    }

    const targetPhoneNumber = phoneNumberCombined;
    setFormData((prev) => ({ ...prev, phoneNumber: targetPhoneNumber }));
    setError("");

    try {
      await sendPhoneCode(targetPhoneNumber);
      setIsTimerRunning(true);
      setTimer(180);
    } catch (err) {
      setError(err?.data?.message || err?.message || "인증번호 발송에 실패했습니다.");
    }
  };

  const handlePhoneVerify = async () => {
    if (!phoneCode || phoneCode.length !== 6) {
      setError("인증번호 6자리를 입력해주세요.");
      return;
    }

    const targetPhoneNumber = formData.phoneNumber || phoneNumberCombined;
    setError("");
    try {
      await verifyPhoneCode(targetPhoneNumber, phoneCode);
      setStep("AGREEMENT");
    } catch (err) {
      setError(err?.data?.message || err?.message || "인증번호가 올바르지 않습니다.");
    }
  };

  const handleFinalSubmit = async () => {
    if (!formData.privacyPolicyAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    setError("");
    try {
      const res = await signupApi({
        email: formData.email,
        nickname: formData.nickname,
        name: formData.name,
        password: formData.password,
        gender: formData.gender,
        birth: formData.birth,
        privacyPolicyAgreed: formData.privacyPolicyAgreed ?? true,
        phoneNumber: formData.phoneNumber,
        emailVerificationCode: emailCode,
        role: role === "ARTIST" ? "ARTIST" : "USER",
      });

      const accessToken = res.accessToken?.startsWith("Bearer")
        ? res.accessToken
        : `Bearer ${res.accessToken || ""}`;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", accessToken);
        if (res.refreshToken) localStorage.setItem("refreshToken", res.refreshToken);
      }

      router.push(role === "ARTIST" ? "/artist-console" : "/home");
    } catch (err) {
      setError(err?.data?.message || err?.message || "회원가입에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!isTimerRunning) return undefined;

    const intervalId = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const steps = ["INFO", "EMAIL_VERIFY", "PHONE_VERIFY", "AGREEMENT"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[#0b0814]">
      <div className="w-full max-w-xl">
        <div className="bg-[#201a33] rounded-[2.5rem] p-10 border border-white/[0.08]">
          <div className="text-center mb-10">
            <span className="bg-violet-500/20 text-violet-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
              {role === "ARTIST" ? "Artist Membership" : "Fan Community"}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">회원가입</h2>
          </div>

          <div className="flex justify-between items-center mb-10 px-4 relative">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/[0.08] -translate-y-1/2 z-0" />
            {steps.map((s, idx) => (
              <div
                key={s}
                className={`size-8 rounded-full flex items-center justify-center text-[11px] font-black z-10 transition-all border-4 border-[#201a33] ${
                  step === s
                    ? "bg-violet-500/90 text-white"
                    : idx < stepIndex
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/[0.06] text-white/40"
                }`}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400 text-xl">error</span>
              <p className="text-xs font-bold text-red-300">{error}</p>
            </div>
          )}

          {step === "INFO" && (
            <form onSubmit={handleInfoSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="이메일"
                  placeholder="example@fanlink.io"
                  value={formData.email}
                  onChange={(v) => updateField("email", v)}
                  type="email"
                  required
                />
                <InputGroup
                  label="닉네임"
                  placeholder="LUNA"
                  value={formData.nickname}
                  onChange={(v) => updateField("nickname", v)}
                  required
                />
                <InputGroup
                  label="이름 (본명)"
                  placeholder="김루나"
                  value={formData.name}
                  onChange={(v) => updateField("name", v)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                    생년월일 <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.birth}
                    onChange={(e) => updateField("birth", e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]"
                  />
                </div>
                <InputGroup
                  label="비밀번호"
                  placeholder="********"
                  value={formData.password}
                  onChange={(v) => updateField("password", v)}
                  type="password"
                  required
                />
                <InputGroup
                  label="비밀번호 확인"
                  placeholder="********"
                  value={formData.passwordConfirm}
                  onChange={(v) => updateField("passwordConfirm", v)}
                  type="password"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  성별
                </label>
                <div className="flex gap-4">
                  {["FEMALE", "MALE", "OTHER"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateField("gender", g)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                        formData.gender === g
                          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                          : "bg-[#16102a] border-white/[0.08] text-white/55 hover:text-white/80"
                      }`}
                    >
                      {g === "FEMALE" ? "여성" : g === "MALE" ? "남성" : "선택안함"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all"
              >
                이메일 인증코드 발송
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <span className="relative px-3 bg-[#201a33] text-[10px] font-black text-white/45 uppercase tracking-widest">
                  또는 간편 회원가입
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SocialSignupButton provider="google" onClick={() => handleOAuthSignup("google")} />
                <SocialSignupButton provider="kakao" onClick={() => handleOAuthSignup("kakao")} />
                <SocialSignupButton provider="naver" onClick={() => handleOAuthSignup("naver")} />
                <SocialSignupButton provider="instagram" onClick={() => handleOAuthSignup("instagram")} />
              </div>
            </form>
          )}

          {step === "EMAIL_VERIFY" && (
            <div className="space-y-8">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-violet-500/50 mb-4 font-light block">
                  mail
                </span>
                <p className="text-white/75 font-medium leading-relaxed">
                  <span className="font-black text-white">{formData.email}</span> 로
                  <br />
                  인증코드를 발송했습니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  인증코드 6자리
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-5 py-4 bg-[#16102a] border border-white/[0.08] rounded-2xl text-2xl font-black text-center tracking-[1rem] text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/30 transition-all"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep("INFO")}
                  className="flex-1 py-4 bg-white/[0.06] text-white/70 rounded-2xl font-black text-sm border border-white/[0.06] hover:bg-white/[0.08] transition-all"
                >
                  이전으로
                </button>
                <button
                  type="button"
                  onClick={handleEmailVerify}
                  className="flex-[2] py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all"
                >
                  인증 확인
                </button>
              </div>

              <p className="text-center text-[11px] font-bold text-white/55">
                메일을 받지 못하셨나요?{" "}
                <button
                  type="button"
                  onClick={resendEmailCode}
                  className="text-violet-300 hover:underline"
                >
                  인증코드 재발송
                </button>
              </p>
            </div>
          )}

          {step === "PHONE_VERIFY" && (
            <div className="space-y-8">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-violet-500/50 mb-4 font-light block">
                  smartphone
                </span>
                <p className="text-white/75 font-medium">
                  안전한 이용을 위해 휴대폰 인증을 진행해주세요.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                    휴대폰 번호
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={3}
                      value={formData.phonePart1}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                        updateField("phonePart1", v);
                      }}
                      placeholder="010"
                      className="w-20 px-3 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white text-center outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
                    />
                    <span className="text-white/40 font-bold">-</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={4}
                      value={formData.phonePart2}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        updateField("phonePart2", v);
                      }}
                      placeholder="1234"
                      className="flex-1 min-w-0 px-3 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white text-center outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
                    />
                    <span className="text-white/40 font-bold">-</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={4}
                      value={formData.phonePart3}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        updateField("phonePart3", v);
                      }}
                      placeholder="5678"
                      className="flex-1 min-w-0 px-3 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white text-center outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={sendSmsCode}
                      className="px-6 bg-[#16102a] border border-white/[0.08] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-white/[0.06] transition-all"
                    >
                      {isTimerRunning ? "재전송" : "인증번호 발송"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                    인증번호
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      placeholder="000000"
                      className="w-full px-5 py-3.5 bg-[#16102a] border border-white/[0.08] rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all"
                    />
                    {isTimerRunning && (
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-violet-400 font-black text-xs">
                        {formatTime(timer)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePhoneVerify}
                className="w-full py-4 bg-violet-500/90 text-white rounded-2xl font-black text-sm hover:brightness-110 transition-all"
              >
                인증 및 완료
              </button>
            </div>
          )}

          {step === "AGREEMENT" && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <div className="size-20 bg-emerald-500/80 text-white rounded-[1.8rem] flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl">check</span>
                </div>
                <h3 className="text-xl font-black text-white">거의 다 되었어요!</h3>
                <p className="text-white/65 font-medium mt-1">
                  서비스 이용 약관에 동의해주세요.
                </p>
              </div>

              <div className="space-y-4">
                <AgreementItem
                  label="개인정보 수집 및 이용 동의 (필수)"
                  checked={formData.privacyPolicyAgreed}
                  onChange={(v) => updateField("privacyPolicyAgreed", v)}
                />
                <AgreementItem
                  label="이용약관 동의 (필수)"
                  checked={true}
                  onChange={() => {}}
                />
                <AgreementItem
                  label="이벤트 및 마케팅 정보 수신 동의 (선택)"
                  checked={formData.marketingAgreed}
                  onChange={(v) => updateField("marketingAgreed", v)}
                />
              </div>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full py-5 bg-violet-500/90 text-white rounded-3xl font-black text-base hover:brightness-110 transition-all uppercase tracking-widest"
              >
                가입 완료하기
              </button>
            </div>
          )}

          <div className="mt-8 text-center pt-8 border-t border-white/[0.06]">
            <Link
              href="/login"
              className="text-xs font-bold text-white/55 hover:text-violet-300 transition-colors"
            >
              계정이 이미 있으신가요? 로그인하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
