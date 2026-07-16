"use client";

import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";

export default function AdminSidebar() {

  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ เพิ่ม State สำหรับควบคุมการแสดงผลของ Logout Popup
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  useEffect(() => {

    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);

  }, []);

  // ✅ ฟังก์ชันสำหรับสั่งออกจากระบบจริง
  const handleConfirmLogout = async () => {
    setShowLogoutPopup(false);
    await signOut(auth);
    router.push("/login");
  };

  return (
    <>
      {/* HAMBURGER BUTTON */}
      {isMobile && (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={hamburgerBtn}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      )}

      {/* OVERLAY */}
      {isMobile && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={overlayStyle}
        />
      )}

      {/* SIDEBAR */}
      <div
        style={{
          ...sidebarStyle,
          ...(isMobile
            ? {
                position: "fixed",
                left: menuOpen ? 0 : "-100%",
                top: 0,
                width: "100vw",
                height: "100vh",
                background: "#fff",
                transition: "left 0.3s ease",
                zIndex: 1000,
              }
            : {}),
        }}
      >
        <h2 style={{ marginBottom: 40 }}>Trace</h2>

        <SidebarItem
          label="ภาพรวมระบบ"
          icon="dashboard"
          active={pathname === "/admin"}
          onClick={() => {
            router.push("/admin");
            setMenuOpen(false);
          }}
        />

        <SidebarItem
          label="การจัดการสถานที่"
          icon="add_location"
          active={pathname.startsWith("/admin/add-location")}
          onClick={() => {
            router.push("/admin/add-location");
            setMenuOpen(false);
          }}
        />

        <SidebarItem
          label="การจัดการบัญชี"
          icon="group"
          active={pathname.startsWith("/admin/account")}
          onClick={() => {
            router.push("/admin/account");
            setMenuOpen(false);
          }}
        />

        <SidebarItem
          label="รีวิวที่ถูกรายงาน"
          icon="warning"
          active={pathname.startsWith("/admin/report")}
          onClick={() => {
            router.push("/admin/report");
            setMenuOpen(false);
          }}
        />

        {/* ⚡ เปลี่ยนจากเรียก window.confirm เป็นการเปิด State Popup แทน */}
        <button
          onClick={() => setShowLogoutPopup(true)}
          style={logoutBtn}
        >
          <span className="material-symbols-outlined" style={{ marginRight: 6 }}>
            logout
          </span>
          ออกจากระบบ
        </button>

      </div>

      {/* 🔔 CUSTOM LOGOUT POPUP MODAL */}
      {showLogoutPopup && (
        <div style={popupOverlay}>
          <div style={popupCard}>
            
            {/* ส่วนหัวคาร์ดแจ้งเตือน */}
            <div style={iconWrapper}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#ef4444" }}>
                info
              </span>
            </div>

            <h3 style={popupTitle}>ยืนยันการออกจากระบบ</h3>
            <p style={popupDesc}>คุณต้องการออกจากระบบจริง ๆ ใช่หรือไม่?</p>

            {/* ปุ่มกดยืนยัน / ยกเลิก */}
            <div style={btnGroup}>
              <button 
                onClick={() => setShowLogoutPopup(false)} 
                style={cancelBtn}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmLogout} 
                style={confirmBtn}
              >
                ออกจากระบบ
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

/* ================= SIDEBAR ITEM ================= */

function SidebarItem({ label, active, onClick, icon }: any) {

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        marginBottom: 12,
        cursor: "pointer",
        background: active ? "#614124" : "transparent",
        color: active ? "white" : "#333",
        fontWeight: active ? "bold" : "normal",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        gap: 10,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "#f3f4f6";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* ICON */}
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20,
          color: active ? "white" : "#614124",
        }}
      >
        {icon}
      </span>

      {label}
    </div>
  );
}

/* ================= STYLES ================= */

const sidebarStyle:any = {
  width: "250px",
  background: "#fff",
  padding: "80px 30px 30px 30px",
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
};

const hamburgerBtn:any = {
  position: "fixed",
  top: 20,
  left: 20,
  zIndex: 1100,
  fontSize: 22,
  background: "#614124",
  color: "white",
  border: "none",
  width: 44,
  height: 44,
  borderRadius: 10,
  cursor: "pointer",
};

const overlayStyle:any = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.35)",
  zIndex: 900,
};

const logoutBtn:any = {
  marginTop: "auto",
  background: "none",
  border: "none",
  color: "red",
  cursor: "pointer",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 4,
};

// 🎨 สไตล์สำหรับ Custom Popup
const popupOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
  backdropFilter: "blur(4px)",
};

const popupCard: React.CSSProperties = {
  background: "white",
  width: "90%",
  maxWidth: "340px",
  borderRadius: "20px",
  padding: "30px 24px",
  textAlign: "center",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
};

const iconWrapper: React.CSSProperties = {
  marginBottom: "16px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const popupTitle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#333",
  marginBottom: "8px",
  margin: 0,
};

const popupDesc: React.CSSProperties = {
  fontSize: "14px",
  color: "#666",
  marginBottom: "24px",
  margin: 0,
};

const btnGroup: React.CSSProperties = {
  display: "flex",
  gap: "12px",
};

const cancelBtn: React.CSSProperties = {
  flex: 1,
  background: "#f3f4f6",
  color: "#4b5563",
  border: "none",
  padding: "12px",
  borderRadius: "12px",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
};

const confirmBtn: React.CSSProperties = {
  flex: 1,
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "12px",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
};
