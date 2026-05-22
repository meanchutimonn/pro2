"use client";
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import TripMapPage from "./TripMapPage";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  doc, getDoc, setDoc, serverTimestamp
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ── Palette ────────────────────────────────────────────────────────────────────
const W = {
  bg: "#ffffff",
  text: "#000000",
  muted: "#7A7A7A",
  dark: "#614124",
  yellow: "#EFBB3A",
  white: "#FFFFFF",
  lightGray: "#f0f0f0",
  green: "#4F772D",
  pink: "#FF7A7A",
};

// ── 1. เพิ่มฟังก์ชันคำนวณระยะทาง (Haversine Formula) ──────────────────────────────
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // รัศมีโลก (กม.)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Responsive hook ────────────────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(window.innerWidth >= 768);
      const handler = () => setIsDesktop(window.innerWidth >= 768);
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }
  }, []);
  return isDesktop;
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TripStop {
  id: number;
  name: string;
  cafeId: string;
  nameTH?: string;
  rating: number;
  distance: string;
  description: string;
  image: string;
  checked?: boolean;
}

export interface TripDetail {
  id: number;
  title: string;
  heroImage: string;
  points: number;
  stops: TripStop[];
}

interface TripDetailPageProps {
  trip: TripDetail;
  onBack: () => void;
  onHome?: () => void;
}

function RouteIllustration({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", height: 400,
        background: W.yellow,
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color 0.2s ease",
      }}
      title="คลิกเพื่อดูแผนที่เส้นทาง"
    >
      <Icon icon="memory:map" width="120" height="120" style={{ color: "#000", opacity: 0.8 }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }}>
        <svg width="100%" height="100%">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
}

// ── 2. ปรับ StopRow ให้รับ userLoc และ cafes เพื่อคำนวณระยะทาง ──────────────────────
function StopRow({
  stop,
  trip,
  isChecked,
  getCafeId,
  userLoc,
  cafes
}: {
  stop: TripStop;
  trip: TripDetail;
  isChecked: boolean;
  getCafeId: (name: string) => string | undefined;
  userLoc: { lat: number; lng: number } | null;
  cafes: any[];
}) {
  const router = useRouter();

  // หาพิกัดร้านจากข้อมูลที่ดึงมาจาก Firebase
  const cafeData = cafes.find(c => c.locationName === stop.name);
  let displayDistance = stop.distance || "0.0 km"; // ค่าเริ่มต้นถ้ายังโหลดตำแหน่งไม่เสร็จ

  if (userLoc && cafeData?.latitude && cafeData?.longitude) {
    const dist = calculateDistance(userLoc.lat, userLoc.lng, cafeData.latitude, cafeData.longitude);
    displayDistance = `${dist.toFixed(1)} km`;
  }

  return (
    <div
      onClick={async () => {
        const cafeId = getCafeId(stop.name);
        if (!cafeId) return;

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          router.push(`/cafe/${cafeId}`);
          return;
        }

        // ── ดึง active mission จาก Firestore ──────────────────────────
        const missionRef = doc(db, "userMissions", user.uid);
        const missionSnap = await getDoc(missionRef);
        const missionData = missionSnap.exists() ? missionSnap.data() : null;

        const hasActiveMission =
          missionData &&
          missionData.status === "active" &&
          String(missionData.tripId) !== String(trip.id);

        if (hasActiveMission) {
          const missionTitle = missionData.tripTitle || "ภารกิจปัจจุบัน";
          const confirmed = window.confirm(
            `⚠️ คุณมีภารกิจ "${missionTitle}" ค้างอยู่\n\nกรุณาทำให้เสร็จก่อนเริ่มภารกิจใหม่\n\nกด OK เพื่อไปดูภารกิจที่ค้างอยู่`
          );
          if (confirmed) {
            router.push("/mission");
          }
          return;
        }

        // ── ถ้า mission นี้ยังไม่ได้ activate → confirm ก่อน ─────────
        const isNewMission =
          !missionData || String(missionData.tripId) !== String(trip.id);

        if (isNewMission) {
          const confirmed = window.confirm(
            `🗺️ เริ่มภารกิจ "${trip.title}" ใช่ไหม?\n\nระบบจะเริ่มนับการเช็คอินร้านค้าในภารกิจนี้ให้คุณ`
          );
          if (!confirmed) return;

          await setDoc(missionRef, {
            tripId: trip.id,
            tripTitle: trip.title,
            tripData: trip,
            status: "active",
            startedAt: serverTimestamp(),
            completedAt: null,
          });
        }

        // ── sync localStorage ด้วย (เพื่อ TripMapPage ที่ยังอ่านอยู่) ──
        localStorage.setItem("activeMission", JSON.stringify(trip));
        localStorage.setItem("activeMissionId", String(trip.id));
        localStorage.setItem("activeMissionCompleted", "false");

        router.push(`/cafe/${cafeId}`);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        borderBottom: `1px solid ${W.lightGray}`,
        cursor: "pointer"
      }}
    >
      <div style={{
        width: 85, height: 85, borderRadius: 15,
        background: `url('${stop.image}') center/cover #eee`,
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left", alignItems: "flex-start" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 4, width: "100%" }}>{stop.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
          <Icon icon="mdi:star" width="16" height="16" color="#F3BC00" />
          <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{stop.rating}</span>
          <span style={{ color: "#D0D0D0", fontSize: 13, margin: "0 2px" }}>|</span>
          <span style={{ fontSize: 13, color: W.muted }}>{displayDistance}</span>
        </div>
        <div style={{
          fontSize: 12, color: W.muted, lineHeight: 1.4,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>
          {stop.description}
        </div>
      </div>
      <div style={{
        background: isChecked ? W.green : W.pink,
        borderRadius: 14, width: 52, height: 52,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}>
        <Icon
          icon={isChecked ? "tdesign:map-unlocked-filled" : "tdesign:map-locked-filled"}
          width="26" height="26" style={{ color: "#fff" }}
        />
      </div>
    </div>
  );
}

export default function TripDetailPage({ trip: initialTrip, onBack, onHome }: TripDetailPageProps) {
  const trip = initialTrip;

  const [activeTab, setActiveTab] = useState<"my" | "all">("all");
  const [cafes, setCafes] = useState<any[]>([]);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);

  // ── sync activeTab จาก Firestore ───────────────────────────────────────────
  useEffect(() => {
    const auth = getAuth();
    const unsubTab = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const missionSnap = await getDoc(doc(db, "userMissions", user.uid));
      if (missionSnap.exists() && missionSnap.data().status === "active") {
        setActiveTab("my");
      } else {
        // fallback localStorage
        setActiveTab(localStorage.getItem("activeMission") ? "my" : "all");
      }
    });
    return () => unsubTab();
  }, []);

  // ── 3. เพิ่ม State สำหรับตำแหน่งผู้ใช้ ──────────────────────────────────────────
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchCafes = async () => {
      const snap = await getDocs(collection(db, "locations"));
      setCafes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCafes();

    // ── 4. ดึงพิกัดตำแหน่งปัจจุบัน ────────────────────────────────────────────────
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLoc({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Error Geolocation:", error),
        {
          enableHighAccuracy: true, // ✅ ขอตำแหน่งแม่นยำสูง
          timeout: 5000,            // ✅ ถ้าเกิน 5 วินาทีให้เลิกคอย
          maximumAge: 60000         // ✅ ใช้ค่าตำแหน่งเดิมที่เคยดึงไว้ได้ภายใน 1 นาที (ช่วยให้กดเข้าใหม่แล้วโหลดเร็วขึ้น)
        }
      );
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const missionSnap = await getDoc(doc(db, "userMissions", user.uid));

      if (!missionSnap.exists()) {
        setHistoryIds(new Set());
        return;
      }

      const missionData = missionSnap.data();

      if (
        missionData.status !== "active" &&
        missionData.status !== "completed"
      ) {
        setHistoryIds(new Set());
        return;
      }

      if (String(missionData.tripId) !== String(trip.id)) {
        setHistoryIds(new Set());
        return;
      }

      const checkedIds = missionData.checkedLocationIds || [];
      setHistoryIds(new Set(checkedIds.map((id: any) => String(id).trim())));
    });

    return () => unsubscribe();
  }, [trip.id]);

  const getCafeId = (stopName: string) => {
    const match = cafes.find(c => c.locationName === stopName);
    return match?.id;
  };

  if (!trip || !trip.stops) return <div>Loading...</div>;

  const checkedCount = trip.stops.filter((s: any) =>
    historyIds.has(s.location_id) || historyIds.has(s.locationId)
  ).length;

  if (showMap) {
    return (
      <TripMapPage
        trip={trip}
        onHome={onHome ?? onBack}
        onMapClose={() => setShowMap(false)}
        onClaim={async () => {
          // ── อัปเดต Firestore ──────────────────────────────────────────
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            const missionRef = doc(db, "userMissions", user.uid);
            await setDoc(
              missionRef,
              { status: "completed", completedAt: serverTimestamp() },
              { merge: true }
            );
          }

          // ── clear localStorage ────────────────────────────────────────
          localStorage.removeItem("activeMission");
          localStorage.removeItem("activeMissionId");
          localStorage.removeItem("activeMissionCompleted");

          alert("🎉 Congratulations! You've claimed your points!");
          setShowMap(false);
        }}
      />
    );
  }

  return (
    <>
      <style jsx global>{`
      body{
        background-image:  url('/photo/background.jpg');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
    `}</style>

      <div style={{
        width: "100%", maxWidth: "1100px", minHeight: "100vh", background: "#fff",
        borderRadius: "24px", overflow: "hidden", display: "flex",
        flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        margin: "0 auto", backdropFilter: "blur(6px)",
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: W.bg }}>

          {/* Header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 20, background: W.white,
            borderBottom: `1px solid ${W.lightGray}`, display: "flex",
            alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
          }}>
            <button onClick={onBack} style={{
              width: 42, height: 42, borderRadius: "50%", background: W.dark,
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: W.white, flexShrink: 0,
            }}>
              <Icon icon="lucide:chevron-left" width="22" height="22" />
            </button>
            <span style={{ fontSize: 17, fontWeight: 800, color: W.text, flex: 1, textAlign: "center" }}>
              {trip.title}
            </span>
            <div style={{ width: 42 }} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <RouteIllustration onClick={() => setShowMap(true)} />

            <div style={{ padding: "0 20px 40px" }}>
              <div style={{
                background: W.yellow, borderRadius: 24, padding: "20px",
                display: "flex", alignItems: "center", gap: 16, margin: "24px 0",
                boxShadow: "0 4px 15px rgba(239,187,58,0.2)",
              }}>
                <Icon icon="material-symbols:rewarded-ads" width="80" height="80" color={W.white} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: W.text }}>Get {trip.points} points</div>
                  <div style={{ fontSize: 14, color: W.text, lineHeight: 1.5, marginTop: 4, fontWeight: 500 }}>
                    เช็คอินครบทุกที่รับแต้มไปเลย! ระบบจะปลดล็อคให้อัตโนมัติเมื่อคุณไปเช็คอินที่ร้าน
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: W.text }}>เส้นทางแนะนำ</div>
                <div style={{ fontSize: 13, color: W.muted }}>{checkedCount} / {trip.stops.length} ที่</div>
              </div>

              <div style={{ height: 6, background: W.lightGray, borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 4, background: W.green,
                  width: `${(checkedCount / trip.stops.length) * 100}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {trip.stops.map(stop => (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    trip={trip}
                    isChecked={historyIds.has((stop as any).location_id) || historyIds.has((stop as any).locationId)}
                    getCafeId={getCafeId}
                    userLoc={userLoc} // ✅ ส่งตำแหน่งไปคำนวณ
                    cafes={cafes}     // ✅ ส่งข้อมูลร้านไปหาพิกัด
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}