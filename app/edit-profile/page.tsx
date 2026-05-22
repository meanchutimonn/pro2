"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
// ✅ เพิ่มบรรทัด Import (ตรวจสอบ Path โฟลเดอร์ notifications ของคุณอีกครั้งนะครับ)
import sendNotification from "../notifications/page";

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;

    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setName(data.name || "");
        setGender(data.gender || "");
        setAvatar(data.photoURL || "");
      }
    };

    fetchUser();
  }, []);

  const handleImageChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Upload failed");
        return;
      }

      const data = await res.json();
      if (data.url) setAvatar(data.url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    // 1. อัปเดตข้อมูลเดิมของคุณ
    await updateDoc(doc(db, "users", user.uid), {
      name,
      gender,
      photoURL: avatar,
    });

    // ✅ 2. เพิ่มการส่งแจ้งเตือนหลังจาก updateDoc สำเร็จ
    const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(db, "notifications"), {
      userId: user.uid,
      title: "อัปเดตโปรไฟล์สำเร็จ ✨",
      body: "ข้อมูลส่วนตัวของคุณได้รับการเปลี่ยนแปลงเรียบร้อยแล้ว",
      read: false,
      createdAt: serverTimestamp(),
    });

    router.push("/profile");
  };

  return (
    <>
      {/* 🌰 ขอบน้ำตาล */}
      <div
        style={{
          backgroundImage: "url('/photo/background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
          padding: "0",
        }}
      >
        {/* ❗️ดีไซน์เดิมของหนูทั้งหมด */}
        <div
            className="pageWrap"
            style={{
                minHeight: "100vh",
                background: "#fff",
                fontFamily: "'Inter', sans-serif",
            }}
            >
          {/* back */}
          <div style={{ padding: "16px 20px 0" }}>
            <button
              onClick={() => router.back()}
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
              <Icon icon="lucide:chevron-left" width="22" />
            </button>
          </div>

          <div style={{ padding: "24px 28px 40px" }}>
            {/* avatar */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 36,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: "50%",
                  background: avatar
                    ? `url('${avatar}') center/cover`
                    : "#ddd",
                }}
              />

              <button
                onClick={() => {
                  if (avatar) {
                    setShowAvatarMenu(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: "calc(50% - 65px)",
                  transform: "translateX(50%)",
                  background: "transparent",
                  border: "none",
                }}
              >
                <Icon icon="tabler:edit" width="32" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>

            {/* form */}
            <Field label="Name" value={name} onChange={setName} />

            <Field
              label="Email"
              value={getAuth().currentUser?.email || ""}
              onChange={() => {}}
            />

            <Field label="Gender" value={gender} onChange={setGender} />

            {/* save */}
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                width: "100%",
                background: "#FF7B7B",
                color: "#fff",
                border: "none",
                borderRadius: 30,
                padding: "14px",
                fontWeight: 800,
              }}
            >
              Save
            </button>
          </div>

          {/* modal avatar */}
          {showAvatarMenu && (
            <div className="modalOverlay">
              <div className="modalBox">
                <h3>จัดการรูปโปรไฟล์</h3>

                <div
                  className="modalActions"
                  style={{ flexDirection: "column" }}
                >
                  <button
                    className="confirmBtn"
                    onClick={() => {
                      setShowAvatarMenu(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    เปลี่ยนรูปโปรไฟล์
                  </button>

                  <button
                    className="cancelBtn"
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setAvatar("");
                    }}
                  >
                    ลบรูปโปรไฟล์
                  </button>

                  <button
                    style={{
                      marginTop: 8,
                      background: "transparent",
                      border: "none",
                      color: "#999",
                    }}
                    onClick={() => setShowAvatarMenu(false)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* modal confirm */}
          {showConfirm && (
            <div className="modalOverlay">
              <div className="modalBox">
                <h3>ยืนยันการแก้ไข</h3>
                <p>คุณต้องการบันทึกข้อมูลใช่หรือไม่?</p>

                <div className="modalActions">
                  <button
                    className="cancelBtn"
                    onClick={() => setShowConfirm(false)}
                  >
                    ยกเลิก
                  </button>

                  <button
                    className="confirmBtn"
                    onClick={() => {
                      setShowConfirm(false);
                      handleSave();
                    }}
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

        .modalBox h3 {
          margin-bottom: 8px;
        }

        .modalBox p {
          font-size: 14px;
          color: #666;
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
      `}</style>
      <style jsx global>{`
body{
  background-image: url('/photo/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

  /* mobile */
  .pageWrap{
    max-width:100%;
    margin:0;
    border-radius:0;
  }

  /* desktop */
  @media(min-width:1024px){
    .pageWrap{
      max-width:1100px;
      margin:40px auto;
      border-radius:20px;
      overflow:hidden;
    }
  }
`}</style>
    </>
  );
}

/* Field */
function Field({ label, value, onChange }: any) {
  return (
    <div
      style={{
        display: "flex",
        padding: "18px 0",
        borderBottom: "1px solid #eee",
        gap: 16,
      }}
    >
      <span style={{ width: 100, fontWeight: 700 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, border: "none", outline: "none" }}
      />
    </div>
  );
}