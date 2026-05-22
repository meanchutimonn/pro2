"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [todayCount, setTodayCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [couponUsedCount, setCouponUsedCount] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [reason, setReason] = useState("");


  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const month = new Date().toISOString().slice(0, 7);

    // ดึงข้อมูล Check-ins
    const checkinRef = collection(db, "checkins");
    const q = query(checkinRef, where("locationId", "==", user.uid));
    const snapshot = await getDocs(q);

    const couponRef = collection(db, "coupon");
    const couponQ = query(couponRef, where("location_id", "==", user.uid));
    const couponSnap = await getDocs(couponQ);

    const couponIds = couponSnap.docs.map((d) => d.id);

    let usedTotal = 0;

    if (couponIds.length > 0) {
      const userCouponRef = collection(db, "user_coupons");

      for (const couponId of couponIds) {
        const usedQ = query(
          userCouponRef,
          where("coupon_id", "==", couponId),
          where("used", "==", true)
        );

        const usedSnap = await getDocs(usedQ);
        usedTotal += usedSnap.size;
      }
    }

    setCouponUsedCount(usedTotal);

    let todayTotal = 0;
    let monthTotal = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.date === today) todayTotal++;
      if (data.date?.startsWith(month)) monthTotal++;
    });

    setTodayCount(todayTotal);
    setMonthCount(monthTotal);

    // ดึงข้อมูล Reviews
    const reviewRef = collection(db, "reviews");
    const rq = query(reviewRef, where("location_id", "==", user.uid));
    const reviewSnap = await getDocs(rq);

    const reviewData = reviewSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setReviews(reviewData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openReport = (id: string) => {
    setSelectedReview(id);
  };

  const submitReport = async () => {
    if (!selectedReview || !reason) return;

    await updateDoc(doc(db, "reviews", selectedReview), {
      reported: true,
      reportReason: reason,
      reportedAt: new Date(),
    });

    alert("รายงานสำเร็จ");
    setSelectedReview(null);
    setReason("");
    fetchData();
  };

  const formatReviewDate = (review: any) => {
    const rawDate = review.date || review.createdAt || review.created_at;

    if (!rawDate) return "N/A";

    if (rawDate?.toDate) {
      return rawDate.toDate().toLocaleDateString("th-TH");
    }

    return new Date(rawDate).toLocaleDateString("th-TH");
  };

  return (
    <div style={containerStyle}>
      <TabBar pathname={pathname} router={router} />

      <div style={cardStyle}>
        <h1 style={titleStyle}>Dashboard ร้านของคุณ</h1>

        {loading && <p style={loadingText}>กำลังโหลดข้อมูล...</p>}

        {/* ===== STATS CARDS ===== */}
        <div style={cardWrapper}>
          <StatCard title="วันนี้เช็คอิน" value={todayCount} />
          <StatCard title="ยอดรวมเดือนนี้" value={couponUsedCount} />
        </div>

        {/* ===== REVIEWS TABLE (ส่วนที่ปรับปรุงใหม่ตามรูป) ===== */}
        <h3 style={sectionTitle}>รีวิวจากลูกค้า</h3>

        <div style={tableWrapper}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                <th style={thStyle}>ผู้ใช้</th>
                <th style={thStyle}>คะแนน</th>
                <th style={thStyle}>คอมเมนต์</th>
                <th style={thStyle}>วันที่</th>
                <th style={thStyle}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} style={emptyCell}>ยังไม่มีรีวิว</td>
                </tr>
              ) : (
                reviews.map((review, index) => (
                  <tr key={index} style={rowStyle}>
                    <td style={tdStyle}>{review.user_name || "Guest"}</td>
                    <td style={tdStyle}>
                      <span style={{ color: "#facc15" }}>★</span> {review.rating}
                    </td>
                    <td style={tdStyle}>{review.review_text}</td>
                    <td style={tdStyle}>
                      {formatReviewDate(review)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => openReport(review.id)}
                        style={reportBtnStyle}
                      >
                        Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FOR REPORTING */}
      {selectedReview && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ marginTop: 0 }}>รายงานรีวิวนี้</h3>
            <p style={{ fontSize: 14, color: "#666" }}>ระบุเหตุผลที่ต้องการรายงาน</p>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- เลือกเหตุผล --</option>
              <option value="คำหยาบ">คำหยาบ</option>
              <option value="สแปม">สแปม</option>
              <option value="ข้อมูลเท็จ">ข้อมูลเท็จ</option>
            </select>

            <div style={modalActions}>
              <button onClick={() => setSelectedReview(null)} style={cancelBtn}>
                ยกเลิก
              </button>
              <button onClick={submitReport} style={submitBtn}>
                ส่งรายงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function TabBar({ pathname, router }: any) {
  const tabs = [
    { name: "ข้อมูลร้านค้า", path: "/merchant" },
    { name: "Dashboard", path: "/merchant/dashboard" },
    { name: "คูปอง", path: "/merchant/coupon" },
    { name: "QR Code", path: "/merchant/qr" },
  ];

  return (
    <div style={tabContainer}>
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => router.push(tab.path)}
          style={{
            ...tabBtn,
            borderBottom: pathname === tab.path ? "3px solid #065f46" : "none",
            fontWeight: pathname === tab.path ? "bold" : "normal",
          }}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div style={statCard}>
      <p style={statTitle}>{title}</p>
      <h2 style={statNumber}>{value}</h2>
      <span style={statUnit}>คน</span>
    </div>
  );
}

/* ================= STYLES ================= */

const containerStyle = {
  maxWidth: 1000,
  margin: "40px auto",
  padding: 30,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
  fontFamily: "'Inter', sans-serif",
};

const cardStyle = { marginTop: 20 };
const titleStyle = { fontSize: 26, marginBottom: 25, color: "#1f2937" };
const loadingText = { color: "#6b7280" };
const sectionTitle = { marginTop: 40, marginBottom: 15, fontSize: 18 };

/* TAB STYLE */
const tabContainer = {
  display: "flex",
  gap: 30,
  marginBottom: 30,
  borderBottom: "1px solid #e5e7eb",
};
const tabBtn = {
  background: "none",
  border: "none",
  fontSize: 16,
  cursor: "pointer",
  paddingBottom: 10,
  color: "#374151",
};

/* STATS */
const cardWrapper = { display: "flex", gap: 20, marginBottom: 30 };
const statCard = {
  flex: 1,
  backgroundColor: "#f0fdf4",
  padding: 25,
  borderRadius: 16,
  textAlign: "center" as const,
};
const statTitle = { color: "#6b7280", marginBottom: 8, fontSize: 14 };
const statNumber = { fontSize: 36, color: "#065f46", margin: 0 };
const statUnit = { color: "#6b7280", fontSize: 12 };

/* TABLE STYLE (เลียนแบบรูปภาพ) */
const tableWrapper = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  overflow: "hidden",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  textAlign: "left" as const,
};
const headerRow = {
  backgroundColor: "#5D4037", // สีน้ำตาลเข้มตามภาพ
  color: "white",
};
const thStyle = { padding: "16px", fontWeight: "600", fontSize: 14 };
const tdStyle = { padding: "16px", borderBottom: "1px solid #f3f4f6", fontSize: 14, color: "#4b5563" };
const rowStyle = { transition: "background 0.2s" };
const emptyCell = { padding: 40, textAlign: "center" as const, color: "#9ca3af" };

const reportBtnStyle = {
  background: "#e53935", // สีแดงตามปุ่ม Delete ในรูป
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "500",
};

/* MODAL */
const modalOverlay = {
  position: "fixed" as const,
  top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};
const modalContent = {
  background: "white", padding: 25, borderRadius: 16, width: 350,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
};
const selectStyle = {
  width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db",
  marginTop: 10, fontSize: 14,
};
const modalActions = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 };
const submitBtn = { background: "#e53935", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" };
const cancelBtn = { background: "#f3f4f6", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" };