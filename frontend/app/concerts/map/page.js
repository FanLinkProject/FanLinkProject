"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConcertsMapRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/concerts?mode=map");
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-white/55">
      지도로 이동 중...
    </div>
  );
}
