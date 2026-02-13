"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /dm → /dm/fan 리다이렉트 */
export default function DMPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dm/fan");
  }, [router]);
  return null;
}
