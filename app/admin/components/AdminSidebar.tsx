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

  useEffect(() => {

    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);

  }, []);

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

        <button
          onClick={async () => {

            const confirmLogout = window.confirm(
              "คุณต้องการออกจากระบบจริง ๆ ใช่หรือไม่?"
            );

            if (!confirmLogout) return;

            await signOut(auth);
            router.push("/login");

          }}
          style={logoutBtn}
        >
          <span className="material-symbols-outlined" style={{marginRight:6}}>
            logout
          </span>
          ออกจากระบบ
        </button>

      </div>
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