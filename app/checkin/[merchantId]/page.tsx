"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, increment, addDoc,
  collection, arrayUnion
} from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

export default function CheckinPage() {
  const { merchantId } = useParams();
  const router = useRouter();
  const isProcessingRef = useRef(false);

  const [status, setStatus] = useState<
    "loading" | "success" | "already" | "error"
  >("loading");

  const [shopName, setShopName] = useState("");

  const getToday = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
    }).format(new Date());
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      if (!user) {
        router.push("/login");
        return;
      }

      const today = getToday();
      const checkinId = `${user.uid}_${merchantId}_${today}`;
      const ref = doc(db, "checkins", checkinId);

      try {
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

        const updateMissionProgress = async () => {
          const missionRef = doc(db, "userMissions", user.uid);
          const missionSnap = await getDoc(missionRef);

          if (!missionSnap.exists()) return;

          const missionData = missionSnap.data();
          if (missionData.status !== "active") return;

          const tripStops: any[] = missionData.tripData?.stops || [];

          const stopIds = tripStops.map((s: any) =>
            String(s.location_id || s.locationId || s.cafeId).trim()
          );

          const currentLocationId = String(merchantId).trim();

          if (!stopIds.includes(currentLocationId)) return;

          const checkedIds: string[] = missionData.checkedLocationIds || [];
          const nextCheckedIds = Array.from(new Set([...checkedIds, currentLocationId]));

          const allDone = stopIds.every((id) => nextCheckedIds.includes(id));

          await setDoc(
            missionRef,
            {
              checkedLocationIds: nextCheckedIds,
              lastCheckinAt: serverTimestamp(),
              status: allDone ? "completed" : "active",
              completedAt: allDone ? serverTimestamp() : null,
            },
            { merge: true }
          );
        };

        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateMissionProgress();
          setStatus("already");
          return;
        }

        // ── แก้ ดึง active mission ก่อน บันทึก checkin ──────────────────
        const missionRefPre = doc(db, "userMissions", user.uid);
        const missionSnapPre = await getDoc(missionRefPre);
        const activeTripId = missionSnapPre.exists() && missionSnapPre.data().status === "active"
          ? missionSnapPre.data().tripId
          : null;

        // ── แก้ บันทึก checkin (รวม tripId ของ mission ที่ active) ──────────
        await setDoc(ref, {
          userId: user.uid,
          merchantId,
          locationId: merchantId,
          date: today,
          createdAt: serverTimestamp(),
        });

        await updateMissionProgress();

        await addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: "เช็คอินสำเร็จ 📍",
          body: `คุณเช็คอินที่ ${locationData?.locationName || merchantData?.name || "ร้านค้า"} สำเร็จแล้ว`,
          placeName: locationData?.locationName || merchantData?.name || "ร้านค้า",
          merchantId: merchantId,
          read: false,
          createdAt: serverTimestamp(),
        });

        await setDoc(
          doc(db, "users", merchantId as string),
          { checkinCount: increment(1) },
          { merge: true }
        );

        // ── แก้ update checkedLocationIds ใน active mission ────────────
        if (missionSnapPre.exists()) {
          const missionData = missionSnapPre.data();
          if (missionData.status === "active") {
            const tripStops: any[] = missionData.tripData?.stops || [];
            const stopIds = tripStops.map((s: any) =>
              String(s.location_id || s.locationId || s.cafeId)
            );
            const isInMission = stopIds.includes(String(merchantId));

            if (isInMission) {
              await setDoc(
                missionRefPre,
                {
                  checkedLocationIds: arrayUnion(String(merchantId)),
                  lastCheckinAt: serverTimestamp(),
                },
                { merge: true }
              );

              // เช็คว่าครบทุกร้านแล้วไหม → auto complete
              const checkedIds: string[] = missionData.checkedLocationIds || [];
              const allIds = [...new Set([...checkedIds, String(merchantId)])];
              const allDone = stopIds.every((id) => allIds.includes(id));
              if (allDone) {
                await setDoc(
                  missionRefPre,
                  { status: "completed", completedAt: serverTimestamp() },
                  { merge: true }
                );
              }
            }
          }
        }

        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    });

    return () => unsub();
  }, [merchantId]);

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
              <button style={closeBtn} onClick={() => { window.location.href = "/"; }}>
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
                  const targetId = merchantId;
                  if (targetId) {
                    router.push(`/game-scan?merchantId=${targetId}`);
                  } else {
                    const idFromUrl = window.location.pathname.split("/").pop();
                    router.push(`/game-scan?merchantId=${idFromUrl}`);
                  }
                }}
              >
                เล่นเกม
              </button>
              <button style={skipBtn} onClick={() => { window.location.href = "/"; }}>
                ข้าม
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes popupScale {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (min-width: 768px) {
          .popupBox { border: 2px solid #6b4729; }
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