"use client";

/**
 * 팬 화면 섹션 제목. 텍스트 컬러 규칙 적용.
 */
export default function SectionTitle({ children, className = "" }) {
  return (
    <h2
      className={`text-xl font-semibold tracking-tight text-white ${className}`}
    >
      {children}
    </h2>
  );
}
