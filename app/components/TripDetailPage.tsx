"use client";
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import TripMapPage from "./TripMapPage";
import { useRouter } from "next/navigation";
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

// ── แก้ไขคอมโพเนนต์ RouteIllustration ปรับตำแหน่งใต้ไอคอน และเปลี่ยนสีปุ่มให้เด่นชัดขึ้น ──
function RouteIllustration({ onClick }: { onClick?: () => void }) {
  // สไตล์สำหรับปุ่มที่เด่นชัด ไม่จมกลืน และอยู่ใต้ไอคอนพอดี
  const buttonStyle: React.CSSProperties = {
    background: "#FFFFFF",       // ✅ เปลี่ยนเป็นสีขาวเพื่อให้ตัดกับพื้นหลังสีเหลืองชัดเจน
    color: "#614124",            // ✅ ใช้สีน้ำตาลเข้ม (W.dark) เป็นสีตัวอักษรให้เข้าธีมแอป
    border: "3px solid #614124", // ✅ เพิ่มขอบสีน้ำตาลเข้มหนาขึ้นนิดนึงสไตล์ Modern-Pixel
    padding: "10px 24px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: "800",           // ✅ เพิ่มความหนาตัวอักษรให้อ่านง่ายขึ้น
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 6px 0px #614124", // ✅ เปลี่ยนเงาเป็นแนวพิกเซลดรอปชาโดว์หนาๆ ด้านล่าง เพิ่มมิติให้ปุ่มลอยขึ้นมา
    letterSpacing: "0.5px",
    marginTop: "4px",            // ✅ ขยับระยะตำแหน่งด้านบนเล็กน้อยเมื่อรวมกลุ่ม
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
  };

  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", height: 400,
        background: W.yellow,
        position: "relative",
        // ✅ เปลี่ยนมาใช้ Flexbox จัดระเบียบกลุ่มไอคอนและปุ่มให้อยู่กึ่งกลางร่วมกันในแนวตั้ง
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",             // ✅ จัดระยะห่างระหว่างไอคอนแผนที่กับปุ่ม Your Journey ให้พอดี ไม่ดูจงใจแยกส่วนกันเกินไป
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
      }}
      title="คลิกเพื่อดูแผนที่เส้นทาง"
    >
      {/* 🗺️ ไอคอนแผนที่ขนาดใหญ่ */}
      <Icon
        icon="memory:map"
        width="110"
        height="110"
        style={{ color: "#614124", opacity: 0.95, filter: "drop-shadow(0px 2px 0px rgba(0,0,0,0.1))" }}
      />

      {/* ── 💡 ปุ่มสไตล์ใหม่: สีตัดชัดเจน อยู่ใต้ไอคอนพอดี ไม่หนักบนล่าง ── */}
      <div style={buttonStyle}>
        <Icon icon="lucide:map" width="20" height="20" color="#614124" />
        YOUR JOURNEY
      </div>

      {/* ลายตารางพื้นหลังแบบจาง */}
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

// ── แก้ ปรับ StopRow ให้รับ userLoc และ cafes เพื่อคำนวณระยะทาง ──────────────────────
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

  // หาพิกัดร้านจากข้อมูลที่ดึงมาจาก Firebase
  const cafeData = cafes.find(c => c.locationName === stop.name);

  const displayRating =
    cafeData?.rating ||
    cafeData?.averageRating ||
    stop.rating ||
    0;

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

        // ── แก้ ดึง active mission จาก Firestore ──────────────────────────
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

        // ── แก้ mission นี้ยังไม่ได้ activate → confirm ก่อน ─────────
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

        // ── แก้ sync localStorage ด้วย (เพื่อ TripMapPage ที่ยังอ่านอยู่) ──
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
      {/* 1. รูปภาพสถานที่ */}
      <div style={{
        width: 85, height: 85, borderRadius: 15,
        // 💡 ดักดึงรูปจาก stop.image ถ้าไม่มีให้ดึงจากฟีลด์ใน cafeData (ทั้งตัวเล็กตัวใหญ่)
        background: `url('${stop.image || cafeData?.mainImage || "/photo/placeholder.jpg"}') center/cover #eee`,
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }} />
      {/* 2. รายละเอียดข้อความ (ลบส่วนซ้ำซ้อนออกแล้ว) */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left", alignItems: "flex-start" }}>

        {/*<div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 4, width: "100%" }}>{stop.name}</div>*/}
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
          {/* ชื่อสถานที่ */}
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

          {/* Rating + Distance row — wrap ได้บนหน้าจอเล็ก */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",          // ← สำคัญ: ขึ้นบรรทัดใหม่เมื่อพื้นที่ไม่พอ
              gap: "clamp(3px, 1.5vw, 5px)",
              marginBottom: "clamp(4px, 1.5vw, 6px)",
              rowGap: 4,
            }}
          >
            {/* ดาว */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <span>⭐</span> <span style={{
                fontSize: '13px', fontWeight: '800', gap: 8,
                margin: "4px 0"
              }}>
                {(reviewStat?.avg || 0).toFixed(1)}
              </span>
            </div>

            {/* คะแนนและจำนวนรีวิว */}
            {/* Divider — ซ่อนได้เมื่อ wrap */}
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

            {/* ระยะทาง */}
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

          {/* คำอธิบาย */}
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

  const [activeTab, setActiveTab] = useState<"my" | "all">("all");
  const [cafes, setCafes] = useState<any[]>([]);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [reviewStats, setReviewStats] = useState<Record<string, {
    avg: number;
    count: number;
  }>>({});
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
          // แก้ อัปเดต Firestore ──────────────────────────────────────────
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