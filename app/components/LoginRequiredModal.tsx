"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export default function LoginRequiredModal({
  isOpen,
  onClose,
  redirectTo = "/login",
}: LoginRequiredModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onClose();
    router.push(redirectTo);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 12px 35px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Icon icon="mdi:account-lock-outline" width="32" color="#b45309" />
        </div>

        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#111827" }}>
          กรุณาเข้าสู่ระบบก่อนใช้งาน
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
          คุณจำเป็นต้องเข้าสู่ระบบก่อนใช้ฟีเจอร์นี้
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#374151",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: "#6b4729",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
