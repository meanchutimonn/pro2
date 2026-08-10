"use client";
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import TripMapPage from "./TripMapPage";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  doc, getDoc, setDoc, serverTimestamp,
  addDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getReviews } from "@/lib/reviewService";
import LoginRequiredModal from "@/app/components/LoginRequiredModal";

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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  onOpenPopup, // 🔔 รับฟังก์ชันเปิดคุมป๊อปอัพมาทำงานแทน window.confirm
}: {
  stop: TripStop;
  trip: TripDetail;
  isChecked: boolean;
  getCafeId: (name: string) => string | undefined;
  userLoc: { lat: number; lng: number } | null;
  cafes: any[];
  reviewStat?: { avg: number; count: number };
  onOpenPopup: (stopName: string, getCafeIdFn: any) => void;
}) {
  const cafeData = cafes.find(c => c.locationName === stop.name);

  const displayRating = cafeData?.rating || cafeData?.averageRating || stop.rating || 0;
  let displayDistance = stop.distance || "0.0 km"; 

  if (userLoc && cafeData?.latitude && cafeData?.longitude) {
    const dist = calculateDistance(userLoc.lat, userLoc.lng, cafeData.latitude, cafeData.longitude);
    displayDistance = `${dist.toFixed(1)} km`;
  }

  return (
    <div
      onClick={() => onOpenPopup(stop.name, getCafeId)}
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
        background: `url('${stop.image || cafeData?.mainImage || "/photo/tripextra.png"}') center/cover #eee`,
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left", alignItems: "flex-start" }}>
        <div style={{ fontSize: "clamp(14px, 4vw, 16px)", fontWeight: 800, color: W.text, marginBottom: "clamp(2px, 1vw, 4px)", width: "100%", lineHeight: 1.3, wordBreak: "break-word" }}>
          {stop.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "clamp(3px, 1.5vw, 5px)", marginBottom: "clamp(4px, 1.5vw, 6px)", rowGap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <span>⭐</span> <span style={{ fontSize: '13px', fontWeight: '800', margin: "4px 0" }}>{(reviewStat?.avg || 0).toFixed(1)}</span>
          </div>
          <span style={{ color: "#aaa", fontSize: "clamp(11px, 3vw, 13px)", margin: '4px 0', flexShrink: 0, lineHeight: 1 }}>|</span>
          <span style={{ fontSize: "clamp(13px, 3vw, 13px)", color: W.text, whiteSpace: "nowrap", flexShrink: 0 }}>{displayDistance}</span>
        </div>
        <div style={{ fontSize: "clamp(11px, 3vw, 12px)", color: W.muted, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>
          {stop.description}
        </div>
      </div>
      <div style={{
        background: isChecked ? W.green : W.pink,
        borderRadius: 14, width: 52, height: 52,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}>
        <Icon icon={isChecked ? "tdesign:map-unlocked-filled" : "tdesign:map-locked-filled"} width="26" height="26" style={{ color: "#fff" }} />
      </div>
    </div>
  );
}

export default function TripDetailPage({ trip: initialTrip, onBack, onHome }: TripDetailPageProps) {
  const trip = initialTrip;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");

  const [activeTab, setActiveTab] = useState<"my" | "all">("all");
  const [cafes, setCafes] = useState<any[]>([]);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [reviewStats, setReviewStats] = useState<Record<string, { avg: number; count: number }>>({});
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // ── 🔔 [NEW] State สำหรับจัดการ Custom Popup แจ้งเตือนแอปพลิเคชัน ──
  const [activeMissionPopup, setActiveMissionPopup] = useState<{ isOpen: boolean; title: string }>({ isOpen: false, title: "" });
  const [startMissionPopup, setStartMissionPopup] = useState<{ isOpen: boolean; cafeId: string }>({ isOpen: false, cafeId: "" });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [missionStatus, setMissionStatus] = useState<"none" | "active" | "completed">("none");

  useEffect(() => {
    const auth = getAuth();
    const unsubTab = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMissionStatus("none");
        return;
      }

      const missionSnap = await getDoc(doc(db, "userMissions", user.uid));
      if (missionSnap.exists()) {
        const missionData = missionSnap.data();
        const isCurrentTrip = String(missionData.tripId) === String(trip.id);
        if (missionData.status === "active" && isCurrentTrip) {
          setMissionStatus("active");
          setActiveTab("my");
        } else if (missionData.status === "completed" && isCurrentTrip) {
          setMissionStatus("completed");
          setActiveTab(localStorage.getItem("activeMission") ? "my" : "all");
        } else {
          setMissionStatus("none");
          setActiveTab(localStorage.getItem("activeMission") ? "my" : "all");
        }
      } else {
        setMissionStatus("none");
        setActiveTab(localStorage.getItem("activeMission") ? "my" : "all");
      }
    });
    return () => unsubTab();
  }, [trip.id]);

  useEffect(() => {
    const fetchCafes = async () => {
      const snap = await getDocs(collection(db, "locations"));
      setCafes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCafes();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => console.error("Error Geolocation:", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
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
      if (missionData.status !== "active" && missionData.status !== "completed") {
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
          const avg = reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / reviews.length : 0;
          stats[stop.name] = { avg, count: reviews.length };
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

  const firstStopCafeId = trip.stops[0] ? getCafeId(trip.stops[0].name) || "" : "";
  const showStartMissionButton = !!getAuth().currentUser;

  // ── 🔔 [NEW FUNCTION] ฟังก์ชันคัดกรองลอจิกความปลอดภัยก่อนเข้าหน้าร้านค้า ──
  const handleCheckMissionBeforeNavigate = async (stopName: string, getCafeIdFn: any) => {
    const cafeId = getCafeIdFn(stopName);
    if (!cafeId) return;

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const missionRef = doc(db, "userMissions", user.uid);
    const missionSnap = await getDoc(missionRef);
    const missionData = missionSnap.exists() ? missionSnap.data() : null;

    const hasActiveMission =
      missionData &&
      missionData.status === "active" &&
      String(missionData.tripId) !== String(trip.id);

    // กรณีมีภารกิจอื่นค้างอยู่ -> เปิด Custom Popup แจ้งเตือน
    if (hasActiveMission) {
      const missionTitle = missionData.tripTitle || "ภารกิจปัจจุบัน";
      setActiveMissionPopup({ isOpen: true, title: missionTitle });
      return;
    }

    const isNewMission = !missionData || String(missionData.tripId) !== String(trip.id);

    // กรณีเป็นทริปใหม่ที่ยังไม่เคยเริ่มทำ -> เปิด Custom Popup ถามความสมัครใจ
    if (isNewMission) {
      setStartMissionPopup({ isOpen: true, cafeId: cafeId });
      return;
    }

    // หากเปิดภารกิจนี้ทิ้งไว้อยู่แล้ว ให้ผ่านเข้าหน้าร้านได้ทันที
    navigateToCafeDirectly(cafeId);
  };

  // ── ฟังก์ชันกดยืนยันการเริ่มทำภารกิจใหม่จริง ๆ ──
  const handleConfirmStartNewMission = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const missionRef = doc(db, "userMissions", user.uid);
      await setDoc(missionRef, {
        tripId: trip.id,
        tripTitle: trip.title,
        tripData: trip,
        status: "active",
        startedAt: serverTimestamp(),
        completedAt: null,
      });

      localStorage.setItem("activeMission", JSON.stringify(trip));
      localStorage.setItem("activeMissionId", String(trip.id));
      localStorage.setItem("activeMissionCompleted", "false");

      const targetId = startMissionPopup.cafeId;
      setStartMissionPopup({ isOpen: false, cafeId: "" });
      router.push(`/cafe/${targetId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const navigateToCafeDirectly = (cafeId: string) => {
    localStorage.setItem("activeMission", JSON.stringify(trip));
    localStorage.setItem("activeMissionId", String(trip.id));
    localStorage.setItem("activeMissionCompleted", "false");
    router.push(`/cafe/${cafeId}`);
  };

  const handleBackCustom = () => {
    // Delegate navigation to the provided onBack handler to avoid double-push loops
    onBack();
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

            if (missionSnap.exists() && missionSnap.data().status === "completed") {
              alert("คุณรับรางวัลภารกิจนี้ไปแล้ว");
              return;
            }

            await setDoc(missionRef, { status: "completed", completedAt: serverTimestamp() }, { merge: true });
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
        
        /* สไตล์โมดอล Popup คุมโทนสไตล์น้ำตาลแอปพลิเคชัน */
        .customOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(4px); padding: 16px; }
        .customAlertCard { background: white; width: 100%; max-width: 340px; border-radius: 24px; padding: 28px 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.15); animation: zoomInEffect 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes zoomInEffect { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .popupIconBox { margin-bottom: 12px; display: flex; justify-content: center; }
        .popupTitle { font-size: 19px; font-weight: 800; color: #333; margin: 6px 0; }
        .popupDesc { font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 22px; white-space: pre-line; }
        .popupButtonGroup { display: flex; gap: 10px; }
        .btnCancel { flex: 1; background: #eee; color: #555; border: none; padding: 12px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer; }
        .btnPrimaryConfirm { flex: 1; background: #614124; color: white; border: none; padding: 12px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer; }
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
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: W.text }}>Get {trip.points} points</div>
                  <div style={{ fontSize: 14, color: W.text, lineHeight: 1.5, marginTop: 4, fontWeight: 500 }}>
                    เช็คอินครบทุกที่รับแต้มไปเลย! ระบบจะปลดล็อคให้อัตโนมัติเมื่อคุณไปเช็คอินที่ร้าน
                  </div>
                </div>
              </div>

              {showStartMissionButton && (
                <div
                  onClick={async () => {
                    const auth = getAuth();
                    const user = auth.currentUser;
                    if (!user) return;

                    const missionRef = doc(db, "userMissions", user.uid);
                    const missionSnap = await getDoc(missionRef);
                    const missionData = missionSnap.exists() ? missionSnap.data() : null;

                    if (missionData && missionData.status === "active") {
                      const missionTitle = missionData.tripTitle || "ภารกิจปัจจุบัน";
                      setActiveMissionPopup({ isOpen: true, title: missionTitle });
                      return;
                    }

                    // ไม่มีภารกิจค้าง -> เปิด popup ยืนยันเริ่มภารกิจใหม่ตามปกติ
                    setStartMissionPopup({ isOpen: true, cafeId: firstStopCafeId });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: "#FFF7E6",
                    border: "1px solid #FCE8B8",
                    borderRadius: 18,
                    padding: "14px 16px",
                    marginBottom: 18,
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 24, height: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon icon="lucide:flag" width="22" height="22" color={W.text} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: W.text }}>
                      เริ่มภารกิจได้เลย!
                    </div>
                    <div style={{ fontSize: 12, color: W.muted, marginTop: 2 }}>
                      เริ่มบันทึกการเดินทางและเช็คอินได้เลย
                    </div>
                  </div>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const auth = getAuth();
                      const user = auth.currentUser;
                      if (!user) return;

                      const missionRef = doc(db, "userMissions", user.uid);
                      const missionSnap = await getDoc(missionRef);
                      const missionData = missionSnap.exists() ? missionSnap.data() : null;

                      if (missionData && missionData.status === "active") {
                        const missionTitle = missionData.tripTitle || "ภารกิจปัจจุบัน";
                        setActiveMissionPopup({ isOpen: true, title: missionTitle });
                        return;
                      }

                      setStartMissionPopup({ isOpen: true, cafeId: firstStopCafeId });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: W.dark,
                      color: W.white,
                      border: "none",
                      borderRadius: 12,
                      padding: "9px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon icon="lucide:flag" width="14" height="14" />
                    <span>เริ่มภารกิจ</span>
                  </button>
                </div>
              )}
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
                    onOpenPopup={handleCheckMissionBeforeNavigate} // 🔔 ส่งตัวเช็คเข้าหน้าแบบคัสตอมบาร์
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 🔔 [POPUP 1] แจ้งเตือนเมื่อมีภารกิจทริปอื่นค้างอยู่ คุมโทนสีส้ม/น้ำตาลแบรนด์ ── */}
      {activeMissionPopup.isOpen && (
        <div className="customOverlay" onClick={() => setActiveMissionPopup({ isOpen: false, title: "" })}>
          <div className="customAlertCard" onClick={(e) => e.stopPropagation()}>
            <div className="popupIconBox">
              <Icon icon="solar:danger-triangle-bold-duotone" width="58" color="#EFBB3A" />
            </div>
            <h3 className="popupTitle">มีภารกิจค้างอยู่</h3>
            <p className="popupDesc">
              คุณกำลังทำภารกิจ "{activeMissionPopup.title}" อยู่ในขณะนี้ 
              กรุณาทำภารกิจเดิมให้เสร็จสิ้นก่อนเริ่มเส้นทางใหม่ครับ
            </p>
            <div className="popupButtonGroup">
              <button className="btnCancel" onClick={() => setActiveMissionPopup({ isOpen: false, title: "" })}>ปิด</button>
              <button className="btnPrimaryConfirm" onClick={() => {
                setActiveMissionPopup({ isOpen: false, title: "" });
                router.push("/mission");
              }}>
                ไปที่ภารกิจค้างอยู่
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginRequiredModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* ── 🔔 [POPUP 2] หน้าต่างยืนยันเข้าร่วมภารกิจใหม่สไตล์ Minimal ── */}
      {startMissionPopup.isOpen && (
        <div className="customOverlay" onClick={() => setStartMissionPopup({ isOpen: false, cafeId: "" })}>
          <div className="customAlertCard" onClick={(e) => e.stopPropagation()}>
            <div className="popupIconBox">
              <Icon icon="solar:map-compass-bold-duotone" width="58" color="#614124" />
            </div>
            <h3 className="popupTitle">เริ่มภารกิจใหม่?</h3>
            <p className="popupDesc">
              ต้องการเริ่มภารกิจเส้นทาง "{trip.title}" ใช่หรือไม่? 
              ระบบจะเริ่มบันทึกและนับจำนวนการเช็คอินบนเส้นทางนี้ให้คุณทันที
            </p>
            <div className="popupButtonGroup">
              <button className="btnCancel" onClick={() => setStartMissionPopup({ isOpen: false, cafeId: "" })}>ยกเลิก</button>
              <button className="btnPrimaryConfirm" onClick={handleConfirmStartNewMission}>
                เริ่มภารกิจเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}