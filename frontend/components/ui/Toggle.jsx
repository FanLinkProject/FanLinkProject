"use client";

/**
 * 토글 스위치 컴포넌트
 */
export default function Toggle({ checked, onChange, disabled, label, id }) {
  const toggleId = id || `toggle-${Math.random().toString(36).slice(2)}`;
  return (
    <label
      htmlFor={toggleId}
      className={`flex items-center gap-3 cursor-pointer ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="relative inline-flex h-6 w-11 shrink-0">
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`h-6 w-11 rounded-full bg-white/[0.12] transition-colors peer-focus:ring-2 peer-focus:ring-violet-500/30 peer-checked:bg-violet-500/90 ${
            disabled ? "pointer-events-none" : ""
          }`}
        />
        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
      </div>
      {label && <span className="text-sm font-bold text-white/80">{label}</span>}
    </label>
  );
}
