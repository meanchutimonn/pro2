"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

function getWeeklyPoints(id: string, category?: string) {
  if (
    category?.toLowerCase().trim() === "temple" ||
    category?.toLowerCase().trim() === "market"
  ) {
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

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();

  const [showPopup, setShowPopup] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);


  const [cafes, setCafes] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const loadReviews = async () => {
      const snap = await getDocs(collection(db, "reviews"));
      const data = snap.docs.map(doc => doc.data());
      setReviews(data);
    };

    loadReviews();
  }, []);

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
    if (!params?.name) return;

    const name = Array.isArray(params.name)
      ? params.name[0]
      : params.name;

    const fetchData = async () => {
      const formatted =
        name.charAt(0).toUpperCase() + name.slice(1);

      const q = query(
        collection(db, "locations"),
        where("category", "==", formatted)
      );

      const snap = await getDocs(q);

      const result = snap.docs.map(doc => {
        const data = doc.data();


        return {
          id: doc.id,
          ...data,
        };
      });

      setCafes(result);
    };

    fetchData();
  }, [params.name, userLocation]);

  const popular = cafes.slice(0, 3);
  const recommended = cafes.slice(3);
  const visibleRecommended = showAll
    ? recommended
    : recommended.slice(0, 5);

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/photo/background.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",   // ⭐ เต็มจอ
    }}>

      <div className="pageWrap" style={{
        background: "#fff",
        minHeight: "100vh",
        overflow: "hidden",
      }}>

        {/* HEADER */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #eee"
        }}>
          <button
            onClick={() => router.push("/")}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "#614124",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Icon icon="lucide:chevron-left" width="22" />
          </button>

          <span style={{ fontSize: 18, fontWeight: 800 }}>
            {/* ถ้ารายการส่งมาเป็นคำว่า sight ให้แสดงคำว่า market แทน ถ้าไม่ใช่ให้แสดงชื่อปกติ */}
            {(Array.isArray(params.name) ? params.name[0] : params.name) === "sight" ? "market" : (Array.isArray(params.name) ? params.name[0] : params.name)}
          </span>

          <div style={{ width: 42 }} />
        </div>

        <div style={{ padding: "0 16px 32px" }}>

          {/* POPULAR */}
          <div style={{ margin: "20px 0 12px", fontWeight: 800 }}>
            สถานที่ยอดฮิต
          </div>

          <div style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingBottom: 4,
            WebkitOverflowScrolling: "touch",

            justifyContent: "flex-start",
            flexWrap: "nowrap",
          }}>
            {popular.map((cafe) => (


              <div
                key={cafe.id}
                onClick={() => router.push(`/cafe/${cafe.id}`)} // ✅ กดแล้วไป detail
                style={{
                  cursor: "pointer",
                  position: "relative",
                  width: 220,
                  height: 300,
                  borderRadius: 20,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: `url('${cafe.mainImage}') center/cover`
                }} />

                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)"
                }} />


                {/* กล่องขาว */}
                <div style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  right: 10,
                  background: "#fff",
                  borderRadius: 14,
                  padding: 12,
                  height: 100,

                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>

                  {/* ชื่อ */}
                  <div style={{
                    fontWeight: 800,
                    fontSize: 15,
                    lineHeight: "1.2em",
                    height: "2.4em",
                    marginBottom: 6,

                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {cafe.locationName}
                  </div>

                  {/* description */}
                  <div style={{
                    fontSize: 12,
                    color: "#777",
                    lineHeight: "1.4em",
                    height: "2.8em",

                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {cafe.description}
                  </div>

                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation(); // กันไม่ให้กดแล้วเด้งไปหน้า detail
                    setSelectedCafe(cafe);
                    setShowPopup(true);
                  }}
                  style={{
                    position: "absolute",
                    bottom: 120,       // ปรับระยะความสูงจากขอบล่าง
                    right: 20,        // ปรับระยะห่างจากขอบขวา
                    background: "#F3BC00",
                    padding: "6px 12px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",

                    zIndex: 20,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",

                  }}
                >
                  <Icon icon="mdi:trophy" width="16" color="#fff" />
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                    +{getWeeklyPoints(cafe.id, cafe.category)}
                  </span>
                </div>
              </div>
            ))}
            {showPopup && selectedCafe && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 20,
                    width: 300,
                    textAlign: "center"
                  }}
                >
                  <h3>📍 เช็คอินก่อน</h3>

                  <p style={{ fontSize: 14, color: "#555" }}>
                    สแกนเพื่อเช็คอิน และคุณจะได้รับ
                    <br />
                    {getWeeklyPoints(selectedCafe.id, selectedCafe.category)} คะแนน 🎉
                  </p>

                  <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setShowPopup(false)}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        border: "none",
                        background: "#ddd"
                      }}
                    >
                      ยกเลิก
                    </button>

                    <button
                      onClick={() => {
                        router.push(`/scan`);
                      }}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        border: "none",
                        background: "#6B4226",
                        color: "#fff"
                      }}
                    >
                      ไปสแกน
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RECOMMENDED */}
          <div style={{ margin: "24px 0 12px", fontWeight: 800 }}>
            สถานที่แนะนำ
          </div>

          {visibleRecommended.map((cafe) => {

            const cafeReviews = reviews.filter(
              (r) => r.location_id === cafe.id
            );

            const avg =
              cafeReviews.length > 0
                ? cafeReviews.reduce((sum, r) => sum + r.rating, 0) /
                cafeReviews.length
                : 0;

            return (
              <div
                key={cafe.id}
                onClick={() => router.push(`/cafe/${cafe.id}`)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: "1px solid #eee",
                }}
              >

                <img
                  src={cafe.mainImage}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    objectFit: "cover"
                  }}
                />

                <div style={{ flex: 1 }}>

                  <div style={{ fontWeight: 800 }}>
                    {cafe.locationName}
                  </div>

                  <div style={{
                    display: "flex",
                    gap: 8,
                    margin: "4px 0"
                  }}>
                    <span>⭐ {avg.toFixed(1)}</span>
                    <span style={{ color: "#aaa" }}>|</span>
                    <span>
                      {userLocation && cafe.latitude && cafe.longitude
                        ? getDistanceKm(
                          userLocation.lat,
                          userLocation.lng,
                          Number(cafe.latitude),
                          Number(cafe.longitude)
                        ).toFixed(1) + " กม."
                        : "กำลังโหลด..."}
                    </span>
                  </div>

                  <div style={{
                    fontSize: 13,
                    color: "#777",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {cafe.description}
                  </div>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation(); // 🔥 สำคัญมาก กันไม่ให้เด้งไปหน้า detail
                    setSelectedCafe(cafe);
                    setShowPopup(true);
                  }}
                  style={{
                    background: "#F3BC00",
                    borderRadius: 20,
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 80,
                    justifyContent: "center",
                    cursor: "pointer" // ✨ เพิ่มให้รู้ว่ากดได้
                  }}
                >
                  <Icon icon="mdi:trophy" width="18" color="#fff" />
                  <span style={{ color: "#fff", fontWeight: 800 }}>+{getWeeklyPoints(cafe.id, cafe.category)}</span>
                </div>

              </div>
            );
          })}

          {!showAll && recommended.length > 5 && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => setShowAll(true)}
                style={{
                  background: "#614124",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "10px 20px",
                  fontWeight: 700,
                  border: "none"
                }}
              >
                show more.
              </button>
            </div>
          )}
          <style jsx global>{`
                   body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}
            @media(min-width:1024px){
                .pageWrap{
                max-width:1100px;
                margin:40px auto;
                border-radius:16px;
                overflow:hidden;
                }
            }
            `}</style>
        </div>
      </div>
    </div>
  );
}