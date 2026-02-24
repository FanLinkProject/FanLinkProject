"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ArtistMusicVideosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/artist-console?tab=MV");
  }, [router]);
  return null;
}
