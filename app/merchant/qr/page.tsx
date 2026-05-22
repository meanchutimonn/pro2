"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

export default function MerchantQRPage() {
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUid(user.uid);
    });

    return () => unsubscribe();
  }, [router]);

  if (!uid) return <p style={{ padding: 40 }}>กำลังโหลด...</p>;

  const checkinUrl = `${window.location.origin}/checkin/${uid}`;

  return (
    <div style={containerStyle}>
      <TabBar pathname={pathname} router={router} />

      <div style={qrCardStyle}>
        <h1 style={titleStyle}>QR Code สำหรับเช็คอิน</h1>

        <div style={qrBoxStyle}>
          <QRCodeCanvas value={checkinUrl} size={220} />
        </div>

        <p style={descStyle}>
          ให้ลูกค้าสแกน QR Code นี้เพื่อทำการเช็คอิน
        </p>

        <div style={urlBoxStyle}>{checkinUrl}</div>
      </div>
    </div>
  );
}

/* ================= TAB COMPONENT ================= */

function TabBar({ pathname, router }: any) {
  return (
    <div style={tabWrapper}>
      <button
        onClick={() => router.push("/merchant")}
        style={{
          ...tabBtn,
          borderBottom:
            pathname === "/merchant" ? "3px solid #065f46" : "none",
          fontWeight: pathname === "/merchant" ? "bold" : "normal",
        }}
      >
        ข้อมูลร้านค้า
      </button>

      <button
        onClick={() => router.push("/merchant/dashboard")}
        style={{
          ...tabBtn,
          borderBottom:
            pathname === "/merchant/dashboard"
              ? "3px solid #065f46"
              : "none",
          fontWeight:
            pathname === "/merchant/dashboard" ? "bold" : "normal",
        }}
      >
        Dashboard
      </button>

      {/* ปุ่มใหม่ */}
      <button
        onClick={() => router.push("/merchant/coupon")}
        style={{
          ...tabBtn,
          borderBottom:
            pathname === "/merchant/coupon"
              ? "3px solid #065f46"
              : "none",
          fontWeight:
            pathname === "/merchant/coupon" ? "bold" : "normal",
        }}
      >
        Coupon
      </button>

      <button
        onClick={() => router.push("/merchant/qr")}
        style={{
          ...tabBtn,
          borderBottom:
            pathname === "/merchant/qr"
              ? "3px solid #065f46"
              : "none",
          fontWeight:
            pathname === "/merchant/qr" ? "bold" : "normal",
        }}
      >
        QR Code
      </button>
    </div>
  );
}

/* ================= STYLE ================= */

const containerStyle = {
  maxWidth: 900,
  margin: "40px auto",
  padding: 30,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
};

const qrCardStyle = {
  marginTop: 30,
  textAlign: "center" as const,
};

const titleStyle = {
  fontSize: 28,
  marginBottom: 25,
};

const qrBoxStyle = {
  background: "#f0fdf4",
  padding: 25,
  borderRadius: 16,
  display: "inline-block",
  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
};

const descStyle = {
  marginTop: 25,
  color: "#555",
};

const urlBoxStyle = {
  marginTop: 15,
  fontSize: 12,
  background: "#f3f4f6",
  padding: 10,
  borderRadius: 8,
  wordBreak: "break-all" as const,
};

const tabWrapper = {
  display: "flex",
  gap: 30,
  marginBottom: 30,
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 10,
};

const tabBtn = {
  background: "none",
  border: "none",
  fontSize: 16,
  cursor: "pointer",
  paddingBottom: 8,
};
