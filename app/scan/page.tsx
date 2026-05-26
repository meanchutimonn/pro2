"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { getAuth } from "firebase/auth";

export default function ScanPage() {
  const router = useRouter();
  const scannedRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const trackRef = useRef<any>(null);

  const [flash, setFlash] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      const user = getAuth().currentUser;

      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        router.push("/login");
        return;
      }

      try {
        const scanner: any = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            setScanned(true);

            if (scannerRef.current && isScanning) {
              setIsScanning(false);
              scannerRef.current.stop().catch(() => { });
            }

            router.push(decodedText);
          }
        );
        setIsScanning(true);
        
        const video = document.querySelector("#reader video") as HTMLVideoElement;
        if (video?.srcObject) {
          const stream = video.srcObject as MediaStream;
          trackRef.current = stream.getVideoTracks()[0];
        }

      } catch (err) {
        console.log("กล้องไม่สามารถทำงานได้:", err);
      }
    };

    setTimeout(startCamera, 300);

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current.clear();
          })
          .catch(() => { });
      }
    };
  }, [isScanning, router]);

  const toggleFlash = async () => {
    if (!trackRef.current) return;
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !flash }]
      });
      setFlash(!flash);
    } catch (err) {
      console.log("แฟลชไม่สามารถทำงานได้:", err);
    }
  };

  return (
    /* 💡 เปลี่ยนเรียก className="appContainer" เพื่อให้สัมพันธ์กับสไตล์ global */
    <div className="appContainer" style={page}>
      <button style={back} onClick={() => router.push("/")}>
        <Icon icon="lucide:chevron-left" width="30" />
      </button>

      <button style={flashBtn} onClick={toggleFlash}>
        {flash ? "ปิดแฟลช" : "เปิดแฟลช"}
      </button>

      <div style={cameraBox}>
        <div id="reader" style={{ width: "100%", height: "100%" }}></div>
      </div>

      <p style={text}>
        เปิดใช้งานกล้องเพื่อสแกน QR Code
      </p>

      <div style={guideBox}>
        <h3 style={guideTitle}>คำแนะนำการสแกน</h3>
        <p style={guideText}>• สำหรับร้านค้า กรุณาขอ QR Code ได้ที่เคาน์เตอร์</p>
        <p style={guideText}>• สำหรับวัด จุดสแกนจะอยู่บริเวณทางเข้าโบสถ์</p>
        <p style={guideText}>• สำหรับตลาด จุดสแกนจะอยู่ที่เสาแรกของทางเข้าตลาด</p>
      </div>

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}></div>

      <style jsx global>{`
        body {
          background-image: url('/photo/background.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        /* 💡 ตั้งค่าคอนเทนเนอร์หลักให้แผ่เต็มหน้าจอตามหน้าอื่น */
        .appContainer {
          width: 100%;
          max-width: 1100px;
          min-height: 100vh;
          background: #ffffff; /* เปลี่ยนเป็นพื้นหลังสีขาวล้วน */
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          margin: 40px auto;
        }

        /* 📱 บังคับยืดเต็มจอ ลบขอบมน และถมพื้นที่ด้านล่างสุดของมือถือ */
        @media (max-width: 760px) {
          .appContainer {
            border-radius: 0 !important;
            margin: 0 !important;
            min-height: 100dvh !important; /* จัดการปัญหาแถบด้านล่างของ Safari ทะลุ */
            height: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- STYLE (แก้ไขจุดลอยและสีพื้นหลัง) ---------- */
const page: React.CSSProperties = {
  /* ลบ height: "100vh" และความสูงเก่าออก เพื่อส่งต่อให้สไตล์ .appContainer คุมแทน */
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "80px",
  paddingBottom: "40px", /* เพิ่ม padding ท้ายหน้ากันข้อมูลชิดขอบ */
  position: "relative"
  /* ลบพารามิเตอร์ background และ top: "20px" ที่ดึงหน้าจอลอยออกเรียบร้อย */
};

const back: React.CSSProperties = {
  position: "absolute",
  left: "20px",
  top: "25px",
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  border: "none",
  background: "#6b4729",
  color: "white",
  fontSize: "20px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const flashBtn: React.CSSProperties = {
  position: "absolute",
  right: "20px",
  top: "25px",
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#333",
  color: "white",
  cursor: "pointer"
};

const cameraBox: React.CSSProperties = {
  width: "320px", /* ปรับกระชับให้สมส่วนกับจอมือถือมากขึ้น */
  height: "420px",
  borderRadius: "20px",
  overflow: "hidden",
  background: "black"
};

const text: React.CSSProperties = {
  marginTop: "20px",
  fontSize: "18px",
  fontWeight: "600",
  color: "#000"
};

const guideBox: React.CSSProperties = {
  marginTop: "18px",
  width: "320px",
  background: "rgba(255,255,255,0.95)",
  borderRadius: "16px",
  padding: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  border: "1px solid #e5e5e5"
};

const guideTitle: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: "16px",
  fontWeight: "700",
  color: "#6b4729"
};

const guideText: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#444"
};