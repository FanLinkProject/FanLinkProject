"use client";

/**
 * 카드/레이어 컴포넌트. 프리미엄 다크 — 배경보다 한 단계 밝고, 기본은 차분, 호버 시에만 글로우.
 * primary: 정적 패널 (레이어 분리감, 밝기 소폭 상향)
 * secondary: 서브 패널
 * card: 인터랙티브 카드 — 기본과 동일 톤, hover 시에만 shadow 강화 + 살짝 떠오름
 */
export default function Surface({
  variant = "primary",
  className = "",
  as: Component = "div",
  ...props
}) {
  const base = "border";
  const restShadow = "shadow-[0_8px_24px_rgba(0,0,0,0.45)]";
  const hoverShadow =
    "hover:shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_14px_rgba(150,100,255,0.35)]";
  const cardHover =
    "transition-all duration-200 ease-out hover:-translate-y-0.5";

  const variants = {
    primary: [
      "bg-[#201a33]",
      "backdrop-blur-sm",
      "rounded-2xl",
      "border-white/[0.06]",
      restShadow,
    ].join(" "),
    secondary: [
      "bg-[#16102a]",
      "backdrop-blur-sm",
      "rounded-2xl",
      "border-white/[0.05]",
      "shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
    ].join(" "),
    card: [
      "bg-[#201a33]",
      "backdrop-blur-sm",
      "rounded-2xl",
      "border-white/[0.06]",
      restShadow,
      cardHover,
      hoverShadow,
    ].join(" "),
  };
  const combined = [base, variants[variant], className].filter(Boolean).join(" ");
  return <Component className={combined} {...props} />;
}
