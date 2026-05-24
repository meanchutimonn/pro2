"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { Icon } from "@iconify/react";
import { Timestamp } from "firebase/firestore";
import { increment, collection, getDocs, query, where, addDoc } from "firebase/firestore";
// ✅ นำเข้าฟังก์ชันแจ้งเตือน
import sendNotification from "../notifications/page";

export default function SpinPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [canSpinToday, setCanSpinToday] = useState(true);
  const [result, setResult] = useState<any>(null);
  const currentAngleRef = useRef(0);
  const router = useRouter();
  const [size, setSize] = useState(300);
  const [showSpinPopup, setShowSpinPopup] = useState(false);

  const rewards = [
    { label: "1", label2: "coupon", color: "#4a8fd4", weight: 2 },   // ฟ้า (ออกยาก)
    { label: "no", label2: "point", color: "#c0a878", weight: 0 },
    { label: "1", label2: "point", color: "#f0ede0", weight: 10 },
    { label: "2", label2: "point", color: "#f0c030", weight: 5 },    // เหลือง (ออกยาก)
    { label: "spin", label2: "again", color: "#7a5030", weight: 3 },  // น้ำตาลเข้ม (โคตรยาก)
    { label: "no", label2: "point", color: "#ddd0b0", weight: 0 },
    { label: "1", label2: "point", color: "#f0ede0", weight: 10 },
  ];

  const n = rewards.length;
  const sliceAngle = (2 * Math.PI) / n;

  function canSpinTodayCheck(lastSpinAt: any) {
    if (!lastSpinAt) return true;

    const last = new Date(lastSpinAt.seconds * 1000);
    const now = new Date();

    // ปรับเป็นเวลาไทย
    const lastTH = new Date(last.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const nowTH = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

    return (
      lastTH.getDate() !== nowTH.getDate() ||
      lastTH.getMonth() !== nowTH.getMonth() ||
      lastTH.getFullYear() !== nowTH.getFullYear()
    );
  }

  function drawWheel(angle: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.43;

    ctx.clearRect(0, 0, size, size);

    // Outer decorative rim
    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, 0, 2 * Math.PI);
    ctx.strokeStyle = "#c8a870";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
    ctx.strokeStyle = "#e8d8b0";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Slices
    for (let i = 0; i < n; i++) {
      const start = angle + i * sliceAngle;
      const end = start + sliceAngle;
      const mid = start + sliceAngle / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = rewards[i].color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.translate(r * 0.60, 0);
      ctx.rotate(Math.PI / 2);

      const isLight = ["#f0ede0", "#ddd0b0", "#c0a878", "#f0c030"].includes(rewards[i].color);
      ctx.fillStyle = isLight ? "#3a2510" : "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rewards[i].label, 0, -8);
      ctx.fillText(rewards[i].label2, 0, 8);
      ctx.restore();
    }

    // Divider lines
    for (let i = 0; i < n; i++) {
      const a = angle + i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, 2 * Math.PI);
    ctx.fillStyle = "#d0b888";
    ctx.fill();
    ctx.strokeStyle = "#b89850";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = "#e8d8b0";
    ctx.fill();

    ctx.fillStyle = "#6b4226";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);
  }

  useEffect(() => {
    const check = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));

      const data = snap.data();


      if (!canSpinTodayCheck(data?.lastSpinAt)) {
        setCanSpinToday(false);
        setShowSpinPopup(true);
        return;
      }

      setCanSpinToday(canSpinTodayCheck(data?.lastSpinAt));
    };

    check();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth > 1024) {
        setSize(420);
      } else {
        setSize(300);
      }
    };

    updateSize(); // run ครั้งแรก
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [size]);


  async function handleSpin() {
    if (spinning) return;
    const user = getAuth().currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    // 🔥 เช็คจาก state ก่อน (instant)
    if (!canSpinToday) {
      setShowSpinPopup(true);
      return;
    }

    // ค่อย fetch DB กันโกง
    const snap = await getDoc(userRef);


    const data = snap.data();
    setSpinning(true);
    setResult("");

    setCanSpinToday(false);

    const targetIndex = getWeightedIndex();
    const extraSpins = 5 * 2 * Math.PI;

    const targetAngle =
      extraSpins +
      (Math.PI * 1.5 - (targetIndex * sliceAngle + sliceAngle / 2));

    const startAngle = currentAngleRef.current;
    const totalRotation = targetAngle - (startAngle % (2 * Math.PI));
    const duration = 3000;
    let startTime: number | null = null;

    function easeOut(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }
    // 🔥 กันโกงจริง
    if (!canSpinTodayCheck(data?.lastSpinAt)) {
      setShowSpinPopup(true);
      setSpinning(false);
      return;
    }


    function getWeightedIndex() {
      const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < rewards.length; i++) {
        random -= rewards[i].weight;
        if (random <= 0) {
          return i;
        }
      }

      return 0;
    }

    async function animate(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      currentAngleRef.current = startAngle + totalRotation * easeOut(progress);
      drawWheel(currentAngleRef.current);

      if (progress < 1) {
        requestAnimationFrame((t) => animate(t));
      } else {
        setSpinning(false);
        const finalAngle = currentAngleRef.current % (2 * Math.PI);

        // pointer อยู่ด้านบน = 1.5π
        const pointerAngle = (Math.PI * 1.5 - finalAngle + 2 * Math.PI) % (2 * Math.PI);

        const index = Math.floor(pointerAngle / sliceAngle);
        const r = rewards[index];

        setResult(r);

        // ✅ ถ้าไม่ได้ spin again ให้ล็อกสิทธิ์
        if (!(r.label === "spin" && r.label2 === "again")) {
          await updateDoc(userRef, {
            lastSpinAt: serverTimestamp()
          });

          setCanSpinToday(false);
        } else {
          // ✅ ได้สิทธิ์หมุนฟรี
          setCanSpinToday(true);
        }

        // ✅ แจ้งเตือนเมื่อสปินเสร็จ (เฉพาะเมื่อได้รางวัล)
        if (r.label !== "no" && user) {
          await addDoc(collection(db, "notifications"), {
            userId: user.uid,
            title: `ยินดีด้วย! คุณได้รับรางวัล 🎉`,
            body: `คุณได้รับ ${r.label} ${r.label2} จากการหมุนวงล้อประจำวัน!`,
            read: false,
            createdAt: serverTimestamp()
          });
        }

        // ✅ POINT
        if (r.label2 === "point" && r.label !== "no") {
          const points = parseInt(r.label);

          await updateDoc(userRef, {
            balance: increment(points)
          });
        }

        // ✅ COUPON
        if (r.label2 === "coupon") {

          // ✅ ใช้แบบนี้แทนเพื่อให้ได้วันที่ของ "ประเทศไทย" แน่นอน
          const now = new Date();
          const today = now.toLocaleDateString('en-CA'); // คืนค่าเป็น "YYYY-MM-DD" ตามเวลาท้องถิ่น
          console.log("Checking coupons for date:", today); // ลองดูใน Console ว่าได้เลขอะไร

          const q = query(
            collection(db, "coupon"),
            where("expiry_date", ">=", today)
          );

          const couponSnap = await getDocs(q);

          const coupons = couponSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          if (coupons.length > 0) {

            const randomCoupon =
              coupons[Math.floor(Math.random() * coupons.length)];


            await addDoc(collection(db, "user_coupons"), {
              user_id: user!.uid,
              coupon_id: randomCoupon.id,
              used: false,
              created_at: new Date()
            });
          }
        }

      }
    }
    requestAnimationFrame(animate);
  }

  return (
    <>
      <style jsx global>{`
        body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

.btnGroup {
  display: flex;
  flex-direction: column;
  gap: 14px; /* 🔥 ปรับระยะห่างตรงนี้ */
  margin-top: 10px;
}
      `}</style>

      <div className="pageWrap">
        <div className="page">

          {/* Top bar */}
          <div className="topbar">
            <button
              className="backBtn"
              onClick={() => router.push("/profile")}
            >
              <Icon icon="lucide:chevron-left" width="30" />
            </button>
            <span className="pageTitle">Lucky Spin</span>
            <div className="coinBadge">
              <div className="coinIcon">G</div>
              <span>
                {canSpinToday ? 1 : 0}
              </span>
            </div>
          </div>

          {/* Pointer */}
          <div className="pointer" />

          {/* Canvas Wheel */}
          <div className="wheelWrap">
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
            />
          </div>

          <button
            className="spinBtn"
            onClick={handleSpin}
            disabled={spinning}
          >
            หมุนเลย !
          </button>

          {result && (

            <div className="rewardOverlay">
              <div
                className="rewardModal"
                style={{
                  background: result.label === "no" ? "#d9d9d9" : "#f2c94c",
                  color: result.label === "no" ? "#666" : "#5a3d28"
                }}
              >

                <div className="rewardTitle">
                  {result.label === "no" ? "Oops,It's gonna be OK " : "Lucky Spin "}
                </div>

                <div className="rewardText">
                  {result.label === "no"
                    ? "ไม่เป็นไร พรุ่งนี้ลองใหม่นะคะ "
                    : `คุณได้รับ ${result.label} ${result.label2}!`}
                </div>

                <div className="btnGroup">
                  <button
                    className="closeBtn"
                    onClick={() => setResult(null)}
                  >
                    ตกลง
                  </button>

                  {result.label2 === "coupon" && (
                    <button
                      className="closeBtn"
                      onClick={() => router.push("/mycoupon")}
                    >
                      ดูคูปองของฉัน
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
      {showSpinPopup && (
        <div className="modalOverlay">
          <div className="modalBox">
            <h3>แจ้งเตือน</h3>
            <p>วันนี้คุณหมุนไปแล้วนะ </p>

            <div className="modalActions">
              <button
                className="confirmBtn"
                onClick={() => setShowSpinPopup(false)}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        body {
  background: #6b4729;
  margin: 0;
}

/* 📱 mobile */
.pageWrap {
  max-width: 100%;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

/* 💻 desktop */
@media (min-width: 1024px) {
  .pageWrap {
    max-width: 1100px;   /* 🔥 ขยาย */
    margin: 40px auto;
    border-radius: 24px;
    box-shadow: 0 0 20px rgba(0,0,0,0.25);
    overflow: hidden;
  }
}
        .page {
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 40px;
          min-height: 100vh;
          justify-content:flex-start;
        }

        /* Top bar */
        .topbar {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 14px 16px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          box-sizing: border-box;
        }
        .backBtn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #5a3d28;
          border: none;
          color: white;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pageTitle {
          flex: 1;
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .coinBadge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f0e8c0;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #5a3d28;
        }
        .coinIcon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #c8a84b;
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
          .resultCard {
  margin-top: 20px;
  background: #f2c94c;
  padding: 16px 20px;
  border-radius: 16px;
  width: 80%;
  max-width: 320px;
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  animation: slideUp 0.3s ease;
}

.resultTitle {
  font-size: 14px;
  font-weight: 700;
  color: #3a2a00;
}

.resultText {
  font-size: 18px;
  font-weight: 700;
  color: #5a3d28;
  margin-top: 4px;
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
  /* 🔥 พื้นหลังเบลอ */
.rewardOverlay {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(6px);
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* 🎁 กล่องรางวัล */
.rewardModal {
  background: #f2c94c;
  padding: 24px;
  border-radius: 20px;
  width: 280px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.25);
  animation: popUp 0.3s ease;
}

/* หัวข้อ */
.rewardTitle {
  font-size: 16px;
  font-weight: 700;
  color: #3a2a00;
}

/* ข้อความ */
.rewardText {
  font-size: 20px;
  font-weight: 800;
  color: #5a3d28;
  margin: 10px 0 20px;
}

/* ปุ่ม */
.closeBtn {
  background: #5a3d28;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* animation */
@keyframes popUp {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

        /* Pointer */
        .pointer {
          width: 0;
          height: 0;
          border-left: 13px solid transparent;
          border-right: 13px solid transparent;
          border-top: 24px solid #5a3d28;
          margin: 28px auto -10px;
          position: relative;
          z-index: 10;
        }

        /* Wheel */
        .wheelWrap {
          position: relative;
          margin: 0 auto;
        }
        canvas {
          display: block;
          border-radius: 50%;
        }

        /* Spin button */
        .spinBtn {
          margin-top: 32px;
          padding: 16px 60px;
          border-radius: 30px;
          background: #e96b6b;
          border: none;
          font-size: 18px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          letter-spacing: 0.5px;
        }
        .spinBtn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .result {
          margin-top: 14px;
          font-size: 15px;
          font-weight: 600;
          color: #5a3d28;
        }
          .modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modalBox {
  background: white;
  padding: 24px;
  border-radius: 16px;
  width: 280px;
  text-align: center;
  animation: pop 0.25s ease;
}

.modalActions {
  margin-top: 18px;
}

.confirmBtn {
  background: #e96b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
}

@keyframes pop {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
      `}</style>
    </>
  );
}