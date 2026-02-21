"use client";

import Link from "next/link";

/**
 * FanLink 디자인 시스템 — 버튼.
 * Primary: 퍼플 계열, Default 무광/미세 shadow, Hover 시 밝기+subtle glow, Active inset, Disabled 채도 제거.
 * Ghost: 서브 액션. Scale 변화 금지.
 */
const base =
  "inline-flex items-center justify-center font-bold text-sm rounded-full px-6 py-3 transition-all duration-200 ease-out";

const variantStyles = {
  primary: [
    "bg-[#6d28d9] text-white",
    "hover:brightness-110 hover:shadow-[0_0_12px_rgba(140,90,255,0.25)]",
    "active:brightness-95 active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] active:hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)]",
    "disabled:bg-white/10 disabled:text-white/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-none disabled:active:shadow-none",
  ].join(" "),
  ghost: [
    "bg-white/[0.06] text-white border border-white/[0.08]",
    "hover:bg-white/[0.1] hover:border-white/[0.12]",
    "active:bg-white/[0.08]",
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
  ].join(" "),
  danger: [
    "bg-red-500/15 text-red-400/90 border border-red-500/20",
    "hover:bg-red-500/25 hover:border-red-500/30",
    "active:bg-red-500/20",
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
  ].join(" "),
};

export default function Button({
  variant = "primary",
  href,
  className = "",
  children,
  disabled,
  ...props
}) {
  const styles = [base, variantStyles[variant], className]
    .filter(Boolean)
    .join(" ");
  const disabledClass = disabled
    ? "opacity-60 pointer-events-none cursor-not-allowed"
    : "";
  const finalClass = `${styles} ${disabledClass}`.trim();

  if (href) {
    return (
      <Link
        href={disabled ? "#" : href}
        aria-disabled={disabled}
        className={finalClass}
        onClick={(e) => disabled && e.preventDefault()}
        {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} className={finalClass} {...props}>
      {children}
    </button>
  );
}
