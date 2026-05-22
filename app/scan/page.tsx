"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { getAuth } from "firebase/auth";

export default function ScanPage() {

  const router = useRouter();

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

      router.push("/login"); // 🔥 เด้งไปหน้า login
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
            if (scanned) return;

            setScanned(true);

if (scannerRef.current && isScanning) {
  setIsScanning(false);
  scannerRef.current.stop().catch(() => {});
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
      .catch(() => {});
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
    
    <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>


</div>
      
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
  position:"relative",
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
  cursor:"pointer",
  
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