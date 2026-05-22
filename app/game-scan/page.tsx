"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";


import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function GameScanPage() {

  const [loadingImage, setLoadingImage] = useState(true);

  const router = useRouter();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [image, setImage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setMerchantId(params.get("merchantId"));
  }, []);

  useEffect(() => {
    if (!merchantId) return;

    const fetchData = async () => {
      const snap = await getDoc(doc(db, "locations", merchantId));

      if (snap.exists()) {
        const data = snap.data();

        setImage(data.mainImage);
        setLoadingImage(false);

        const category = data.category?.toLowerCase().trim();

        if (["cafe", "food", "restaurant"].includes(category)) {
          setType("shop"); // flip
        } else if (["temple", "market", "sight"].includes(category)) {
          setType("admin"); // riddle
        } else {
          setType("shop");
        }
      }
    };

    fetchData();
  }, [merchantId]);


  const ADMIN_ID = "7Ay3Nc5bn8hAqjyl2QKM8oBGyBt1";

  const [type, setType] = useState("shop");

  return (
    <div className="page">



      {/* HEADER */}
      <div className="header">
        <div className="back" onClick={() => router.push("/scan")}>
          <Icon icon="lucide:chevron-left" width="30" />
        </div>

        <h2>
          {type === "shop" ? "Match The Pair" : "Riddle"}
        </h2>
      </div>

      {/* IMAGE */}
      <div className="hero">
        <div className="hero">
          {loadingImage ? (
            <div className="spinner"></div>
          ) : (
            <img src={image} />
          )}
        </div>
      </div>

      {/* POINT */}
      <div className="pointCard">
        <Trophy size={50} />
        <div>
          <h1>{type === "shop" ? "Get 5 points" : "Get 10 points"}</h1>
          <p>
            {type === "shop"
              ? "Play the game to get them!"
              : "Answer correctly to earn points!"}
          </p>
        </div>
      </div>

      {/* HOW TO PLAY */}
      <h3 className="title">วิธีเล่น</h3>

      <div className="card">

        {/* 🏪 SHOP */}
        {type === "shop" && (
          <>
            <Step no="1" title="หาคู่ที่ใช่" text="พลิกการ์ด เพื่อหารูปที่เหมือนกัน" />
            <Step no="2" title="แข่งกับเวลา" text="คุณมี 60 วินาที ที่จะต้องหาคู่ให้ได้เยอะที่สุด" />
            <Step no="3" title="รับคะแนน" text="หลังจบเกม คุณจะได้รับการจัดอันดับและได้รับคะแนนจากสถานที่นั้นๆ" />
          </>
        )}

        {/* 👑 ADMIN */}
        {type === "admin" && (
          <>
            <Step no="1" title="ตอบสถานที่จากรูปภาพ" text="ดูภาพและคำถาม แล้วเลือกคำตอบที่ถูกต้อง" />
            <Step no="2" title="แข่งกับเวลา" text="คุณมีเวลาเพียง 30 วินาที ในการตอบคำถาม คุณสามารถใช้ตัวช่วยได้" />
            <Step no="3" title="รับคะแนน" text="หลังจบเกมคุณจะได้คะแนนจากสถานที่นั้นๆ" />
          </>
        )}

      </div>

      {/* NOTE */}
      <p className="note">
        คุณมีโอกาสเพียงรอบเดียวเท่านั้น
      </p>

      {/* FOOTER */}
      <div className="footer">
        <button
          className="playBtn"
          onClick={() => {
            if (type === "admin") {
              router.push(`/game-scan/admin-game?merchantId=${merchantId}`);
            } else {
              router.push(`/game-scan/merchant-game?merchantId=${merchantId}`);
            }
          }}
        >
          Ready to Play <Play size={20} />
        </button>
      </div>

      {/* ===== STYLE ===== */}
      <style jsx global>{`

                body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

        .spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #eee;
  border-top: 5px solid #6b4729;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: auto;
  margin-top: 70px;
}

        .page{
          padding:20px;
          background:#fff;
          min-height:100vh;
          font-family:sans-serif;
          padding-bottom:40px;
        }

        .header{
          display:flex;
          align-items:center;
          gap:10px;
        }

        .back{
          width:42px;
          height:42px;
          background:#6b4729;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          cursor:pointer;
        }

        .header h2{
          margin:auto;
          font-size:20px;
          font-weight:700;
        }

        .hero{
          width:100%;
          height:200px;
          border-radius:14px;
          overflow:hidden;
          margin-top:10px;
        }

        .hero img{
          width:100%;
          height:100%;
          object-fit:cover;
        }

        .pointCard{
          margin-top:20px;
          padding:16px;
          background:#F2C94C;
          border-radius:16px;
          display:flex;
          gap:12px;
          align-items:center;
        }

        .pointCard h1{
          font-size:24px;
          margin:0;
        }

        .title{
          margin-top:20px;
          font-weight:700;
        }

        .card{
          background:white;
          border-radius:16px;
          padding:16px;
          margin-top:10px;
          box-shadow:0 6px 20px rgba(0,0,0,0.08);
        }

        .step{
            display:flex;
            gap:12px;
            margin-bottom:18px;
            align-items:flex-start;   /* 🔥 สำคัญ */
            }

        .circle{
            width:40px;
            height:40px;
            min-width:40px;      /* 🔥 กันโดนบีบ */
            min-height:40px;     /* 🔥 กันยุบ */
            background:#ddd;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:bold;
            flex-shrink:0;       /* 🔥 สำคัญมาก */
            }

        .note{
          text-align:center;
          margin-top:20px;
          font-weight:700;
        }

        .footer{
          margin-top:20px;
        }

        .playBtn{
          width:100%;
          padding:16px;
          border-radius:30px;
          background:#FF8A8A;
          border:none;
          font-weight:bold;
          display:flex;
          justify-content:center;
          align-items:center;
          gap:10px;
        }

        .switch{
          display:flex;
          gap:10px;
          margin-bottom:10px;
        }

        .switch button{
          padding:6px 12px;
          border:none;
          border-radius:8px;
          cursor:pointer;
        }

        @media(min-width:1024px){
          .page{
            max-width:900px;
            margin:40px auto;
            border-radius:20px;
            box-shadow:0 0 20px rgba(0,0,0,0.25);
          }

          .hero{
            height:260px;
          }

          .pointCard h1{
            font-size:32px;
          }
        }

      `}</style>

    </div>
  );
}

function Step({ no, title, text }: any) {
  return (
    <div className="step">
      <div className="circle">{no}</div>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}