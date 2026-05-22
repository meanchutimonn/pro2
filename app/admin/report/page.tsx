"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import AdminSidebar from "../components/AdminSidebar";

export default function ReportPage() {
  const router = useRouter();

  const [locations, setLocations] = useState<any[]>([]);
  const [reportedReviews, setReportedReviews] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reportedCount, setReportedCount] = useState(0);

  const [topReviewed, setTopReviewed] = useState<any[]>([]);
  const [leastReviewed, setLeastReviewed] = useState<any[]>([]); // ✅ เปลี่ยนจาก topRated เป็น leastReviewed

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const reviewSnap = await getDocs(collection(db, "reviews"));
    const locationSnap = await getDocs(collection(db, "locations"));

    setTotalReviews(reviewSnap.size);

    const reported = reviewSnap.docs.filter(
      (r) => r.data().reported === true
    );

    setReportedCount(reported.length);

    setReportedReviews(
      reported.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
    );

    // 🔥 MAP REVIEW
    const map:any = {};

    reviewSnap.docs.forEach((doc) => {
      const data = doc.data();
      const locId =
        data.location_id || data.locationId;

      if (!locId) return;

      if (!map[locId]) {
        map[locId] = { total: 0, count: 0 };
      }

      map[locId].total += Number(data.rating) || 0;
      map[locId].count++;
    });

    const result = locationSnap.docs.map((doc) => {
      const id = doc.id;
      const data = doc.data();

      const reviewData = map[id] || { total: 0, count: 0 };

      const avg =
        reviewData.count > 0
          ? reviewData.total / reviewData.count
          : 0;

      return {
        id,
        name: data.locationName,
        count: reviewData.count,
        avg
      };
    });

    // 1. ร้านที่มียอดรีวิวเยอะที่สุด (เรียงจากมากไปน้อย)
    setTopReviewed(
      [...result]
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    );

    // 2. ร้านที่มียอดรีวิวน้อยที่สุด (เปลี่ยนจากเรียงตามคะแนนดาว เป็นเรียงจากน้อยไปมาก)
    setLeastReviewed(
      [...result]
        .filter((r) => r.count > 0)
        .sort((a, b) => a.count - b.count) // ✅ เรียงจากจำนวนรีวิวน้อยที่สุดขึ้นก่อน
        .slice(0, 3)
    );

    setLocations(
      result.map((r) => ({
        id: r.id,
        locationName: r.name,
        reviewCount: r.count,
        avgRating: r.avg.toFixed(1)
      }))
    );
  };

  function analyze(r: any) {
    if (r.count >= 20 && r.avg >= 4) return "🔥 ร้านดัง ปังมาก";
    if (r.count >= 20 && r.avg < 3) return "⚠️ มีความเสี่ยง";
    if (r.avg >= 4.5) return "⭐ ร้านดี มีคุณภาพ";
    return "-";
  }

  // ❌ DELETE REVIEW
  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("ลบรีวิวนี้ใช่ไหม?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "reviews", id));

    alert("ลบสำเร็จ");
    fetchData(); // refresh
  };

  return (
    <div className="layout">
      <AdminSidebar />

      <div className="content">
        <h1></h1>
        
        {/* ✅ เพิ่มข้อความ Review Analytics ด้านบนตารางสถิติ */}
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "10px 0 20px 0", color: "#333" }}>
          สถิติการรีวิว
        </h2>

        {/* 📊 STATS */}
        <div className="stats">
          <div className="card">
            <p>รีวิวทั้งหมด</p>
            <h2 style={{ fontSize: "25px", fontWeight: 800 }}>{totalReviews}</h2>
          </div>

          <div className="card">
            <p>รีวิวที่ถูกรายงาน</p>
            <h2 style={{ fontSize: "25px", fontWeight: 800 }}>{reportedCount}</h2>
          </div>
        </div>

        {/* 🏆 TOP / LEAST GRID */}
        <div className="topGrid">
          {/* ฝั่งซ้าย: รีวิวเยอะที่สุด */}
          <div className="card">
            <h3>🏆 ร้านที่มียอดรีวิวเยอะที่สุด</h3>
            {topReviewed.map((r, i) => (
              <div key={i} className="rankItem">
                <b>{i + 1}. {r.name}</b>
                <span>{r.count} รีวิว</span>
                <span style={{ fontWeight: 600 }}>
                  {analyze(r)}
                </span>
              </div>
            ))}
          </div>

          {/* ✅ ฝั่งขวา: แก้ไขเป็น ร้านที่มียอดรีวิวน้อยที่สุด */}
          <div className="card">
            <h3>📉 ร้านที่มียอดรีวิวน้อยที่สุด</h3>
            {leastReviewed.map((r, i) => (
              <div key={i} className="rankItem">
                <b>{i + 1}. {r.name}</b>
                <span>{r.count} รีวิว</span>
                <span style={{ fontWeight: 600 }}>
                  {analyze(r)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 📋 LOCATIONS */}
        <div className="card">
          <h2>สถานที่</h2>

          <table className="table">
            <thead>
              <tr>
                <th>ชื่อสถานที่</th>
                <th>รีวิว</th>
                <th>คะแนนเฉลี่ย</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>

            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td>{loc.locationName}</td>
                  <td>{loc.reviewCount}</td>
                  <td>⭐ {loc.avgRating}</td>
                  <td>
                    <button
                      onClick={() =>
                        router.push(`/admin/report/${loc.id}`)
                      }
                    >
                      ดูรีวิว
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🚩 REPORTED */}
        <div className="card">
          <h2>🚩 รีวิวที่ถูกรายงาน</h2>

          {reportedReviews.length === 0 ? (
            <p>ไม่มีรีวิวที่ถูกรายงาน</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ผู้ใช้งาน</th>
                  <th>รีวิว</th>
                  <th>สาเหตุ</th>
                  <th>คะแนน</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>

              <tbody>
                {reportedReviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.user_name}</td>
                    <td>{r.review_text}</td>
                    <td>{r.reportReason || "-"}</td>
                    <td>⭐ {r.rating}</td>
                    <td>
                      <button
                        className="deleteBtn"
                        onClick={() => handleDelete(r.id)}
                      >
                        ลบรีวิว
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CSS */}
      <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .content {
          flex: 1;
          padding: 40px;
        }

        h1 {
          margin-bottom: 5px;
        }

        /* 📊 STATS */
        .stats {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }

        /* 🏆 TOP */
        .topGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 30px;
        }

        /* 📦 CARD */
        .card {
          background: #fff;
          padding: 25px;
          border-radius: 14px;
          margin-bottom: 20px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        /* 🏆 rank */
        .rankItem {
          display: grid;
          grid-template-columns: 1fr 120px 140px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }

        /* 📋 TABLE */
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .table th {
          background: #6B4226;
          color: white;
          padding: 12px;
          text-align: left;
        }

        .table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        /* 🔘 BUTTON */
        button {
          background: #6B4226;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .deleteBtn {
          background: #e53935;
        }

        /* 📱 MOBILE */
        @media (max-width: 768px) {
          .topGrid {
            grid-template-columns: 1fr;
          }

          .stats {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}