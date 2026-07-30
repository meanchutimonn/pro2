"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TripExtraPage from "@/app/components/TripExtraPage";

function TripPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tripIdParam = searchParams.get("tripId");
  const initialTripId = tripIdParam ? Number(tripIdParam) : undefined;
  const openMap = (searchParams.get("openMap") === "1" || searchParams.get("openMap") === "true");

  return (
    <TripExtraPage
      onBack={() => router.push(initialTripId ? "/mission" : "/")}
      initialTripId={initialTripId}
      initialOpenMap={openMap}
    />
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={null}>
      <TripPageInner />
    </Suspense>
  );
}