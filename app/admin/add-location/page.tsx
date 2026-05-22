"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import AdminSidebar from "../components/AdminSidebar";
import React from "react";

const ADMIN_UID = "7Ay3Nc5bn8hAqjyl2QKM8oBGyBt1";

interface LocationType {
  id: string;
  locationName?: string;
  address?: string;
  ownerId?: string;
}

export default function AdminLocationPage() {

  const [locations, setLocations] = useState<LocationType[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchLocations();
  }, [filter]);

  const fetchLocations = async () => {

    setLoading(true);

    const snap = await getDocs(collection(db, "locations"));

    const allData: LocationType[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LocationType, "id">),
    }));

    let filtered = allData;

    if (filter === "admin") {
      filtered = allData.filter(
        (item) => item.ownerId === ADMIN_UID
      );
    }

    if (filter === "merchant") {
      filtered = allData.filter(
        (item) => item.ownerId !== ADMIN_UID
      );
    }

    setLocations(filtered);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {

    const confirmDelete = window.confirm(
      "ต้องการลบสถานที่นี้ใช่หรือไม่?"
    );

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "locations", id));

    fetchLocations();
  };

  return (
    <div style={layoutStyle}>

      <AdminSidebar />

      <div style={contentStyle}>

        {/* HEADER */}
        <div style={headerStyle}>

          <div>
            <h1 style={{ marginBottom: 5 }}>
              การจัดการสถานที่
            </h1>

            <p style={{ color: "#666" }}>
              จัดการสถานที่ทั้งหมดในระบบ
            </p>
          </div>

          <button
            style={addBtn}
            onClick={() =>
              router.push("/admin/add-location/new")
            }
          >
            + เพิ่มสถานที่ใหม่
          </button>

        </div>

        {/* FILTER */}
        <div style={filterWrap}>

          <FilterButton
            label="ทั้งหมด"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />

          <FilterButton
            label="สถานที่สร้างโดยแอดมิน"
            active={filter === "admin"}
            onClick={() => setFilter("admin")}
          />

          <FilterButton
            label="สถานที่สร้างโดยผู้ประกอบการ"
            active={filter === "merchant"}
            onClick={() => setFilter("merchant")}
          />

        </div>

        {loading && <p>กำลังโหลดข้อมูล...</p>}

        {/* GRID */}
        <div style={cardWrapper}>

          {locations.length === 0 && !loading && (
            <div style={emptyBox}>ไม่มีข้อมูล</div>
          )}

          {locations.map((loc) => (

            <div key={loc.id} style={card}>

              <div style={cardHeader}>

                <h3 style={{ margin: 0 }}>
                  {loc.locationName}
                </h3>

                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: "bold",
                    background:
                      loc.ownerId === ADMIN_UID
                        ? "#e7f3ff"
                        : "#f59e0b",
                    color:
                      loc.ownerId === ADMIN_UID
                        ? "#1d4ed8"
                        : "#fff",
                  }}
                >
                  {loc.ownerId === ADMIN_UID
                    ? "Admin"
                    : "Merchant"}
                </span>

              </div>

              <p style={addressText}>
                {loc.address || "ไม่มีที่อยู่"}
              </p>

              <div style={actionWrap}>

                <button
                  style={viewBtn}
                  onClick={() =>
                    router.push(`/admin/add-location/${loc.id}`)
                  }
                >
                  ดูข้อมูล
                </button>

                <button
                  style={deleteBtn}
                  onClick={() => handleDelete(loc.id)}
                >
                  ลบสถานที่
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

/* FILTER BUTTON */

interface FilterProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ label, active, onClick }: FilterProps) {

  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        background: active ? "#614124" : "#eee",
        color: active ? "#fff" : "#333",
        fontWeight: active ? "bold" : "normal",
      }}
    >
      {label}
    </button>
  );

}

/* STYLES */

const layoutStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "#f5f5f5",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: 30,
  paddingTop: 90, // กัน hamburger ทับ
  maxWidth: 1200,
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 15,
  marginBottom: 25,
};

const filterWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 25,
};

const addBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  background: "#614124",
  color: "white",
  fontWeight: "bold",
};

const cardWrapper: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 20,
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: 22,
  borderRadius: 14,
  boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const addressText: React.CSSProperties = {
  marginTop: 5,
  color: "#666",
  fontSize: 14,
};

const actionWrap: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const viewBtn: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "#614124",
  color: "white",
};

const deleteBtn: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "#dc2626",
  color: "white",
};

const emptyBox: React.CSSProperties = {
  padding: 40,
  backgroundColor: "#f3f4f6",
  borderRadius: 12,
  textAlign: "center",
  color: "#6b7280",
};