"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import CafeDetailPage from "../../components/CafeDetailPage";
function getWeeklyPoints(id: string, category?: string) {
  // ✅ บังคับ 10 สำหรับบางประเภท
  if (category === "Temple" || category === "Market") {
    return 10;
  }

  const now = new Date();

  const temp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const seed = id + week;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash) % 2 === 0 ? 5 : 10;
}

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371; // รัศมีโลก (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const dayMap: any = {
  Mon: "จันทร์",
  Tue: "อังคาร",
  Wed: "พุธ",
  Thu: "พฤหัสบดี",
  Fri: "ศุกร์",
  Sat: "เสาร์",
  Sun: "อาทิตย์",
};

export default function Page() {
    const [userLocation, setUserLocation] = useState<{
  lat: number;
  lng: number;
} | null>(null);
  const params = useParams();
  const router = useRouter();

  const [cafe, setCafe] = useState<any>(null);

  useEffect(() => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (err) => {
      console.log("Location error:", err);
    }
  );
}, []);

  useEffect(() => {
    if (!params?.id) return;

    const fetchCafe = async () => {
      try {
        const ref = doc(db, "locations", params.id as string);
        const snap = await getDoc(ref);

        if (!snap.exists()) return;

        const data = snap.data();
const lat = data.latitude;
const lng = data.longitude;

let distanceText = userLocation ? "calculating..." : "loading...";

if (
  userLocation &&
  typeof lat === "number" &&
  typeof lng === "number"
) {
  const distance = getDistanceKm(
    userLocation.lat,
    userLocation.lng,
    lat,
    lng
  );

  distanceText = distance.toFixed(1) + " กม.";
}

        // ✅ รูปทั้งหมด (ตรงกับ DB จริง)
        const images: string[] = data.extraImages || [];

        // ✅ hero fallback กัน null
        const heroImage =
          data.mainImage && data.mainImage !== "null"
            ? data.mainImage
            : images[0] || "";

        setCafe({
          id: snap.id,distance: distanceText,

          // 🟢 ข้อมูลหลัก
          name: data.locationName || "Cafe",
          category: data.category || "Cafe",

          // 🟢 rating (ยังไม่มีใน DB → ใช้ default ไปก่อน)
          rating: data.rating ?? 4.2,
          reviewCount: data.reviewCount ?? 95,

          // 🟢 ระยะทาง (ยังไม่มี → mock ไว้ก่อน)
          

          // 🟢 แต้ม
          points: getWeeklyPoints(snap.id, data.category),

          // 🟢 รูป
          heroImage,
          photos: images,

          // 🟢 รายละเอียด
          description: data.description || "",
          address: data.address || "",

        schedule: data.schedule || [],
          // 🟢 map (iframe จาก DB)
          googleMap: data.googleMap || "",
        });
      } catch (err) {
        console.error("Error fetching cafe:", err);
      }
    };

    fetchCafe();
  }, [params.id, userLocation]);

  if (!cafe)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Loading...
      </div>
    );

  return (
    <CafeDetailPage
      cafe={cafe}
      onBack={() => router.back()}
    />
  );
}