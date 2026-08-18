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

  // 🔥 1. เพิ่ม State สำหรับเปิด/ปิด Pop-up แจ้งเตือน
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {

    const startCamera = async () => {
      const user = getAuth().currentUser;

      if (!user) {
        // 🔥 2. แก้ตรงนี้: เปลี่ยนจาก alert() เป็นสั่งเปิด Pop-up แทน
        setShowAuthModal(true);
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
        // ดึง track มาใช้ flash
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

  }, []);

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

    <div className="page" style={page}>

      <button
        style={back}
        onClick={() => router.push("/")}
      >

        <Icon icon="lucide:chevron-left" width="30" />
      </button>

      <button
        style={flashBtn}
        onClick={toggleFlash}
      >
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

        <p style={guideText}>
          • สำหรับร้านค้า กรุณาขอ QR Code ได้ที่เคาน์เตอร์
        </p>

        <p style={guideText}>
          • สำหรับวัด จุดสแกนจะอยู่บริเวณทางเข้าโบสถ์
        </p>

        <p style={guideText}>
          • สำหรับตลาด จุดสแกนจะอยู่ที่เสาแรกของทางเข้าตลาด
        </p>
      </div>

      {/* 🔥 3. เพิ่มส่วนแสดงผล Pop-up Modal */}
      {showAuthModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={modalTitle}>แจ้งเตือน</h3>
            <p style={modalText}>กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
            <div style={modalBtnGroup}>
              <button 
                style={cancelBtn} 
                onClick={() => setShowAuthModal(false)}
              >
                ยกเลิก
              </button>
              <button 
                style={loginBtn} 
                onClick={() => router.push("/login")}
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
          body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

  .page{
    border-radius: 0;
    margin: 0;
  }

  /* 💻 DESKTOP */
  @media(min-width:1024px){
    .page{
      max-width: 1100px;
      margin: 40px auto;
      border-radius: 20px;
      box-shadow: 0 0 20px rgba(0,0,0,0.25);
      overflow: hidden;
    }
  }
`}</style>
    </div>


  );

}


/* ---------- STYLE (แก้ TypeScript แล้ว) ---------- */

const page: React.CSSProperties = {
  height: "100vh",
  background: "#f4f4f4",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "80px",
  position: "relative",
  top: "20px"
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

  display: "flex",              // ✅ เพิ่ม
  alignItems: "center",         // ✅ เพิ่ม
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
  width: "360px",
  height: "480px",
  borderRadius: "20px",
  overflow: "hidden",
  background: "black"
};

const text: React.CSSProperties = {
  marginTop: "20px",
  fontSize: "18px",
  fontWeight: "600"
};

const guideBox: React.CSSProperties = {
  marginTop: "18px",
  width: "360px",
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

/* 🔥 4. สไตล์ Pop-up Modal เพิ่มเติม */

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalCard: React.CSSProperties = {
  width: "85%",
  maxWidth: "340px",
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  padding: "24px 20px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  textAlign: "center"
};

const modalTitle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "18px",
  fontWeight: "700",
  color: "#333"
};

const modalText: React.CSSProperties = {
  margin: "0 0 20px 0",
  fontSize: "15px",
  color: "#666"
};

const modalBtnGroup: React.CSSProperties = {
  display: "flex",
  gap: "10px"
};

const cancelBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  backgroundColor: "#f5f5f5",
  color: "#555",
  fontWeight: "600",
  cursor: "pointer"
};

const loginBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#6b4729", // สีเดียวกับธีมแอป
  color: "#ffffff",
  fontWeight: "600",
  cursor: "pointer"
};