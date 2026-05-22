"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, increment, addDoc, collection } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

export default function CheckinPage() {
  const { merchantId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState<
    "loading" | "success" | "already" | "error"
  >("loading");

  const [shopName, setShopName] = useState("");

  const ADMIN_ID = "7Ay3Nc5bn8hAqjyl2QKM8oBGyBt1";

  const getToday = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const today = getToday();
      const checkinId = `${user.uid}_${merchantId}_${today}`;
      const ref = doc(db, "checkins", checkinId);


      try {
        // ✅ ใช้ users (ของคุณจริง)
        const locationSnap = await getDoc(
          doc(db, "locations", merchantId as string)
        );

        const locationData = locationSnap.data();

        const merchantSnap = await getDoc(
          doc(db, "users", merchantId as string)
        );

        const merchantData = merchantSnap.data();

        const placeName =
          locationData?.locationName ||
          merchantData?.name ||
          "สถานที่";

        setShopName(placeName);

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setStatus("already");
          return;
        }

        // ✅ บันทึก checkin
        await setDoc(ref, {
          userId: user.uid,
          merchantId,
          locationId: merchantId,
          date: today,
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: "เช็คอินสำเร็จ 📍",
          body: `คุณเช็คอินที่ ${merchantData?.name || "ร้านค้า"} สำเร็จแล้ว`,
          placeName: merchantData?.name || "ร้านค้า",
          merchantId: merchantId,
          read: false,
          createdAt: serverTimestamp()
        });

        // ✅ เพิ่มยอดร้าน (ไม่ error)
        await setDoc(
          doc(db, "users", merchantId as string),
          { checkinCount: increment(1) },
          { merge: true }
        );

        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    });

    return () => unsub();
  }, [merchantId, router]);

  return (
    <div style={page}>
      <div style={overlay}>
        <div style={popup} className="popupBox">
          {/* ⏳ LOADING */}
          {status === "loading" && (
            <>
              <div style={spinner}></div>
              <h2 style={title}>กำลังเช็คอิน...</h2>
            </>
          )}

          {/* ❌ ERROR */}
          {status === "error" && (
            <>
              <h1 style={icon}>❌</h1>
              <h2 style={title}>เกิดข้อผิดพลาด</h2>
            </>
          )}

          {/* ⚠️ ALREADY */}
          {status === "already" && (
            <>
              <h1 style={icon}>⚠️</h1>
              <h2 style={title}>เช็คอินแล้ววันนี้</h2>
              <p style={sub}>{shopName}</p>

              <button style={closeBtn} onClick={() => {
                window.location.href = "/";
              }}>
                กลับหน้าหลัก
              </button>
            </>
          )}

          {/* 🎉 SUCCESS */}
          {status === "success" && (
            <>
              <h1 style={icon}>🎉</h1>
              <h2 style={title}>เช็คอินสำเร็จ!</h2>
              <p style={sub}>{shopName}</p>

              <button
                style={btn}
                onClick={() => {
                  // ✅ ยึดเส้นทางเดิมของคุณ 100% แต่ล็อกค่าไอดีกันหลุดชั่วคราวเพื่อทะลุเข้าหน้าเกมได้เลยโดยไม่นิ่งค้าง
                  const targetId = merchantId;
                  if (targetId) {
                    router.push(`/game-scan?merchantId=${targetId}`);
                  } else {
                    const currentUrl = window.location.pathname;
                    const idFromUrl = currentUrl.split("/").pop();
                    router.push(`/game-scan?merchantId=${idFromUrl}`);
                  }
                }}
              >
                เล่นเกม
              </button>

              <button
                style={skipBtn}
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                ข้าม
              </button>
            </>
          )}
        </div>
      </div>

      {/* animation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes popupScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (min-width: 768px) {
          .popupBox {
            border: 2px solid #6b4729;
          }
        }
      `}</style>
    </div>
  );
}

/* ===== STYLE ===== */
const page = { height: "100vh", background: "#f4f4f4" };
const overlay = { position: "fixed" as const, top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center" };
const popup = { background: "#fff", padding: 40, borderRadius: 24, width: 320, textAlign: "center" as const, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", animation: "popupScale 0.35s ease", border: "2px solid transparent" };
const title = { marginTop: 10, fontSize: 22 };
const sub = { marginTop: 8, color: "#666" };
const icon = { fontSize: 50 };
const btn = { marginTop: 20, padding: "12px", width: "100%", background: "#6b4729", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" };
const skipBtn = { marginTop: 10, border: "none", background: "none", color: "#888", cursor: "pointer" };
const closeBtn = { marginTop: 20, padding: "10px", width: "100%", background: "#ddd", border: "none", borderRadius: 10, cursor: "pointer" };
const spinner = { width: 40, height: 40, border: "4px solid #eee", borderTop: "4px solid #6b4729", borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite" };