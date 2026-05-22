"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

// ── Palette ─────────────────────────
const W = {
  bg: "#ffffff",
  text: "#000000",
  muted: "#7A7A7A",
  dark: "#614124",
  yellow: "#F3BC00",
  white: "#FFFFFF",
  lightGray: "#f0f0f0",
};

// ── Responsive Hook ─────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isDesktop;
}

type Category = "All" | "Cafe" | "Food" | "Temple" | "Sight";

interface FavouriteItem {
  id: string;
  name: string;
  category: Category;
  points: number;
  image: string;
}

const TABS: Category[] = ["All", "Cafe", "Food", "Temple", "Sight"];

export default function FavouritePlacesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Category>("All");
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const fetchFav = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const snap = await getDocs(
        collection(db, "users", user.uid, "favourites")
      );

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FavouriteItem[];

      setFavourites(data);
    };

    fetchFav();
  }, []);

  const visible =
    activeTab === "All"
      ? favourites
      : favourites.filter((f) => f.category === activeTab);

  return (
    <>
      <style jsx global>{`
        /* พื้นหลังสีน้ำตาลจะเห็นเฉพาะเมื่อจอใหญ่กว่าเนื้อหา (Desktop) */
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

        /* 💻 Desktop Style: บีบเนื้อหาเข้ากลางและทำขอบมน */
        @media (min-width: 1024px) {
          body {
            padding: 40px 0; /* เว้นระยะบนล่างให้เห็นพื้นหลังน้ำตาล */
          }
          .pageWrap {
            max-width: 1100px;
            margin: 0 auto;
            min-height: 85vh; /* ปรับความสูงเล็กน้อยให้ดูเป็นกรอบ */
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            overflow: hidden;
          }
        }

        /* 📱 Mobile Style: เต็มจอ ไม่มีขอบ */
        @media (max-width: 1023px) {
          body {
            background: #fff; /* มือถือให้พื้นหลังกลืนไปกับเนื้อหา */
          }
          .pageWrap {
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="pageWrap">
        {/* HEADER */}
        <div
  style={{
    display: "flex",
    alignItems: "center",
    padding: "25px 20px",
    position: "relative",
  }}
>
  {/* ปุ่ม back */}
  <button
    onClick={() => router.push("/profile")}
    style={{
      width: 45,
      height: 45,
      borderRadius: "50%",
      background: "#614124",
      border: "none",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      position: "absolute", // 🔥 สำคัญ
      left: 20,
    }}
  >
    <Icon icon="lucide:chevron-left" width="24" />
  </button>

  {/* หัวข้อ */}
  <h2
    style={{
      textAlign: "center",
      fontWeight: 800,
      margin: 0,
      fontSize: "24px",
      width: "100%", // 🔥 ทำให้กลางจริง
    }}
  >
    Favourite places
  </h2>
</div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "0 20px 15px",
            overflowX: "auto",
            scrollbarWidth: "none", // ซ่อน scrollbar ใน Firefox
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 20px",
                borderRadius: 30,
                border: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: activeTab === tab ? W.dark : W.lightGray,
                color: activeTab === tab ? "#fff" : "#000",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* LIST */}
        <div style={{ flex: 1, background: "#fff" }}>
          {visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: W.muted }}>
              No favourites yet
            </div>
          ) : isDesktop ? (
            // 💻 Desktop Grid
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 24,
                padding: "20px 30px 40px",
              }}
            >
              {visible.map((item) => (
                <div
  key={item.id}
  onClick={() => router.push(`/cafe/${item.id}`)} // 🔥 เพิ่มบรรทัดนี้
  style={{
    borderRadius: 20,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    border: "1px solid #f0f0f0",
    cursor: "pointer", // 🔥 ให้รู้ว่ากดได้
  }}
>
                  <div
                    style={{
                      height: 160,
                      background: `url('${item.image}') center/cover`,
                    }}
                  />
                  <div style={{ padding: 15 }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: 5 }}>{item.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#065f46", fontWeight: 600 }}>
                      <Icon icon="material-symbols:rewarded-ads" />
                      +{item.points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 📱 Mobile List
            visible.map((item) => (
              <div
  key={item.id}
  onClick={() => router.push(`/cafe/${item.id}`)} // 🔥 เพิ่มเหมือนกัน
  style={{
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    borderBottom: "1px solid #f5f5f5",
    cursor: "pointer",
  }}
>
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 12,
                    background: `url('${item.image}') center/cover`,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>{item.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#065f46", fontSize: "14px", marginTop: 4 }}>
                    <Icon icon="material-symbols:rewarded-ads" />
                    +{item.points} pts
                  </div>
                </div>
                <Icon icon="lucide:chevron-right" color="#ccc" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}