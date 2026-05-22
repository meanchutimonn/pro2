"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

// 🎨 Palette (โทนเดียวกับ Home)
const W = {
  bg: "#ffffff",
  text: "#000000",
  muted: "#7A7A7A",
  unreadBg: "#FFF9E0",
  readBg: "#ffffff",
  lightGray: "#f0f0f0",
  red: "#FF7A7A",
};

// 🔥 Mock Data
const mockNotifications = [
  {
    id: 1,
    title: "ได้ 50 แต้ม 🎉",
    body: "คุณได้รับแต้มจากการเช็คอินวันนี้\nนำไปแลกของรางวัลได้เลย",
    time: "2 นาทีที่แล้ว",
    read: false,
  },
  {
    id: 2,
    title: "Coupon ใหม่มาแล้ว!",
    body: "รับส่วนลด 20% ที่ร้านกาแฟใกล้คุณ ☕",
    time: "10 นาทีที่แล้ว",
    read: false,
  },
  {
    id: 3,
    title: "หมุนวงล้อสำเร็จ 🎯",
    body: "คุณได้รับ 10 แต้ม จากกิจกรรมวันนี้",
    time: "30 นาทีที่แล้ว",
    read: false,
  },
  {
    id: 4,
    title: "แลกรางวัลสำเร็จ",
    body: "คุณใช้ 100 แต้ม แลกเครื่องดื่มเรียบร้อยแล้ว",
    time: "1 ชั่วโมงที่แล้ว",
    read: true,
  },
  {
    id: 5,
    title: "One Day Trip 🌿",
    body: "เช็คอินครบ 5 จุด รับโบนัสแต้มพิเศษ",
    time: "เมื่อวาน",
    read: true,
  },
];

// 🔥 Card
function NotifCard({
  notif,
  onMarkRead,
}: {
  notif: any;
  onMarkRead: (id: number) => void;
}) {
  const isUnread = !notif.read;

  return (
    <div className="notiCard">
      {/* เวลา */}
      <div className="notiTime">{notif.time}</div>

      {/* Title */}
      <div className="notiTitle">
        {isUnread && <div className="dot" />}
        <span>{notif.title}</span>
      </div>

      {/* Body */}
      <div className="notiBody">{notif.body}</div>
      {notif.placeName && (
        <div className="placeName">
          📍 {notif.placeName}
        </div>
      )}

      {/* Action */}
      {!notif.read && (
        <button onClick={() => onMarkRead(notif.id)} className="markBtn">
          mark as read
        </button>
      )}
    </div>
  );
}

// 🔥 Main Page
export default function NotificationPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const router = useRouter();

  const markRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="page">
      {/* HEADER */}
      <div className="header">
        <div className="headerLeft">
          <Icon icon="lucide:chevron-left" width="30" onClick={() => router.back()}
            style={{ cursor: "pointer" }} />
          <h1>Notifications</h1>
        </div>

        {unreadCount > 0 && (
          <div className="badge">{unreadCount}</div>
        )}
      </div>

      {/* LIST */}
      <div className="notiList">
        {notifications.map((notif) => (
          <NotifCard
            key={notif.id}
            notif={notif}
            onMarkRead={markRead}
          />
        ))}
      </div>

      {/* STYLE */}
      <style jsx global>{`
                body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

        .page {
          padding: 20px;
          background: #fff;
          min-height: 100vh;
          padding-bottom: 90px;
        }

        /* HEADER */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .headerLeft {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header h1 {
          font-size: 26px;
          font-weight: 700;
          margin: 0;
        }

        .badge {
          background: ${W.red};
          color: white;
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 12px;
        }

        /* LIST */
        .notiList {
          display: flex;
          flex-direction: column;
        }

        /* CARD */
        .notiCard {
          width: 100%;
          min-height: 140px;
          padding: 16px;
          border-bottom: 1px solid ${W.lightGray};
          background: ${W.readBg};
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .notiCard:nth-child(-n+3) {
          background: ${W.unreadBg};
        }

        .notiTime {
          position: absolute;
          top: 12px;
          right: 16px;
          font-size: 12px;
          color: ${W.muted};
        }

        .notiTitle {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 600;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${W.red};
        }

        .notiBody {
          margin-top: 6px;
          font-size: 14px;
          white-space: pre-line;
        }

        .markBtn {
          margin-top: auto;
          border: none;
          background: transparent;
          color: ${W.muted};
          font-size: 13px;
          cursor: pointer;
          text-align: left;
        }

        /* DESKTOP */
        @media (min-width: 1024px) {
          .page {
            max-width: 1100px;
            margin: 40px auto;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
          }
        }
      `}</style>
    </div>
  );
}