"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ── Palette (คุมโทนเดียวกับหน้า Favourite) ─────────────────────────
const W = {
  bg: "#ffffff",
  text: "#000000",
  muted: "#7A7A7A",
  dark: "#614124",
  white: "#FFFFFF",
  lightGray: "#f0f0f0",
};

interface CheckinItem {
  id: string;
  merchantId: string;
  name: string;
  date: string;
  image: string;
  createdAt?: Date;
}

export default function CheckinHistoryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ตรวจสอบสถานะ User
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. ดึงข้อมูล Check-in และรายละเอียดสถานที่
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "checkins"),
          where("userId", "==", userId)
        );

        const snapshot = await getDocs(q);
        const results: CheckinItem[] = [];

        for (const docSnap of snapshot.docs) {
          const checkin = docSnap.data();
          
          // ดึงข้อมูลชื่อและรูปภาพจาก Collection locations
          const locationRef = doc(db, "locations", checkin.merchantId);
          const locationSnap = await getDoc(locationRef);

          if (locationSnap.exists()) {
            const location = locationSnap.data();
            const timestamp = checkin.createdAt?.toDate();

            results.push({
  id: docSnap.id,
  merchantId: checkin.merchantId,
  name: location.locationName || "Unknown Place",
  image: location.mainImage || "",
  date: timestamp
    ? timestamp.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-",
  createdAt: timestamp, // ✅ เพิ่มตัวนี้
});
          }
        }

        // เรียงลำดับตามวันที่ (ล่าสุดขึ้นก่อน)
        results.sort((a, b) => {
  return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
});
setData(results);
      } catch (err) {
        console.error("Error fetching checkins:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return (
    <>
      <style jsx global>{`
        /* พื้นหลังสีน้ำตาลสำหรับ Desktop */
                body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

        .pageWrap {
          min-height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
          width: 100%;
          margin: 0;
        }

        /* 💻 Desktop Style */
        @media (min-width: 1024px) {
          body {
            padding: 40px 0;
          }
          .pageWrap {
            max-width: 1100px;
            margin: 0 auto;
            min-height: 85vh;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            overflow: hidden;
          }
        }

        /* 📱 Mobile Style */
        @media (max-width: 1023px) {
          body {
            background: #fff;
          }
          .pageWrap {
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="pageWrap">
        {/* HEADER - จัดกึ่งกลางเป๊ะแบบหน้า Favourite */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "25px 20px",
            position: "relative",
          }}
        >
          <button
            onClick={() => router.push("/profile")}
            style={{
              width: 45,
              height: 45,
              borderRadius: "50%",
              background: W.dark,
              border: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "absolute",
              left: 20,
              zIndex: 10,
            }}
          >
            <Icon icon="lucide:chevron-left" width="24" />
          </button>

          <h2
            style={{
              textAlign: "center",
              fontWeight: 800,
              margin: 0,
              fontSize: "24px",
              width: "100%",
            }}
          >
            Check-in history
          </h2>
        </div>

        {/* LIST CONTENT */}
        <div style={{ flex: 1, background: "#fff", paddingBottom: 40 }}>
          {!userId && !loading ? (
            <div style={{ textAlign: "center", padding: 60, color: W.muted }}>
              Please login to see history
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: 60, color: W.muted }}>
              Loading...
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: W.muted }}>
              ไม่มีประวัติการเช็คอิน
            </div>
          ) : (
            data.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/cafe/${item.merchantId}`)} // 🔥 คลิกแล้วไปหน้าสถานที่
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  borderBottom: `1px solid ${W.lightGray}`,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                {/* รูปสถานที่ */}
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 12,
                    background: item.image
                      ? `url('${item.image}') center/cover`
                      : "#eee",
                    flexShrink: 0,
                  }}
                />

                {/* ข้อความชื่อและวันที่ */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: W.text }}>
                    {item.name}
                  </div>
                  <div style={{ color: W.muted, fontSize: "14px", marginTop: 4 }}>
                    {item.date}
                  </div>
                </div>

                {/* ลูกศรขวา */}
                <Icon icon="lucide:chevron-right" color="#ccc" width="20" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}