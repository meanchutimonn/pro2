"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";



const W = {

  bg: "#ffffff",

  text: "#000000",

  muted: "#7A7A7A",

  unreadBg: "#FFF9E0",

  readBg: "#ffffff",

  lightGray: "#f0f0f0",

  red: "#FF7A7A",

};



// 🔥 NotifCard Component: ปรับให้รับ router มาใช้งานได้

function NotifCard({ notif, onMarkRead, router }: { notif: any; onMarkRead: (id: string) => void; router: any }) {

  const isUnread = !notif.read;


  const displayTime = notif.createdAt?.toDate

    ? notif.createdAt.toDate().toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' })

    : notif.displayTime || "";



  return (

    <div className={`notiCard ${isUnread ? "unread" : ""}`}>

      <div className="notiTime">{displayTime}</div>

      <div className="notiTitle">

        {isUnread && <div className="dot" />}

        <span>{notif.title}</span>

      </div>

      <div className="notiBody">{notif.body}</div>


      {/* ปุ่มปกติสำหรับแจ้งเตือนทั่วไป */}

      {isUnread && notif.id !== "reminder" && (

        <button onClick={() => onMarkRead(notif.id)} className="markBtn">

          mark as read

        </button>

      )}



      {/* ปุ่มพิเศษสำหรับ Reminder ไปหน้า Spin */}

      {notif.id === "reminder" && (

        <button

          className="markBtn"

          style={{ color: '#FF7A7A', fontWeight: 'bold' }}

          onClick={() => router.push("/spin")} // ✅ ลิงก์ไปหน้า spin

        >

          ไปร่วมสนุกเลย →

        </button>

      )}

    </div>

  );

}



export default function NotificationPage() {

  const [notifications, setNotifications] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const router = useRouter();


  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;

    // 1. ดึงข้อมูล Notification จากคะแนนเกม/หมุนวงล้อที่บันทึกใน Firestore

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubNotif = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
    });


    // 2. เช็คตรรกะ "วันนี้หมุนวงล้อหรือยัง" จากฟิลด์ lastSpinAt ใน collection users

    const checkDailyActivity = async () => {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const lastSpin = userData.lastSpinAt?.toDate();
        const now = new Date();

        const hasSpunToday = lastSpin &&
          lastSpin.getDate() === now.getDate() &&
          lastSpin.getMonth() === now.getMonth() &&
          lastSpin.getFullYear() === now.getFullYear();



        if (!hasSpunToday) {

          setReminders([{

            id: "reminder",

            title: "อย่าลืมรับสิทธิ์! 🎡",

            body: "วันนี้คุณยังไม่ได้หมุนวงล้อลุ้นโชค เข้าไปลุ้นคะแนนพิเศษกันเถอะ",

            read: false,

            displayTime: "Daily Reminder"

          }]);

        }

      }

    };



    checkDailyActivity();

    return () => unsubNotif();

  }, []);



  const markRead = async (id: string) => {

    if (id === "reminder") return;
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error(error);
    }
  };



  const allNotifications = [...reminders, ...notifications];
  const unreadCount = allNotifications.filter(n => !n.read).length;



  return (

    <div className="page">

      <div className="header">

        <div className="headerLeft">

          <Icon icon="lucide:chevron-left" width="32" onClick={() => router.push("/")} style={{ cursor: "pointer" }} />

          <h1>Notifications</h1>

        </div>

        {unreadCount > 0 && <div className="badge">{unreadCount}</div>}

      </div>



      <div className="notiList">

        {allNotifications.length === 0 ? (

          <p className="empty">ยังไม่มีการแจ้งเตือน</p>

        ) : (

          allNotifications.map((n) => (

            <NotifCard key={n.id} notif={n} onMarkRead={markRead} router={router} />

          ))

        )}

      </div>



      <style jsx global>{`

body {

background-image: url('/photo/background.jpg');

background-size: cover;

background-position: center;

background-repeat: no-repeat;

background-attachment: fixed;

margin: 0;

}

.page {

padding: 20px;

background: rgba(255, 255, 255, 0.98);

min-height: 100vh;

padding-bottom: 100px;

}

.header {

display: flex;

justify-content: space-between;

align-items: center;

margin-bottom: 25px;

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

padding: 5px 14px;

font-size: 14px;

font-weight: 700;

}

.notiList {

display: flex;

flex-direction: column;

gap: 12px;

}

.notiCard {

width: 100%;

min-height: 120px;

padding: 20px;

border-radius: 16px;

background: ${W.readBg};

border: 1px solid ${W.lightGray};

position: relative;

display: flex;

flex-direction: column;

box-sizing: border-box;

transition: transform 0.2s ease;

}

.notiCard.unread {

background: ${W.unreadBg};

border-left: 5px solid ${W.red};

}

.notiTime {

position: absolute;

top: 15px;

right: 20px;

font-size: 12px;

color: ${W.muted};

}

.notiTitle {

display: flex;

gap: 10px;

align-items: center;

font-weight: 700;

font-size: 18px;

padding-right: 80px;

}

.dot {

width: 8px;

height: 8px;

border-radius: 50%;

background: ${W.red};

flex-shrink: 0;

}

.notiBody {

margin-top: 8px;

font-size: 15px;

color: #444;

line-height: 1.5;

white-space: pre-line;

}

.markBtn {

margin-top: 15px;

border: none;

background: transparent;

color: #007AFF;

font-size: 13px;

font-weight: 600;

cursor: pointer;

padding: 0;

text-align: left;

width: fit-content;

}

.markBtn:hover {

text-decoration: underline;

}

@media (min-width: 1024px) {

.page {

max-width: 1000px; /* ขยายความกว้างสำหรับ Desktop */

margin: 40px auto;

border-radius: 24px;

box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);

padding: 40px;

}

.notiCard:hover {

transform: translateY(-2px);

box-shadow: 0 4px 12px rgba(0,0,0,0.05);

}

}

`}</style>

    </div>

  );

}