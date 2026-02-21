"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Button from "@/components/ui/Button";
import { ConcertHero } from "@/components/concert/ConcertHero";
import { ConcertInfoCards } from "@/components/concert/ConcertInfoCards";
import { ConcertArtistList } from "@/components/concert/ConcertArtistList";
import { LocationSection } from "@/components/concert/LocationSection";

export default function ConcertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [concert, setConcert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const DESC_PREVIEW_LEN = 200;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setError("");
      }
    });
    apiGet(`/api/concerts/${id}`)
      .then((data) => {
        if (!cancelled) setConcert(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err?.data?.message || err?.message || "공연 정보를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share && concert) {
      navigator.share({
        title: concert.title,
        text: `${concert.title} - ${concert.venueName}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      try {
        navigator.clipboard.writeText(window.location.href);
        alert("링크가 복사되었습니다.");
      } catch (_) {}
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center text-white/55 py-12">
        로딩 중...
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" href="/concerts" className="rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/90">
          {error || "공연을 찾을 수 없습니다."}
        </div>
      </div>
    );
  }

  const location = concert.location
    ? {
        latitude: concert.location.latitude,
        longitude: concert.location.longitude,
        placeName: concert.location.placeName,
        fullAddress: concert.location.fullAddress,
      }
    : null;

  const hasLongDesc = concert.description && concert.description.length > DESC_PREVIEW_LEN;
  const descPreview = hasLongDesc ? concert.description.slice(0, DESC_PREVIEW_LEN) + "…" : concert.description;
  const showExpand = hasLongDesc && !descriptionExpanded;

  const mapModeUrl =
    location?.latitude != null && location?.longitude != null
      ? `/concerts?mode=map&lat=${location.latitude}&lng=${location.longitude}`
      : "/concerts?mode=map";

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pb-20">
      <div className="pt-6" />

      <ConcertHero concert={concert} onBack={handleBack} onShare={handleShare} />

      <div className="mt-8 space-y-0">
        <ConcertInfoCards concert={concert} />
        <ConcertArtistList artists={concert.artists} />

        {concert.description && (
          <section className="mt-12 rounded-2xl border border-white/5 bg-white/[0.04] p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/55 mb-3">공연 소개</h2>
            <p className="text-white/90 whitespace-pre-wrap">
              {descriptionExpanded ? concert.description : descPreview}
            </p>
            {showExpand && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded(true)}
                className="mt-3 text-violet-400 hover:text-violet-300 text-sm font-medium"
              >
                더보기
              </button>
            )}
            {descriptionExpanded && hasLongDesc && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded(false)}
                className="mt-3 text-white/55 hover:text-white/70 text-sm"
              >
                접기
              </button>
            )}
          </section>
        )}

        <div className="mt-12">
          <LocationSection
            location={location}
            venueNameFallback={concert.venueName}
            mapModeUrl={mapModeUrl}
          />
        </div>
      </div>
    </div>
  );
}
