"use client";

import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { Icon } from "@iconify/react";

export default function AdminQRPage() {
  const { id } = useParams();
  const router = useRouter();

  if (!id) return null;

  const checkinUrl = `${window.location.origin}/checkin/${id}`;

  return (
    <div style={container}>

      {/* 🔙 ปุ่มกลับ */}
      <button onClick={() => router.back()} style={backBtn}>
        <Icon icon="lucide:chevron-left" width="28" />
      </button>

      <div style={card}>
        <h1 style={title}>QR Code สำหรับเช็คอิน</h1>

        {/* 🔥 QR */}
        <div style={qrBox}>
          <QRCodeCanvas value={checkinUrl} size={220} />
        </div>

        <p style={desc}>
          ให้ลูกค้าสแกน QR Code นี้เพื่อเช็คอินสถานที่นี้
        </p>

        {/* 🔗 URL */}
        <div style={urlBox}>{checkinUrl}</div>
      </div>

    </div>
  );
}

/* ===== STYLE ===== */

const container = {
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const card = {
  background: "#fff",
  padding: 40,
  borderRadius: 20,
  textAlign: "center" as const,
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
};

const title = {
  fontSize: 26,
  marginBottom: 25,
};

const qrBox = {
  background: "#f0fdf4",
  padding: 20,
  borderRadius: 16,
  display: "inline-block",
};

const desc = {
  marginTop: 20,
  color: "#555",
};

const urlBox = {
  marginTop: 15,
  fontSize: 12,
  background: "#f3f4f6",
  padding: 10,
  borderRadius: 8,
  wordBreak: "break-all" as const,
};

const backBtn = {
  position: "fixed" as const,
  top: 20,
  left: 20,
  width: 45,
  height: 45,
  borderRadius: "50%",
  background: "#614124",
  border: "none",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};