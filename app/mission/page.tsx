"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import TripMapPage from "../components/TripMapPage";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  doc, getDoc, setDoc, serverTimestamp,
  addDoc,
  increment,
  updateDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { TripStop } from "../components/TripDetailPage";
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

// ── ฟังก์ชันคำนวณระยะทาง (Haversine) ──────────────────────────────────────────
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export interface TripDetail {
  id: number;
  title: string;
  heroImage: string;
  points: number;
  stops: TripStop[];
}

const allTrips = [
  {
    id: 1,
    title: "สงบใจในอาราม",
    subtitle: "ในวันที่ชีวิตหมุนเร็วเกินไปจนเกิดความเหนื่อยล้า เราขอชวนคุณทิ้งความวุ่นวายไว้ข้างหลัง แล้วออกเดินทางไปสัมผัสความสงบภายใน",
    image: "/photo/tripextra.png",
    heroImage: "/photo/tripextra.png",
    points: 50,
    stops: [],
  },
  {
    id: 2,
    title: "The Green Caffeine Tour",
    subtitle: 'ร่วมเดินทางในทริปพิเศษที่จะพาไป "Hopping" คาเฟ่ที่ดีที่สุดในย่านสามพราน ทริปที่คัดมาแล้วว่าไม่ได้มีดีแค่กาแฟ',
    image: "/photo/cafacontent.png",
    heroImage: "/photo/cafacontent.png",
    points: 50,
    stops: [],
  },
  {
    id: 3,
    title: "One Day Magic Sam Phran",
    subtitle: "มาเปลี่ยนวันว่างธรรมดา ให้เป็นวันแห่งการพักผ่อนที่สามพราน",
    image: "/photo/foodcontent.png",
    heroImage: "/photo/tripextra.png",
    points: 50,
    stops: [],
  },
];

function getStopId(stop: any): string {
  return String(
    stop.location_id || stop.locationId || stop.cafeId || stop.id || ""
  ).trim();
}

function StopRow({
  stop,
  isChecked,
  getCafeId,
  onMapClick,
  userLoc,
  cafes,
  reviewStat,
}: {
  stop: TripStop;
  isChecked: boolean;
  getCafeId: (name: string) => string | undefined;
  onMapClick: () => void;
  userLoc: { lat: number; lng: number } | null;
  cafes: any[];
  reviewStat?: {
    avg: number;
    count: number;
  };
}) {
  const router = useRouter();
  const cafeData = cafes.find((c) => c.locationName === stop.name);
  let displayDistance = stop.distance || "0.0 km";
  if (userLoc && cafeData?.latitude && cafeData?.longitude) {
    const d = calculateDistance(
      userLoc.lat, userLoc.lng,
      Number(cafeData.latitude), Number(cafeData.longitude)
    );
    displayDistance = `${d.toFixed(1)} km`;
  }

  return (
    <div
      onClick={() => {
        const cafeId = getCafeId(stop.name);
        if (cafeId) router.push(`/cafe/${cafeId}`);
      }}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 0", borderBottom: `1px solid ${W.lightGray}`,
        cursor: "pointer",
      }}
    >
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36 }}>
        {isChecked ? (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: W.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon icon="lucide:check" width="20" height="20" color="white" />
          </div>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: W.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>{stop.id + 1}</span>
          </div>
        )}
      </div>

      <div style={{
        width: 85, height: 85, borderRadius: 15,
        background: `url('${stop.image}') center/cover #eee`,
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: W.text, marginBottom: 4 }}>{stop.name}</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>⭐</span> <span style={{ fontSize: '13px', fontWeight: '800', margin: "4px 5px" }}>
            {(reviewStat?.avg || 0).toFixed(1)}
          </span>
          <span style={{ fontSize: '13px', color: '#aaa', margin: '4px 0' }}>|</span>
          <span style={{ fontSize: 13, color: W.text, margin: '5px 5px' }}>{displayDistance}</span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isChecked) {
            onMapClick();
          } else {
            alert("📍 คุณต้องไปเช็คอินที่สถานที่นี้ก่อนเพื่อดูในแผนที่ค่ะ");
          }
        }}
        style={{
          background: isChecked ? W.green : W.pink,
          borderRadius: 14, width: 52, height: 52,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          border: "none", cursor: "pointer",
        }}
      >
        <Icon
          icon={isChecked ? "tdesign:map-unlocked-filled" : "tdesign:map-locked-filled"}
          width="26" height="26" style={{ color: "#fff" }}
        />
      </button>
    </div>
  );
}

export default function MissionPage() {
  const router = useRouter();
  const contentTopRef = useRef<HTMLDivElement>(null);

  const [cafes, setCafes] = useState<any[]>([]);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [activeMission, setActiveMission] = useState<TripDetail | null>(null);
  const [missionLoading, setMissionLoading] = useState(true);

  // ── States แจ้งเตือน ────────────────────────────────────────────────────────
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [showClaimedPopup, setShowClaimedPopup] = useState(false);
  const [latestPointsEarned, setLatestPointsEarned] = useState(50);

  const [reviewStats, setReviewStats] = useState<Record<string, { avg: number; count: number }>>({});
  const [randomImages, setRandomImages] = useState<{ temple: string | null; cafe: string | null; all: string | null }>({
    temple: null, cafe: null, all: null
  });

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMissionLoading(false);
        return;
      }

      const missionSnap = await getDoc(doc(db, "userMissions", user.uid));
      if (missionSnap.exists()) {
        const data = missionSnap.data();
        // เงื่อนไข: ถ้าเป็น active หรือ completed แต่ "ยังไม่ได้เคลมรางวัล" (rewardClaimed != true) ให้ดึงข้อมูลมาทำต่อ/เตรียมเคลม
        if (
          (data.status === "active" || data.status === "completed") &&
          !data.rewardClaimed &&
          data.tripData
        ) {
          setActiveMission(data.tripData as TripDetail);
          setActiveTab("my");
        } else {
          setActiveMission(null);
          setActiveTab("all");
        }
      } else {
        setActiveMission(null);
        setActiveTab("all");
      }
      setMissionLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "locations"));
      setCafes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log(err)
      );
    }
  }, []);

  useEffect(() => {
    if (!activeMission) return;
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
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
      if (String(missionData.tripId) !== String(activeMission.id)) {
        setHistoryIds(new Set());
        return;
      }
      const checkedIds = missionData.checkedLocationIds || [];
      setHistoryIds(new Set(checkedIds.map((id: any) => String(id).trim())));
    });
    return () => unsub();
  }, [activeMission]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        const templeImages: string[] = [];
        const cafeImages: string[] = [];
        const allImages: string[] = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.extraImages && Array.isArray(data.extraImages) && data.extraImages.length > 0) {
            if (data.category === "Temple") templeImages.push(...data.extraImages);
            if (data.category === "Cafe") cafeImages.push(...data.extraImages);
            allImages.push(...data.extraImages);
          }
        });

        setRandomImages({
          temple: templeImages.length > 0 ? templeImages[Math.floor(Math.random() * templeImages.length)] : null,
          cafe: cafeImages.length > 0 ? cafeImages[Math.floor(Math.random() * cafeImages.length)] : null,
          all: allImages.length > 0 ? allImages[Math.floor(Math.random() * allImages.length)] : null,
        });
      } catch (error) {
        console.error("Error loading images:", error);
      }
    };
    loadImages();
  }, []);

  const getCafeId = (stopName: string) => {
    return cafes.find((c) => c.locationName === stopName)?.id;
  };

  const checkedCount = activeMission
    ? activeMission.stops.filter((s) => historyIds.has(getStopId(s))).length
    : 0;

  // ตรวจสอบว่าเช็คอินครบถ้วนหรือยัง
  const isReadyToClaim =
    !!activeMission &&
    activeMission.stops.length > 0 &&
    checkedCount === activeMission.stops.length;

  // 💬 เมื่อทำภารกิจสำเร็จ ให้เด้งแค่แถบแบนเนอร์แจ้งเตือนด้านบน (ยังไม่สร้างโนติกระดิ่งในขั้นตอนนี้)
  useEffect(() => {
    if (isReadyToClaim) {
      setShowNotificationBanner(true);
    }
  }, [isReadyToClaim]);

  // 🎯 ฟังก์ชันสำหรับกดรับรางวัล (ทำงานเมื่อกดปุ่มเขียวหรือกดเคลมจากแผนที่)
  const handleClaim = async (mission?: TripDetail) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const active = mission || activeMission;
    if (!user || !active) return;

    const userRef = doc(db, "users", user.uid);
    const missionRef = doc(db, "userMissions", user.uid);
    const rewardPoints = active.points ?? 50;
    setLatestPointsEarned(rewardPoints);

    const missionSnap = await getDoc(missionRef);
    const missionData = missionSnap.data();

    // ป้องกันการกดเบิ้ลรับซ้ำ
    if (missionData?.rewardClaimed) {
      alert("คุณรับรางวัลภารกิจนี้ไปแล้ว");
      return;
    }

    // ปิดแบนเนอร์แจ้งเตือนด้านบนออกไป
    setShowNotificationBanner(false);

    // 1. อัปเดตคะแนนสะสมของผู้ใช้ใน Firebase
    await updateDoc(userRef, {
      balance: increment(rewardPoints),
    });

    // 2. ปรับสถานะมิชชันเป็นสมบูรณ์และรับรางวัลแล้ว
    await setDoc(
      missionRef,
      {
        status: "completed",
        rewardClaimed: true,
        completedAt: serverTimestamp(),
        claimedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. 🔔 สร้างข้อมูลแจ้งเตือนลงกล่องกระดิ่ง ณ จังหวะนี้เท่านั้น!
    await addDoc(collection(db, "notifications"), {
      userId: user.uid,
      title: "ภารกิจสำเร็จ 🎉",
      body: `คุณทำภารกิจสำเร็จแล้ว ได้รับ ${rewardPoints} คะแนน`,
      type: "mission_complete",
      missionId: active.id,
      missionName: active.title,
      points: rewardPoints,
      read: false,
      createdAt: serverTimestamp(),
    });

    // ล้าง Local Storage
    localStorage.removeItem("activeMission");
    localStorage.removeItem("activeMissionId");
    localStorage.removeItem("activeMissionCompleted");

    // 4. แสดง Pop-up ยืนยันการรับแต้มสำเร็จ
    setShowClaimedPopup(true);
  };

  const closeClaimedPopup = () => {
    setShowClaimedPopup(false);
    setActiveMission(null);
    setShowMap(false);
    setActiveTab("all");
  };

  const handleBannerClick = () => {
    setShowNotificationBanner(false);
    setActiveTab("my");
    if (contentTopRef.current) {
      contentTopRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const loadReviewStats = async () => {
      if (!activeMission || cafes.length === 0) return;
      const stats: Record<string, { avg: number; count: number }> = {};
      await Promise.all(
        activeMission.stops.map(async (stop) => {
          const cafeData = cafes.find((c) => c.locationName === stop.name);
          if (!cafeData?.id) return;
          const reviews = await getReviews(cafeData.id);
          const avg = reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / reviews.length : 0;
          stats[stop.name] = { avg, count: reviews.length };
        })
      );
      setReviewStats(stats);
    };
    loadReviewStats();
  }, [activeMission, cafes]);

  if (showMap && activeMission) {
    return (
      <TripMapPage
        trip={activeMission}
        onHome={() => setShowMap(false)}
        onMapClose={() => setShowMap(false)}
        onClaim={() => handleClaim(activeMission)}
      />
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          background-image: url("/photo/background.jpg");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .appContainer {
          width: 100%;
          max-width: 1100px;
          min-height: 100vh;
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          margin: 0 auto;
          position: relative;
        }
          /* ถ้าเปิดบนจอคอมพิวเตอร์ขนาดใหญ่ ให้มีพื้นที่เว้นขอบบน-ล่างเล็กน้อยให้เห็นลายพื้นหลัง */
        @media (min-width: 761px) {
          .appContainer {
            margin: 20px auto;
            border-radius: 24px; /* ใส่ขอบมนสวยๆ เฉพาะตอนเปิดบนคอม */
          }
        }
        @media (max-width: 760px) {
          .appContainer {
            max-width: 100%;
            min-height: 100vh;
            margin: 0;
            border-radius: 0;
          }
        }
        .banner-slide-down {
          animation: bannerSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .popup-fade-in {
          animation: fadeIn 0.3s ease forwards;
        }
        .popup-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes bannerSlideDown {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="appContainer">
        
        {/* ── 1. แบนเนอร์เตือนให้กดรับรางวัล (สไลด์จากขอบบน) ── */}
        {showNotificationBanner && activeMission && (
          <div style={{
            position: "absolute", top: 12, left: 0, right: 0,
            zIndex: 9999, display: "flex", justifyContent: "center", padding: "0 16px"
          }}>
            <div 
              className="banner-slide-down"
              onClick={handleBannerClick}
              style={{
                background: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(8px)",
                borderRadius: 20, padding: "14px 18px",
                width: "100%", maxWidth: 450,
                display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{
                width: 44, height: 44, background: W.yellow, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <Icon icon="lucide:trophy" width="24" height="24" color="white" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: W.text }}>Trace</span>
                  <span style={{ fontSize: 11, color: W.muted, marginLeft: "auto" }}>เมื่อครู่นี้</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  🎉 ภารกิจสำเร็จ! อย่าลืมมากดรับรางวัลนะ
                </div>
                <div style={{ fontSize: 12, color: W.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  แตะเพื่อเปิดหน้าภารกิจ "{activeMission.title}"
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotificationBanner(false);
                }}
                style={{
                  background: "transparent", border: "none", color: "#ccc",
                  cursor: "pointer", padding: 4, display: "flex", alignItems: "center"
                }}
              >
                <Icon icon="lucide:x" width="18" height="18" />
              </button>
            </div>
          </div>
        )}

        {/* ── 2. POPUP แจ้งเตือนหลังจากกดเคลมแต้มสำเร็จแล้ว ── */}
        {showClaimedPopup && (
          <div className="popup-fade-in" style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}>
            <div className="popup-slide-up" style={{
              background: "white", borderRadius: 28, padding: 32,
              width: "100%", maxWidth: 380, textAlign: "center",
              boxShadow: "0 15px 35px rgba(0,0,0,0.35)",
              border: `2px solid ${W.yellow}`
            }}>
              <div style={{
                width: 72, height: 72, background: "#fef3c7", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 18px", color: W.yellow
              }}>
                <Icon icon="lucide:star" width="40" height="40" style={{ color: W.yellow }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: W.green, margin: "0 0 6px 0" }}>
                รับแต้มสำเร็จ! 🎉
              </h3>
              <p style={{ fontSize: 15, color: W.text, margin: "0 0 4px 0" }}>
                คุณได้รับคะแนนสะสมเพิ่ม
              </p>
              <div style={{ fontSize: 32, fontWeight: 900, color: W.dark, margin: "8px 0 20px" }}>
                +{latestPointsEarned} <span style={{ fontSize: 16, fontWeight: 700, color: W.muted }}>แต้ม</span>
              </div>
              <button
                onClick={closeClaimedPopup}
                style={{
                  width: "100%", background: W.dark, color: "white", border: "none",
                  borderRadius: 14, padding: "12px 0", fontWeight: 700,
                  fontSize: 15, cursor: "pointer", boxShadow: "0 4px 12px rgba(97,65,36,0.2)"
                }}
              >
                ตกลง
              </button>
            </div>
          </div>
        )}

        <div ref={contentTopRef} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: W.bg }}>

          {/* Header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 20, background: W.white,
            borderBottom: `1px solid ${W.lightGray}`, display: "flex",
            alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
          }}>
            <button
              onClick={() => router.push('/')}
              style={{
                width: 42, height: 42, borderRadius: "50%", background: W.dark,
                border: "none", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: W.white, flexShrink: 0,
              }}
            >
              <Icon icon="lucide:chevron-left" width="22" height="22" />
            </button>
            <span
              aria-hidden={true}
              style={{
                fontSize: 17, fontWeight: 800, color: W.text, flex: 1, textAlign: "center",
                background: "transparent", border: "none", cursor: "default",
                padding: 0, display: "block",
              }}
            >
              Mission Quest
            </span>
            <div style={{ width: 42 }} />
          </div>

          {/* Tabs */}
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 100, padding: 4 }}>
              {(["my", "all"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 100, border: "none",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: activeTab === tab ? W.dark : "transparent",
                    color: activeTab === tab ? "white" : "#6b7280",
                    transition: "all 0.2s",
                  }}
                >
                  {tab === "my" ? "ภารกิจของฉัน" : "ภารกิจทั้งหมด"}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

            {activeTab === "my" && (
              <>
                {missionLoading && (
                  <div style={{ padding: 24, textAlign: "center", color: W.muted }}>
                    กำลังโหลด...
                  </div>
                )}

                {!missionLoading && !activeMission && (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: W.text, marginBottom: 8 }}>
                      ยังไม่มีภารกิจที่กำลังทำอยู่
                    </div>
                    <div style={{ fontSize: 14, color: W.muted, marginBottom: 20 }}>
                      ไปเลือกภารกิจในแท็บ ภารกิจทั้งหมด ได้เลย
                    </div>
                    <button
                      onClick={() => setActiveTab("all")}
                      style={{
                        padding: "10px 24px", background: W.dark, color: "white",
                        border: "none", borderRadius: 12, fontWeight: 700,
                        cursor: "pointer", fontSize: 14,
                      }}
                    >
                      ดูภารกิจทั้งหมด
                    </button>
                  </div>
                )}

                {!missionLoading && activeMission && (
                  <>
                    {/* Mission progress card */}
                    <div style={{
                      background: isReadyToClaim ? "#f0fdf4" : "#fffbeb", 
                      border: isReadyToClaim ? "1px solid #bbf7d0" : "1px solid #fef3c7",
                      borderRadius: 24, padding: 20,
                      display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
                    }}>
                      <div style={{
                        width: 48, height: 48, background: isReadyToClaim ? "#dcfce7" : "#fef3c7", borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon 
                          icon={isReadyToClaim ? "lucide:trophy" : "lucide:clipboard-list"} 
                          width="28" height="28" 
                          color={isReadyToClaim ? "#166534" : "#92400e"} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: W.text }}>
                          {activeMission.title}
                        </div>
                        <div style={{ fontSize: 13, color: W.muted, marginTop: 2 }}>
                          เสร็จสิ้น {checkedCount} / {activeMission.stops.length} สถานที่
                        </div>
                        <div style={{
                          height: 8, background: isReadyToClaim ? "#dcfce7" : "#fef3c7", borderRadius: 4,
                          marginTop: 10, overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", background: isReadyToClaim ? W.green : W.dark, borderRadius: 4,
                            width: `${(checkedCount / (activeMission.stops.length || 1)) * 100}%`,
                            transition: "width 0.4s ease",
                          }} />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isReadyToClaim) {
                            handleClaim(activeMission);
                            return;
                          }

                          if (checkedCount > 0) {
                            setShowMap(true);
                          } else {
                            alert("📍 คุณต้องเริ่มทำภารกิจ (เช็คอินอย่างน้อย 1 ที่) ก่อนจึงจะดูแผนที่ได้ค่ะ");
                          }
                        }}
                        style={{
                          background: isReadyToClaim ? W.green : "white",
                          border: isReadyToClaim ? "none" : "1px solid #fde68a",
                          borderRadius: 12,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: checkedCount > 0 || isReadyToClaim ? "pointer" : "not-allowed",
                          fontSize: 13,
                          fontWeight: 700,
                          color: isReadyToClaim ? "white" : checkedCount > 0 ? "#92400e" : "#ccc",
                          opacity: checkedCount > 0 || isReadyToClaim ? 1 : 0.6,
                          boxShadow: isReadyToClaim ? "0 4px 12px rgba(79,119,45,0.25)" : "none"
                        }}
                      >
                        {isReadyToClaim ? "กดเพื่อรับรางวัล" : "ดูแผนที่"}
                        <Icon
                          icon={isReadyToClaim ? "mdi:gift" : "material-symbols:map"}
                          width="18"
                          height="18"
                        />
                      </button>
                    </div>

                    {/* Stop list */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 12 }}>
                      ภารกิจที่กำลังทำ
                    </div>
                    <div style={{
                      background: "white", borderRadius: 24, padding: "0 16px",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                      border: `1px solid ${W.lightGray}`,
                    }}>
                      {activeMission.stops.map((stop) => (
                        <StopRow
                          key={stop.id}
                          stop={stop}
                          isChecked={historyIds.has(getStopId(stop))}
                          getCafeId={getCafeId}
                          onMapClick={() => setShowMap(true)}
                          userLoc={userLoc}
                          cafes={cafes}
                          reviewStat={reviewStats[stop.name]}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === "all" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {allTrips.map((item) => {
                  let bgImage = item.image;

                  if (item.title.includes("อาราม") && randomImages.temple) {
                    bgImage = randomImages.temple;
                  }
                  else if (item.title.includes("Caffeine") && randomImages.cafe) {
                    bgImage = randomImages.cafe;
                  }
                  else if (item.title.includes("Magic") && randomImages.all) {
                    bgImage = randomImages.all;
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/trip?tripId=${item.id}&from=mission`)}
                      style={{
                        background: "white", borderRadius: 20, padding: 16,
                        border: `1px solid ${W.lightGray}`, cursor: "pointer",
                        display: "flex", gap: 12, alignItems: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        transition: "box-shadow 0.2s",
                      }}
                    >
                      <img
                        src={bgImage}
                        alt={item.title}
                        style={{
                          width: 90,
                          height: 70,
                          borderRadius: 12,
                          objectFit: "cover",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>{item.title}</div>
                        <div style={{ fontSize: 13, color: W.muted, marginTop: 4 }}>{item.subtitle}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        <Icon icon="lucide:chevron-right" width="20" color={W.muted} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}