"use client";

import { useRouter } from "next/navigation";
import TripExtraPage from "@/app/components/TripExtraPage";

export default function TripPage() {
  const router = useRouter();

  return (
    <TripExtraPage onBack={() => router.push("/")} />
  );
}