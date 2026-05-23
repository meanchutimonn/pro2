"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [spun, setSpun] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // ✅ เพิ่ม

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
      } else {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setUserData(snap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(getAuth());
    router.push("/login");
  };

  return (
    <>
      {/* 🌰 พื้นหลังนอก = น้ำตาล */}
      <style jsx global>{`
        body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}
      `}</style>

      {/* 🌟 กล่องหน้าเหมือน Home */}
      <div
        className="pageWrap"
        style={{
          minHeight: "100vh",
          background: "#fff",
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* back */}
        <div style={{ padding: "16px 20px 0" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "#614124",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Icon icon="lucide:chevron-left" width="30" />
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 40px" }}>
          {/* avatar */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 24,
              marginBottom: 16,
            }}
          >
            {userData?.photoURL ? (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: `url('${userData.photoURL}') center/cover`,
                  border: "3px solid #f5f5f5",
                }}
              />
            ) : (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: "#ddd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon icon="mdi:account" width="50" color="#999" />
              </div>
            )}
          </div>

          {/* name */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {userData?.name || "User"}
            </div>
            <div style={{ fontSize: 16, color: "#5E5E5E", marginTop: 4 }}>
              {getAuth().currentUser?.email || "email"}
            </div>
          </div>

          {/* edit */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <button
              onClick={() => router.push("/edit-profile")}
              style={{
                background: "#FF7B7B",
                color: "#000",
                border: "none",
                width: 200,
                height: 53,
                borderRadius: 15,
                fontSize: 20,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              แก้ไขข้อมูล
            </button>
          </div>

          {/* balance */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Icon
                icon="material-symbols:rewarded-ads"
                width="50"
                color="#F3BC00"
              />
              <span style={{ fontSize: 24, fontWeight: 700 }}>
                คะแนนคงเหลือ :
              </span>
            </div>

            <span style={{ fontSize: 32, fontWeight: 800 }}>
              {userData?.balance || 0}
            </span>
          </div>

          {/* menu */}
          <MenuRow
            icon="material-symbols:history-rounded"
            label="ประวัติการเช็กอิน"
            onClick={() => router.push("/checkinhistory")}
          />
          <MenuRow
            icon="tabler:heart"
            label="รายการโปรด"
            onClick={() => router.push("/favourite")}
          />
          {/* <MenuRow icon="tabler:activity" label="กิจกรรมของคุณ" /> */}

          {/* spin */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "32px 0 28px",
            }}
          >
            <button
              onClick={() => router.push("/spin")}
              style={{
                background: spun ? "#5E5E5E" : "#614124",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                width: 210,
                height: 40,
                fontSize: 24,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Icon
                icon="pepicons-pop:arrow-spin-circle-filled"
                width="24"
                color="#F3BC00"
              />
              {spun ? "คุณหมุนไปแล้ววันนี้" : "วงล้อประจำวัน"}
            </button>
          </div>

          {/* logout */}
          <div style={{ marginTop: 40 }}>
            <button
              onClick={() => setShowLogoutConfirm(true)} // ✅ เปลี่ยนตรงนี้
              style={{
                background: "transparent",
                border: "none",
                fontSize: 20,
                fontWeight: 700,
                color: "red",
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 popup logout */}
      {showLogoutConfirm && (
        <div className="modalOverlay">
          <div className="modalBox">
            <h3>ออกจากระบบ</h3>
            <p>คุณต้องการออกจากระบบจริง ๆ ใช่ไหม?</p>

            <div className="modalActions">
              <button
                className="cancelBtn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                ยกเลิก
              </button>

              <button
                className="confirmBtn"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* style modal */}
      <style jsx global>{`
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .modalBox {
          background: white;
          padding: 24px;
          border-radius: 16px;
          width: 280px;
          text-align: center;
        }

        .modalActions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        .cancelBtn {
          flex: 1;
          background: #eee;
          border: none;
          padding: 10px;
          border-radius: 10px;
        }

        .confirmBtn {
          flex: 1;
          background: #ff7b7b;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 10px;
        }
      `
      }</style>
      <style jsx global>{`

  /* mobile */
  .pageWrap{
    max-width:100%;
    margin:0;
    border-radius:0;
    box-shadow:none;
  }

  /* desktop */
  @media(min-width:1024px){
    .pageWrap{
      max-width:1100px;
      margin:40px auto;
      border-radius:20px;
      box-shadow:0 0 20px rgba(0,0,0,0.25);
      overflow:hidden;
    }
  }
`}</style>
    </>
  );
}

function MenuRow({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 0",
        cursor: "pointer"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Icon icon={icon} width="22" color="#000" />
        <span style={{ fontSize: 20 }}>{label}</span>
      </div>

      <Icon icon="lucide:chevron-right" width="30" color="#5E5E5E" />
    </div>
  );
}