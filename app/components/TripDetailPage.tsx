"use client";
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import TripMapPage from "./TripMapPage";
// 🛠️ ตรวจสอบให้มั่นใจว่าดึง useRouter และ useSearchParams มาใช้งาน
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  doc, getDoc, setDoc, serverTimestamp,
  addDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getReviews } from "@/lib/reviewService";

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
  const buttonStyle: React.CSSProperties = {
    background: "#FFFFFF",       
    color: "#614124",            
    border: "3px solid #614124", 
    padding: "10px 24px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: "800",           
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 6px 0px #614124", 
    letterSpacing: "0.5px",
    marginTop: "4px",            
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
  };

  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", height: 400,
        background: W.yellow,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",             
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
      }}
      title="คลิกเพื่อดูแผนที่เส้นทาง"
    >
      <Icon
        icon="memory:map"
        width="110"
        height="110"
        style={{ color: "#614124", opacity: 0.95, filter: "drop-shadow(0px 2px 0px rgba(0,0,0,0.1))" }}
      />

      <div style={buttonStyle}>
        <Icon icon="lucide:map" width="20" height="20" color="#614124" />
        YOUR JOURNEY
      </div>

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

function StopRow({
  stop,
  trip,
  isChecked,
  getCafeId,
  userLoc,
  cafes,
  reviewStat,
}: {
  stop: TripStop;
  trip: TripDetail;
  isChecked: boolean;
  getCafeId: (name: string) => string | undefined;
  userLoc: { lat: number; lng: number } | null;
  cafes: any[];
  reviewStat?: {
    avg: number;
    count: number;
  };
}) {
  const router = useRouter();
  const cafeData = cafes.find(c => c.locationName === stop.name);

  const displayRating =
    cafeData?.rating ||
    cafeData?.averageRating ||
    stop.rating ||
    0;

  let displayDistance = stop.distance || "0.0 km"; 

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
        background: `url('${stop.image || cafeData?.mainImage || "/photo/placeholder.jpg"}') center/cover #eee`,
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left", alignItems: "flex-start" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            textAlign: "left",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: "clamp(14px, 4vw, 16px)",
              fontWeight: 800,
              color: W.text,
              marginBottom: "clamp(2px, 1vw, 4px)",
              width: "100%",
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {stop.name}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",          
              gap: "clamp(3px, 1.5vw, 5px)",
              marginBottom: "clamp(4px, 1.5vw, 6px)",
              rowGap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <span>⭐</span> <span style={{
                fontSize: '13px', fontWeight: '800', gap: 8,
                margin: "4px 0"
              }}>
                {(reviewStat?.avg || 0).toFixed(1)}
              </span>
            </div>

            <span
              style={{
                color: "#aaa",
                fontSize: "clamp(11px, 3vw, 13px)",
                margin: '4px 0',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              |
            </span>

            <span
              style={{
                fontSize: "clamp(13px, 3vw, 13px)",
                color: W.text,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {displayDistance}
            </span>
          </div>

          <div
            style={{
              fontSize: "clamp(11px, 3vw, 12px)",
              color: W.muted,
              lineHeight: 1.5,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              wordBreak: "break-word",
            }}
          >
            {stop.description}
          </div>
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
  
  // 🛠️ จุดแก้ไขสำคัญ: เรียกใช้ router และ searchParams สำหรับจัดการปุ่มย้อนกลับแบบข้ามหน้า
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");

  const [activeTab, setActiveTab] = useState<"my" | "all">("all");
  const [cafes, setCafes] = useState<any[]>([]);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [reviewStats, setReviewStats] = useState<Record<string, {
    avg: number;
    count: number;
  }>>({});

  useEffect(() => {
    const auth = getAuth();
    const unsubTab = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const missionSnap = await getDoc(doc(db, "userMissions", user.uid));
      if (missionSnap.exists() && missionSnap.data().status === "active") {
        setActiveTab("my");
      } else {
        setActiveTab(localStorage.getItem("activeMission") ? "my" : "all");
      }
    });
    return () => unsubTab();
  }, []);

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchCafes = async () => {
      const snap = await getDocs(collection(db, "locations"));
      setCafes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCafes();

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
          enableHighAccuracy: true, 
          timeout: 5000,            
          maximumAge: 60000         
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

  useEffect(() => {
    const loadReviewStats = async () => {
      if (cafes.length === 0 || !trip?.stops) return;

      const stats: Record<string, { avg: number; count: number }> = {};

      await Promise.all(
        trip.stops.map(async (stop) => {
          const cafeData = cafes.find(c => c.locationName === stop.name);
          if (!cafeData?.id) return;

          const reviews = await getReviews(cafeData.id);

          const avg =
            reviews.length > 0
              ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / reviews.length
              : 0;

          stats[stop.name] = {
            avg,
            count: reviews.length,
          };
        })
      );

      setReviewStats(stats);
    };

    loadReviewStats();
  }, [cafes, trip]);

  const getCafeId = (stopName: string) => {
    const match = cafes.find(c => c.locationName === stopName);
    return match?.id;
  };

  // 🛠️ ฟังก์ชันย้อนกลับตัวใหม่: สั่งปิด Component ด้วย และพาวาร์ปไปหน้า Mission พร้อมกันเลย
  const handleBackCustom = () => {
    if (fromPage === "mission") {
      onBack();                 // 1. สั่งปิดหน้าต่างทริปนี้ (เคลียร์ State หน้าหลัก)
      router.push("/mission");   // 2. ลัดคิวพาวาร์ปเปลี่ยน URL หนีไปที่หน้า Mission ทันที
    } else {
      onBack();                 // ถ้าเปิดมาจากหน้าแรกปกติ ก็ให้ปิดตัวตาม Flow เดิม
    }
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
          const auth = getAuth();
          const user = auth.currentUser;
          if (user) {
            const missionRef = doc(db, "userMissions", user.uid);
            const missionSnap = await getDoc(missionRef);

            if (
              missionSnap.exists() &&
              missionSnap.data().status === "completed"
            ) {
              alert("คุณรับรางวัลภารกิจนี้ไปแล้ว");
              return;
            }

            await setDoc(
              missionRef,
              { status: "completed", completedAt: serverTimestamp() },
              { merge: true }
            );

            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              title: "ภารกิจสำเร็จ 🎉",
              body: `คุณทำภารกิจสำเร็จแล้ว ได้รับ ${trip.points} คะแนน`,
              type: "mission_complete",
              missionId: trip.id,
              missionName: trip.title,
              points: trip.points || 50,
              read: false,
              createdAt: serverTimestamp(),
            });
          }

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
       backdropFilter: "blur(6px)",
        margin: typeof window !== "undefined" && window.innerWidth >= 768 ? "40px auto" : "0px auto",
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: W.bg }}>

          {/* Header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 20, background: W.white,
            borderBottom: `1px solid ${W.lightGray}`, display: "flex",
            alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
          }}>
            {/* 🛠️ เปลี่ยนการทำงานมาใช้ handleBackCustom ที่เราสร้างไว้ */}
            <button onClick={handleBackCustom} style={{
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
                    userLoc={userLoc} 
                    cafes={cafes}     
                    reviewStat={reviewStats[stop.name]}
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