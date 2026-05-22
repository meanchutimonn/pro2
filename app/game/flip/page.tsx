"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

export default function FlipPage() {
  const router = useRouter();

  return (
    <div className="page">

      {/* HEADER */}
      <div className="header">
        <div className="back" onClick={() => router.back()}>
          <Icon icon="lucide:chevron-left" width="30" />
        </div>

        <h2>Match The Pair</h2>
      </div>

      <div className="line"/>

            {/* 🔥 LEADERBOARD */}
<div 
  className="menuCard leaderboardCard"
  onClick={() => router.push("/leaderboard")}
>
  <div>
    <h3>อันดับสูงสุด</h3>
    <p>ดูคะแนนสูงสุดของแต่ละสถานที่</p>
  </div>

  <Icon icon="mingcute:right-fill" width="22" />
</div>
<br></br>

      <h3 className="title">วิธีเล่น</h3>

      {/* STEP LIST */}
      <div className="card">

        <div className="step">
          <div className="circle">1</div>
          <div>
            <h4>หาคู่ที่ใช่</h4>
            <p>พลิกการ์ด เพื่อหารูปที่เหมือนกัน</p>
          </div>
        </div>

        <div className="step">
          <div className="circle">2</div>
          <div>
            <h4>แข่งกับเวลา</h4>
            <p>คุณมี 60 วินาที ที่จะต้องหาคู่ให้ได้เยอะที่สุด</p>
          </div>
        </div>

        <div className="step">
          <div className="circle">3</div>
          <div>
            <h4>รับคะแนน</h4>
            <p>หลังจบเกม คุณจะได้รับการจัดอันดับและได้รับคะแนนจากสถานที่นั้นๆ</p>
          </div>
        </div>

      </div>

      <p className="note">
        คุณมีโอกาสเพียงรอบเดียวเท่านั้น
      </p>


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
  padding: 24px 20px;
  background: #ffff;
  min-height: 100vh;
  font-family: sans-serif;

  border-radius: 0;   /* 📱 mobile = เต็มจอ */
  margin: 0;
}
  .menuCard {
  margin-top: 20px;
  background: #e8dd9f;
  padding: 14px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;

  box-shadow: 0 6px 15px rgba(0,0,0,0.08);
}

.menuCard h3 {
  margin: 0;
  font-size: 15px;
}

.menuCard p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #555;
}

.leaderboardCard {
  background: #c4b5fd;
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

        /* HEADER */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .back {
          width: 42px;
          height: 42px;
          background: #6b4729;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .header h2 {
          margin: auto;
          font-size: 20px;
          font-weight: 700;
        }

        /* LINE */
        .line {
          height: 2px;
          background: #6b4729;
          margin: 15px 0 20px;
          border-radius: 10px;
        }

        /* TITLE */
        .title {
          margin-bottom: 12px;
          font-size: 16px;
          font-weight: 700;
        }

        /* CARD */
        .card {
          background: white;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }

        /* STEP */
        .step {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
          align-items: center;
        }

        .step:last-child {
          margin-bottom: 0;
        }

        .circle {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #d96b3b, #c65d2e);
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(198,93,46,0.4);
        }

        .step h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }

        .step p {
          margin: 5px 0 0;
          font-size: 13.5px;
          color: #666;
          line-height: 1.4;
        }

        /* NOTE */
        .note {
          text-align: center;
          font-weight: 700;
          margin-top: 30px;
          font-size: 14px;
          color: #333;
        }
      `}</style>
    </div>
  );
}