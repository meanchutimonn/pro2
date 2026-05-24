"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";



export default function GamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchantId");

  const [image, setImage] = useState("");

  useEffect(() => {
    if (!merchantId) return;

    const fetchData = async () => {
      const snap = await getDoc(doc(db, "locations", merchantId));

      if (snap.exists()) {
        setImage(snap.data().mainImage);
      }
    };

    fetchData();
  }, [merchantId]);

  return (
    <div className="page">

      {/* HEADER */}
      <div className="header">
        <div className="back" onClick={() => router.push("/")}>
          <Icon icon="lucide:chevron-left" width="30" />
        </div>

        <h2>Game Center</h2>
      </div>
      {image && (
        <img
          src={image}
          style={{
            width: "100%",
            height: 180,
            objectFit: "cover",
            borderRadius: 12,
            marginBottom: 20
          }}
        />
      )}

      {/* MENU */}
      <div className="menuCard" onClick={() => router.push(`/game/flip?merchantId=${merchantId}`)}>
        <div>
          <h3>Flip & Match</h3>
          <p>พลิกการ์ด เพื่อหารูปที่เหมือนกัน</p>
        </div>

        <Icon icon="mingcute:right-fill" width="22" />
      </div>

      <div className="menuCard" onClick={() => router.push(`/game/riddle?merchantId=${merchantId}`)}>
        <div>
          <h3>Riddle</h3>
          <p>หาคำตอบของคำถามที่ถูกต้อง</p>
        </div>

        <Icon icon="mingcute:right-fill" width="22" />
      </div>

      {/* TEXT */}
      <p className="desc">
        คุณจะได้รับสิทธิ์การเล่นเกมก็ต่อเมื่อเช็คอินตามสถานที่
      </p>

      <p className="desc">
        คุณจะได้รับคะแนนของสถานที่ ก็ต่อเมื่อคุณเล่นเกมของสถานที่นั้นๆจบเกม
      </p>

      {/* BUTTON */}
      <button
        className="checkinBtn"
        onClick={() => router.push("/scan")}
      >
        เช็กอินเลย
      </button>
      <style jsx global>{`
    body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}
`}</style>

      <style jsx>{`
      
        .page {
  min-height: 100vh;
  background: #fff;
  padding: 20px;
  font-family: sans-serif;

  border-radius: 0;   /* มือถือ = เต็มจอ */
  margin: 0;
}

/* 🔥 DESKTOP */
@media(min-width:1024px){
  .page{
    max-width: 1100px;
    margin: 40px auto;
    border-radius: 20px;
    box-shadow: 0 0 20px rgba(0,0,0,0.25);
    overflow: hidden;
  }
}

        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .back {
          width: 40px;
          height: 40px;
          background: #6b4729;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        }

        .header h2 {
          margin: auto;
          font-size: 20px;
          font-weight: 700;
        }

        .menuCard {
          background: #e8dd9f;
          padding: 14px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          cursor: pointer;
        }

        .menuCard h3 {
          margin: 0;
          font-size: 16px;
        }

        .menuCard p {
          margin: 4px 0 0;
          font-size: 13px;
        }

        .desc {
          margin-top: 20px;
          font-size: 14px;
        }

        .checkinBtn {
          margin-top: 40px;
          width: 100%;
          background: #f87171;
          border: none;
          padding: 16px;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
          .leaderboardCard {
  background: #c4b5fd; /* สีม่วงแยกจากเกม */
}
      `}</style>
    </div>
  );
}