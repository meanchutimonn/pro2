"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import TripMapPage from "../components/TripMapPage";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ── Palette (คงเดิมตามโค้ดของคุณ) ──────────────────────────────────────────────
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

// ── Types (คงเดิมตามโค้ดของคุณ) ───────────────────────────────────────────────
export interface TripStop {
  id: number;
  name: string;
  location_id?: string;
  locationId?: string;
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
  onBack?: () => void;
  onHome?: () => void;
}

// ── Components ─────────────────────────────────────────────────────────────────

function MapButton({
  isChecked,
  onClick,
}: {
  isChecked: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isChecked ? W.green : W.pink,
        borderRadius: 14,
        width: 52,
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        border: "none",
        cursor: "pointer",
      }}
    >
      <Icon
        icon={isChecked ? "tdesign:map-unlocked-filled" : "tdesign:map-locked-filled"}
        width="26"
        height="26"
        style={{ color: "#fff" }}
      />
    </button>
  );
}

function StopRow({
  stop,
  isChecked,
  getCafeId,
  onMapClick,
  userLoc,
  cafes
}: {
  stop: TripStop;
  isChecked: boolean;
  getCafeId: (name: string) => string | undefined;
  onMapClick: () => void;
  userLoc: { lat: number; lng: number } | null;
  cafes: any[];
}) {
  const router = useRouter();

  const cafeData = cafes.find(c => c.locationName === stop.name);
  let displayDistance = stop.distance || "0.0 km";
  if (userLoc && cafeData?.lat && cafeData?.lng) {
    const d = calculateDistance(userLoc.lat, userLoc.lng, cafeData.lat, cafeData.lng);
    displayDistance = `${d.toFixed(1)} km`;
  }

  return (
    <div
      onClick={() => {
        const cafeId = getCafeId(stop.name);
        if (cafeId) {
          router.push(`/cafe/${cafeId}`);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        borderBottom: `1px solid ${W.lightGray}`,
        cursor: "pointer",
      }}
    >
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36 }}>
        {isChecked ? (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: W.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon icon="lucide:check" width="20" height="20" color="white" />
          </div>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: W.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>{stop.id}</span>
          </div>
        )}
      </div>

      <div
        style={{
          width: 85,
          height: 85,
          borderRadius: 15,
          background: `url('${stop.image}') center/cover #eee`,
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left", alignItems: "flex-start" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 4, width: "100%" }}>
          {stop.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
          <Icon icon="mdi:star" width="16" height="16" color="#F3BC00" />
          <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{stop.rating}</span>
          <span style={{ color: "#D0D0D0", fontSize: 13, margin: "0 2px" }}>|</span>
          <span style={{ fontSize: 13, color: W.muted }}>{displayDistance}</span>
        </div>
      </div>

      <MapButton
        isChecked={isChecked}
        onClick={(e) => {
          e.stopPropagation();
          if (isChecked) {
            onMapClick();
          } else {
            alert("📍 คุณต้องไปเช็คอินที่สถานที่นี้ก่อนเพื่อดูในแผนที่ค่ะ");
          }
        }}
      />
    </div>
  );
}

export default function TripDetailPage({ trip: initialTrip, onBack, onHome }: TripDetailPageProps) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(initialTrip || null);
  const [cafes, setCafes] = useState<any[]>([]);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // ✅ แก้ไขให้กดย้อนกลับได้ (โหลดครั้งเดียว ไม่วน Loop)
  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "locations"));
      setCafes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      if (!trip) {
        const tripSnap = await getDocs(collection(db, "monthlyTrips"));
        console.log("MONTHLY TRIPS SIZE:", tripSnap.size);

        tripSnap.docs.forEach((d) => {
          console.log("MONTHLY TRIP DOC:", d.id, d.data());
        });

        if (!tripSnap.empty) {
          const firstTrip = tripSnap.docs[0].data() as TripDetail;
          setTrip({ ...firstTrip, id: Number(tripSnap.docs[0].id) });
        }
      }
    };
    fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log(err)
      );
    }
  }, []);

  // ✅ แก้ไขให้ Link ภารกิจ: เพิ่มการเช็ค merchantId จาก Firebase
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "checkins"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        const visited = new Set<string>();
        snap.forEach((doc) => {
          const data = doc.data();
          // ✅ ดึงจาก merchantId ตามที่โชว์ใน Firebase รูปภาพของคุณ
          const id = data.merchantId || data.locationId || data.location_id;
          console.log("FOUND CHECKIN ID:", id);
          if (id) {
            visited.add(String(id).trim());
          }
          console.log("CHECKIN DOC:", doc.id, doc.data());
        });
        setHistoryIds(visited);
      }
    });
    return () => unsubscribe();
  }, []);

  const getCafeId = (stopName: string) => {
    const match = cafes.find((c) => c.locationName === stopName);
    return match?.id;
  };

  const getStopLocationId = (stop: any) => {
    const directId = stop.location_id || stop.locationId;

    if (directId) return String(directId).trim();

    const cafe = cafes.find((c) => c.locationName === stop.name);

    return cafe?.id
      ? String(cafe.id).trim()
      : String(stop.id).trim();
  };
  if (!trip) return <div style={{ padding: 40, textAlign: "center" }}>กำลังโหลดข้อมูล...</div>;

  // ✅ คำนวณ checkedCount โดยเช็ค ID แบบ String.trim()
  const checkedCount = trip?.stops
    ? trip.stops.filter((s: any) => {
      const sId = getStopLocationId(s);
      console.log("MISSION STOP:", {
        stopName: s.name,
        stopId: sId,
        matched: historyIds.has(sId),
      });
      return historyIds.has(sId);
    }).length
    : 0;

  console.log("===== MISSION DEBUG =====");

  trip?.stops?.forEach((s: any) => {
    const cafe = cafes.find((c) => c.locationName === s.name);

    const finalId = getStopLocationId(s);

    console.log({
      stopName: s.name,
      stopRawId: s.id,
      stopLocationId: s.location_id,
      stopLocationIdCamel: s.locationId,
      cafeMatchedByName: cafe,
      finalStopId: finalId,
      historyIds: Array.from(historyIds),
      matched: historyIds.has(finalId),
    });
  });

  console.log("FINAL checkedCount:", checkedCount);

  if (showMap) {
    return (
      <TripMapPage
        trip={trip}
        onHome={onHome ?? onBack}
        onMapClose={() => setShowMap(false)}
        onClaim={() => {
          alert("🎉 Congratulations! You've claimed your points!");
          setShowMap(false);
        }}
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
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          minHeight: "100vh",
          background: "#fff",
          borderRadius: "24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          margin: "0 auto",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: W.bg }}>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: W.white,
              borderBottom: `1px solid ${W.lightGray}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
            }}
          >
            <button
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  router.back();
                }
              }}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: W.dark,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: W.white,
                flexShrink: 0,
              }}
            >
              <Icon icon="lucide:chevron-left" width="22" height="22" />
            </button>
            <span style={{ fontSize: 17, fontWeight: 800, color: W.text, flex: 1, textAlign: "center" }}>
              Mission Quest
            </span>
            <div style={{ width: 42 }} />
          </div>

          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 100, padding: 4 }}>
              <button
                onClick={() => setActiveTab("my")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 100,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "my" ? W.dark : "transparent",
                  color: activeTab === "my" ? "white" : "#6b7280",
                }}
              >
                ภารกิจของฉัน
              </button>
              <button
                onClick={() => setActiveTab("all")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 100,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "all" ? W.dark : "transparent",
                  color: activeTab === "all" ? "white" : "#6b7280",
                }}
              >
                ภารกิจทั้งหมด
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: 24,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "#fef3c7",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon icon="lucide:clipboard-list" width="28" height="28" color="#92400e" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: W.text }}>{trip.title}</div>
                <div style={{ fontSize: 13, color: W.muted, marginTop: 2 }}>
                  เสร็จสิ้น {checkedCount} / {trip?.stops?.length || 0} ของภารกิจทั้งหมด
                </div>
                <div style={{ height: 8, background: "#fef3c7", borderRadius: 4, marginTop: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      background: W.dark,
                      width: `${(checkedCount / (trip?.stops?.length || 1)) * 100}%`,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (checkedCount > 0) {
                    setShowMap(true);
                  } else {
                    alert("📍 คุณต้องเริ่มทำภารกิจ (เช็คอินอย่างน้อย 1 ที่) ก่อนจึงจะดูแผนที่ได้ค่ะ");
                  }
                }}
                style={{
                  background: "white",
                  border: "1px solid #fde68a",
                  borderRadius: 12,
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: checkedCount > 0 ? "pointer" : "not-allowed",
                  fontSize: 13,
                  fontWeight: 700,
                  color: checkedCount > 0 ? "#92400e" : "#ccc",
                  opacity: checkedCount > 0 ? 1 : 0.6,
                }}
              >
                ดูแผนที่
                <Icon icon="material-symbols:map" width="18" height="18" />
              </button>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 12 }}>
              ภารกิจที่กำลังทำ
            </div>
            <div
              style={{
                background: "white",
                borderRadius: 24,
                padding: "0 16px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                border: `1px solid ${W.lightGray}`,
              }}
            >
              {trip?.stops?.map((stop) => {
                // ✅ เปรียบเทียบ ID แบบ String.trim() เพื่อให้ Link กันแน่นอน
                const sId = getStopLocationId(stop);
                const isVisited = historyIds.has(sId);

                return (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    isChecked={isVisited}
                    getCafeId={getCafeId}
                    onMapClick={() => setShowMap(true)}
                    userLoc={userLoc}
                    cafes={cafes}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div >
    </>
  );
}