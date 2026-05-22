"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { addReview, getReviews } from "@/lib/reviewService";
import { useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { setDoc, doc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CafeDetailPage({ cafe, onBack }: any) {
  const [liked, setLiked] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const toggleFavourite = async () => {
    const user = getAuth().currentUser;

    if (!user) {
      alert("กรุณา login ก่อน");
      return;
    }

    const ref = doc(db, "users", user.uid, "favourites", cafe.id);

    try {
      if (liked) {
        // ❌ ลบ
        await deleteDoc(ref);
        setLiked(false);
      } else {
        // ❤️ เพิ่ม
        await setDoc(ref, {
          name: cafe.name,
          category: cafe.category || "Cafe",
          image: cafe.heroImage,
          points: cafe.points || 5,
        });
        setLiked(true);
      }
    } catch (err) {
      console.error("error fav:", err);
    }
  };
  const [expanded, setExpanded] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  const [reviews, setReviews] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [user, setUser] = useState<any>(null);
  const dayMap: any = {
    Mon: "วันจันทร์",
    Tue: "วันอังคาร",
    Wed: "วันพุธ",
    Thu: "วันพฤหัสบดี",
    Fri: "วันศุกร์",
    Sat: "วันเสาร์",
    Sun: "วันอาทิตย์",
  };

  const renderSchedule = () => {
    if (!cafe.schedule) return null;

    let result: any[] = [];

    cafe.schedule.forEach((item: any) => {
      item.days.forEach((day: string) => {
        result.push({
          day: dayMap[day],
          time: `${item.open}–${item.close}`,
        });
      });
    });

    return result;
  };

  const router = useRouter();

  const loadReviews = async () => {
    const data = await getReviews(cafe.id);
    setReviews(data);
  };


  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const averageRating = avg.toFixed(1);
  const reviewCount = reviews.length;


  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          user_id: firebaseUser.uid,
          name: firebaseUser.email
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkFav = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const ref = doc(db, "users", user.uid, "favourites", cafe.id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setLiked(true);
      }
    };

    checkFav();
  }, [cafe.id]);

  useEffect(() => {
    loadReviews();
  }, [cafe.id]);

  return (
    <div
      style={{
        backgroundImage: "url('/photo/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        padding: 0
      }}
    >
      {/* WRAPPER */}
      <div
        className="pageWrap"
        style={{
          position: "relative",
        }}
      >
        {/* HERO IMAGE */}
        <div style={{ position: "relative" }}>
          <img
            src={cafe.heroImage}
            style={{
              width: "100%",
              height: "clamp(240px, 40vw, 360px)",
              objectFit: "cover",
              borderRadius: window.innerWidth >= 1024 ? 24 : 0,
            }}
          />

          {/* BACK */}
          <button onClick={() => router.back()} style={circleBtn("left")}>
            <Icon icon="mdi:chevron-left" width="22" />
          </button>

          {/* HEART */}
          <button
            onClick={toggleFavourite}
            style={circleBtn("right")}
          >
            <Icon
              icon={liked ? "mdi:heart" : "mdi:heart-outline"}
              width="22"
              color="#FF7A7A"
            />
          </button>
        </div>

        {/* FLOAT CARD */}
        <div
          style={{
            position: "relative",
            marginTop: -80,
            background: "#fff",
            borderRadius: "30px 30px 0 0",
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          {/* TITLE */}
          <h2 style={{
            margin: 0,
            fontWeight: 900,   // ⭐ หนาขึ้นอีก
            fontSize: 24       // ⭐ เพิ่มความเด่น
          }}>
            {cafe.name}
          </h2>

          {/* RATING */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Icon
                key={i}
                icon="mdi:star"
                color={i <= avg ? "#F3BC00" : "#ccc"}
              />
            ))}

            <span style={{ marginLeft: 6 }}>
              {averageRating} ({reviewCount} รีวิว)
            </span>
          </div>

          {/* CATEGORY */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={iconCircle()}>
              {/* ✅ เปลี่ยนเป็นกาแฟ */}
              <Icon icon="mdi:coffee" color="#fff" />
            </div>
            <span>{cafe.category}</span>
            <span>|</span>
            <span>{cafe.distance}</span>
          </div>

          {/* POINT */}
          <div
            style={pointBox()}
            onClick={() => setShowPopup(true)}
          >
            <Icon icon="mdi:trophy" width="50" color="#fff" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>
                Get {cafe.points} points
              </div>
              <div style={{ fontSize: 13 }}>
                รับแต้มทันทีเมื่อเช็คอิน Read more.
              </div>
            </div>
          </div>

          {/* TAB */}
          <div style={tab()}>
            <b
              onClick={() => setActiveTab("about")}
              style={{
                color: activeTab === "about" ? "#000" : "#aaa",
                cursor: "pointer"
              }}
            >
              เกี่ยวกับ
            </b>

            <span
              onClick={() => setActiveTab("reviews")}
              style={{
                color: activeTab === "reviews" ? "#000" : "#aaa",
                cursor: "pointer"
              }}
            >
              รีวิว
            </span>
          </div>

          {activeTab === "reviews" && (
            <div style={{ padding: 20, paddingBottom: 120 }}>

              {!user && <p>กรุณา login ก่อน</p>}

              {/* 📋 แสดงรีวิว */}

              {reviews.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: 30, color: "#999" }}>
                  ยังไม่มีรีวิว 😢
                </div>
              ) : (
                reviews.map((r: any) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 15,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.08)"
                    }}
                  >
                    {/* 👤 ชื่อ + ดาว */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* avatar */}
                        <div style={{
                          width: 35,
                          height: 35,
                          borderRadius: "50%",
                          background: "#6B4226"
                        }} />

                        <b>{r.user_name}</b>
                      </div>

                      {/* ⭐ ดาว */}
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Icon
                            key={i}
                            icon="mdi:star"
                            color={i <= r.rating ? "#F3BC00" : "#ccc"}
                            width={16}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 📝 ข้อความ */}
                    <div style={{ color: "#444" }}>
                      {r.review_text}
                    </div>
                  </div>
                ))
              )}

            </div>
          )}

          {/* ABOUT */}
          {activeTab === "about" && (
            <>
              <h3 style={{ fontWeight: 800 }}>
                {cafe.name}
              </h3>

              <p
                style={{
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: expanded ? undefined : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  marginLeft: 10
                }}
              >
                {cafe.description}
              </p>

              <span
                onClick={() => setExpanded(!expanded)}
                style={{ color: "#999", cursor: "pointer" }}
              >
                {expanded ? "น้อลง" : "อ่านต่อ"}
              </span>
            </>
          )}

          {activeTab === "about" && (
            <>
              {/* LOCATION */}
              <h3 style={{ fontWeight: 700 }}>ที่ตั้ง & เวลาเปิดปิด</h3>

              <div style={row()}>
                <Icon icon="mdi:map-marker-radius" />
                <span>{cafe.address}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                <Icon icon="mdi:clock-time-four-outline" />

                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                  const found = cafe.schedule?.find((s: any) =>
                    s.days.includes(day)
                  );

                  let text = "ปิดทำการ";

                  if (found) {
                    text = `${found.open} - ${found.close}`;
                  }

                  return (
                    <div
                      key={day}
                      style={{
                        display: "flex",
                        gap: 30,
                        padding: "4px 0"
                      }}
                    >
                      <span style={{ width: 90, fontWeight: 600 }}>
                        {dayMap[day]}
                      </span>

                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>

              {/* PHOTOS */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 20
              }}>
                <h3 style={{ fontWeight: 800, margin: 0 }}>
                  รูปภาพ
                </h3>

                {/* ✅ แสดงเมื่อรูป > 4 */}
                {(cafe.photos?.length || 0) > 4 && (
                  <span
                    onClick={() => setShowAll(true)}
                    style={{
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: 500
                    }}
                  >
                    view all
                  </span>
                )}
              </div>

              <div style={grid()}>
                {(cafe.photos || [])
                  .slice(0, showAll ? cafe.photos.length : 4)
                  .map((img: string, i: number) => (
                    <img
                      key={i}
                      src={img}
                      style={imgStyle()}
                      onClick={() => setSelectedImg(img)} // ✅ คลิกแล้วเด้ง
                    />
                  ))}
              </div>
              {showAll && (
                <div style={{ marginTop: 10 }}>
                  <span
                    onClick={() => setShowAll(false)}
                    style={{ cursor: "pointer", color: "#999" }}
                  >
                    Show less
                  </span>
                </div>
              )}

              {/* MAP (ของเดิมหนู ใช้ได้อยู่แล้ว) */}
              <button
                onClick={() => {
                  const url = cafe.googleMap?.match(/src="([^"]+)"/)?.[1];
                  if (url) window.open(url, "_blank");
                }}
                style={mapBtn()}
              >
                <Icon icon="mdi:map" />
                เปิดใน Google Map
              </button>
            </>
          )}
        </div>
        {selectedImg && (
          <div
            onClick={() => setSelectedImg(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999
            }}
          >
            {/* ปุ่มปิด */}
            <button
              onClick={() => setSelectedImg(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <img
              src={selectedImg}
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                borderRadius: 12
              }}
            />


          </div>
        )}
        {activeTab === "reviews" && user && (
          <div
            style={{
              position: "fixed",
              bottom: 10,
              left: 0,
              right: 0,
              padding: "0 16px",
              zIndex: 1000
            }}
          >
            {/* 🤍 กล่องใหญ่ */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 10,
                boxShadow: "0 4px 15px rgba(0,0,0,0.12)"
              }}
            >

              {/* ⭐ ดาว */}
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Icon
                    key={i}
                    icon="mdi:star"
                    width={35}
                    height={35}
                    onClick={() => setRating(i)}
                    style={{
                      cursor: "pointer",
                      color: i <= rating ? "#F3BC00" : "#ccc"
                    }}
                  />
                ))}
              </div>

              {/* 💬 input */}
              <div style={{ display: "flex", alignItems: "center" }}>

                {/* avatar */}
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: 8
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#6B4226",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      marginRight: 8
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* input */}
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Post your comment"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 14
                  }}
                />

                {/* send */}
                <button
                  onClick={async () => {
                    if (!comment || rating === 0) {
                      alert("กรอกข้อมูลให้ครบ");
                      return;
                    }

                    await addReview({
                      user_id: user.user_id,
                      user_name: user.name,
                      location_id: cafe.id,
                      review_text: comment,
                      rating,
                      createdAt: serverTimestamp()
                    });

                    setComment("");
                    setRating(0);
                    await loadReviews();
                  }}
                  style={{
                    background: "#6B4226",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Icon icon="mdi:send" />
                </button>


              </div>
            </div>

          </div>
        )}
        {showPopup && (
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
              <h3 style={{ marginBottom: 10 }}>📍 เช็คอินก่อน</h3>

              <p style={{ fontSize: 14, color: "#555" }}>
                สแกนเพื่อเช็คอิน และคุณจะได้รับสิทธิ์เล่นเกม
                <br />
                หากคุณเล่นสำเร็จ จะได้รับ {cafe.points} คะแนน 🎉
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


      <style jsx global>{`
          body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

  /* mobile */
  .pageWrap{
    max-width:100%;
    margin:0;
  }

  /* desktop */
  @media(min-width:1024px){
    .pageWrap{
      max-width:1100px;
      margin:40px auto;
      border-radius:20px 20px 0 0;
      overflow:hidden;
    }
  }
    
`}</style>
    </div>
  );
}

/* ===== STYLE (ของเดิมหนู 100%) ===== */

const circleBtn = (side: "left" | "right") => ({
  position: "absolute" as const,
  top: 16,
  [side]: 16,
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
});

const iconCircle = () => ({
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#6B4226",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const pointBox = () => ({
  background: "#EFBB3A",
  borderRadius: 20,
  padding: 16,
  display: "flex",
  gap: 12,
  marginTop: 16,
});

const tab = () => ({
  display: "flex",
  justifyContent: "space-around",
  borderBottom: "1px solid #ddd",
  marginTop: 18,
  paddingBottom: 8,
});

const row = () => ({
  display: "flex",
  gap: 8,
  marginTop: 6,
});

const grid = () => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 10,
});

const imgStyle = () => ({
  width: "100%",
  height: 130,
  objectFit: "cover" as const,
  borderRadius: 12,
});

const mapBtn = () => ({
  marginTop: 20,
  width: "100%",
  padding: 14,
  background: "#6B4226",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,

});

