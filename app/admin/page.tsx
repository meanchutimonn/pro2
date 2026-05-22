"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function AdminPage() {
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [todayCheckins, setTodayCheckins] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [reportedReviews, setReportedReviews] = useState(0);

  const [topPlaces, setTopPlaces] = useState<any[]>([]); 
  const [weeklyCheckins, setWeeklyCheckins] = useState<any[]>([]);
  const [dailyCheckins, setDailyCheckins] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);

  const [allCheckins, setAllCheckins] = useState<any[]>([]);

  // ✅ State สำหรับ Modal ต่างๆ
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // สำหรับกราฟ
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);    // สำหรับ 10 อันดับ
  const [modalTitle, setModalTitle] = useState("");
  const [selectedDetails, setSelectedDetails] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    const checkinSnap = await getDocs(collection(db, "checkins"));
    const locationSnap = await getDocs(collection(db, "locations"));
    const userSnap = await getDocs(collection(db, "users"));
    const reviewSnap = await getDocs(collection(db, "reviews"));

    const checkinData = checkinSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAllCheckins(checkinData);
    setTotalCheckins(checkinSnap.size);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayCount = 0;
    checkinSnap.docs.forEach((doc) => {
      const time = doc.data().createdAt?.toDate?.();
      if (time && time > today) todayCount++;
    });
    setTodayCheckins(todayCount);
    setTotalLocations(locationSnap.size);
    setTotalUsers(userSnap.docs.filter((u) => u.data().status !== "banned").length);

    const reportQuery = query(collection(db, "reviews"), where("reported", "==", true));
    const reportSnap = await getDocs(reportQuery);
    setReportedReviews(reportSnap.size);

    /* ✅ TOP PLACE LOGIC */
    const placeCounts: any = {};
    checkinSnap.docs.forEach((doc) => {
      const locationId = doc.data().merchantId;
      if (!placeCounts[locationId]) placeCounts[locationId] = 0;
      placeCounts[locationId]++;
    });

    const places = locationSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().locationName,
      count: placeCounts[doc.id] || 0
    })).filter(place => place.count > 0);

    places.sort((a, b) => b.count - a.count);
    setTopPlaces(places.slice(0, 10));

    /* ✅ WEEKLY LOGIC */
    const weeks: any = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (start.getDay() + 7 * i));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startStr = start.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      const endStr = end.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

      weeks.push({ 
        label: `Week ${4 - i}`, 
        fullLabel: `Week ${4 - i} (${startStr} - ${endStr})`, 
        start, 
        end, 
        count: 0 
      });
    }

    checkinSnap.docs.forEach((doc) => {
      const time = doc.data().createdAt?.toDate?.();
      if (!time) return;
      weeks.forEach((w: any) => {
        if (time >= w.start && time <= w.end) w.count++;
      });
    });

    setWeeklyCheckins(weeks);
    const currentW = weeks[weeks.length - 1];
    setSelectedWeek(currentW);
    
    // แสดงรายวันแบบเต็มเดือนปัจจุบันตอนโหลดหน้าแรกเริ่มต้น
    generateMonthlyDaily(checkinSnap);
  };

  const generateMonthlyDaily = (checkinSnap: any) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: any = [];
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, count: 0 });
    }

    checkinSnap.docs.forEach((doc: any) => {
      const time = doc.data().createdAt?.toDate?.();
      if (!time) return;
      days.forEach((d: any) => {
        if (time.toDateString() === d.date.toDateString()) d.count++;
      });
    });
    setDailyCheckins(days);
  };

  const generateDaily = (week: any, checkinSnap: any) => {
    const days: any = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(week.start);
      d.setDate(d.getDate() + i);
      days.push({ date: new Date(d), count: 0 });
    }
    checkinSnap.docs.forEach((doc: any) => {
      const time = doc.data().createdAt?.toDate?.();
      if (!time) return;
      days.forEach((d: any) => {
        if (time.toDateString() === d.date.toDateString()) d.count++;
      });
    });
    setDailyCheckins(days);
  };

  const showGraphDetails = (title: string, startDate: Date, endDate: Date) => {
    const details = allCheckins.filter(item => {
      const time = item.createdAt?.toDate?.();
      return time && time >= startDate && time <= endDate;
    });
    setModalTitle(title);
    setSelectedDetails(details);
    setIsDetailModalOpen(true);
  };

  return (
    <div style={layoutStyle}>
      <AdminSidebar />
      <div style={contentStyle}>
        <h1 style={{ ...titleStyle, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined">dashboard</span> ภาพรวม
        </h1>

        <div style={cardGrid}>
          <StatCard title="การเช็กอินทั้งหมด" value={totalCheckins} icon="place" color="#16a34a" />
          <StatCard title="การเช็กอินวันนี้" value={todayCheckins} icon="today" color="#2563eb" />
          <StatCard title="สถานที่ภายในระบบ" value={totalLocations} icon="location_on" color="#7c3aed" />
          <StatCard title="สมาชิกที่ใช้งานอยู่" value={totalUsers} icon="group" color="#0891b2" />
          <StatCard title="รีวิวที่ถูกรายงาน" value={reportedReviews} icon="warning" color="#dc2626" />
        </div>

        <h2 style={{ ...sectionTitle, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined">bar_chart</span> สถิติการเช็กอิน 
        </h2>

        <div style={graphGrid}>
          <div style={chartContainer}>
            <h3>รายอาทิตย์</h3>
            <div style={barWrap}>
              {weeklyCheckins.map((w) => (
                <GraphItem
                  key={w.label}
                  label={w.label}
                  value={w.count}
                  active={selectedWeek?.label === w.label}
                  onClick={() => {
                    setSelectedWeek(w);
                    getDocs(collection(db, "checkins")).then(snap => generateDaily(w, snap));
                    showGraphDetails(w.fullLabel, w.start, w.end); 
                  }}
                />
              ))}
            </div>
          </div>

          <div style={chartContainer}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>รายวัน</h3>
              <span style={{ fontSize: 12, color: "#666" }}></span>
            </div>
            
            {/* กล่องครอบสไตล์อัปเดตใหม่ เพิ่ม padding ด้านบนกันตัวเลขขาด */}
            <div style={{ overflowX: "auto", width: "100%", paddingBottom: 15, paddingTop: 10 }}>
              {/* เปลี่ยนเป็น justifyContent: "center" เพื่อขยับกลุ่มแท่งกราฟขยับมาทางขวา/ตรงกลาง และเพิ่ม gap */}
              <div style={{ ...barWrap, justifyContent: "center", gap: 24, width: "max-content", minWidth: "100%" }}>
                {dailyCheckins.map((d: any) => {
                  const dayEnd = new Date(d.date);
                  dayEnd.setHours(23, 59, 59, 999);
                  
                  const dateNum = d.date.getDate();
                  const dayName = d.date.toLocaleDateString("en", { weekday: "short" });
                  const finalLabel = `${dateNum} ${dayName}`;

                  return (
                    <div key={d.date.toString()} style={{ width: 50, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                      <GraphItem
                        label={finalLabel}
                        value={d.count}
                        onClick={() => showGraphDetails(d.date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }), d.date, dayEnd)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <h2 style={{ ...sectionTitle, marginTop: 40, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined">trophy</span> สถานที่ติดอันดับ 
        </h2>

        <div style={{ ...yellowCard, cursor: "pointer" }} onClick={() => setIsRankModalOpen(true)}>
          {topPlaces.slice(0, 5).map((place, index) => (
            <ProgressItem key={place.id} label={`${index + 1}. ${place.name}`} value={place.count} />
          ))}
          <div style={{ textAlign: "center", marginTop: 15, fontSize: 13, opacity: 0.7 }}>คลิกเพื่อดูเพิ่มเติม</div>
        </div>
      </div>

      {/* Modal 1: แสดงรายละเอียดรายชื่อสถานที่ */}
      {isDetailModalOpen && (
        <div style={modalOverlay} onClick={() => setIsDetailModalOpen(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>เช็กอิน: {modalTitle}</h2>
              <button style={closeButton} onClick={() => setIsDetailModalOpen(false)}>×</button>
            </div>
            <div style={modalBody}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRow}>
                    <th style={tableTh}>เวลา</th>
                    <th style={tableTh}>ชื่อร้าน</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDetails.map((item, idx) => (
                    <tr key={idx} style={tableRow}>
                      <td style={tableTd}>{item.createdAt?.toDate?.().toLocaleString("th-TH")}</td>
                      <td style={tableTd}>{item.shopName || item.merchantId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: แสดง 10 อันดับสถานที่ยอดนิยม */}
      {isRankModalOpen && (
        <div style={modalOverlay} onClick={() => setIsRankModalOpen(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <span className="material-symbols-outlined">workspace_premium</span> 10 อันดับยอดนิยม
              </h2>
              <button style={closeButton} onClick={() => setIsRankModalOpen(false)}>×</button>
            </div>
            <div style={modalBody}>
              {topPlaces.map((place, index) => (
                <div key={place.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: "bold" }}>{index + 1}. {place.name}</span>
                    <span style={{ color: "#1E7A4D" }}>{place.count} ครั้ง</span>
                  </div>
                  <div style={progressBarBackground}>
                    <div style={{ ...progressBarFill, width: `${Math.min(place.count * 10, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* COMPONENTS & STYLES */
function StatCard({ title, value, icon, color }: any) {
  return (
    <div style={statCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>{icon}</span>
        <p style={{ margin: 0, fontWeight: "bold" }}>{title}</p>
      </div>
      <h3 style={{ marginTop: 10 }}>{value}</h3>
    </div>
  );
}

function GraphItem({ label, value, onClick, active }: any) {
  const height = Math.min(value * 20, 140);
  return (
    <div style={{ ...barItem, opacity: active === false ? 0.4 : 1, width: "100%", flexShrink: 0 }} onClick={onClick}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* เพิ่ม padding หรือ margin ด้านล่างตัวเลข เพื่อไม่ให้ชิดกับขอบบน */}
        <span style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "#333" }}>{value}</span>
        <div style={{ ...barFill, height }} />
      </div>
      <span style={barLabel}>{label}</span>
    </div>
  );
}

function ProgressItem({ label, value }: any) {
  return (
    <div style={{ marginTop: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={progressBarBackground}><div style={{ ...progressBarFill, width: `${Math.min(value * 10, 100)}%` }} /></div>
    </div>
  );
}

const layoutStyle: any = { display: "flex", minHeight: "100vh", background: "#f5f5f5" };
const contentStyle: any = { flex: 1, padding: "80px 20px 40px 20px", maxWidth: 1200 };
const titleStyle: any = { marginBottom: 30 };
const cardGrid: any = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 20, marginBottom: 40 };
const statCard: any = { background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 3px 10px rgba(0,0,0,0.05)" };
const sectionTitle: any = { marginBottom: 20 };
const graphGrid: any = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 30 };
const chartContainer: any = { background: "#fff", padding: 25, borderRadius: 20 };
// ✅ เพิ่มความสูงของพื้นที่แสดงผลกราฟ (height จาก 180 เป็น 210) เพื่อเปิดพื้นที่ให้ตัวเลขด้านบนโผล่พ้นขอบขยาย
const barWrap: any = { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, height: 210, width: "100%" };
const barItem: any = { display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flex: 1 };
const barFill: any = { width: 18, background: "#1E7A4D", borderRadius: 20 };
const barLabel: any = { marginTop: 10, fontSize: 12, whiteSpace: "nowrap" };
const yellowCard: any = { background: "#F8D45A", padding: 25, borderRadius: 15, color: "#614124", fontWeight: "bold" };
const progressBarBackground: any = { marginTop: 8, height: 8, background: "#fff", borderRadius: 5 };
const progressBarFill: any = { height: 8, background: "#614124", borderRadius: 5 };
const modalOverlay: any = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent: any = { background: "#fff", padding: 30, borderRadius: 20, width: "90%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto" };
const modalHeader: any = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 15 };
const closeButton: any = { background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#999" };
const tableStyle: any = { width: "100%", borderCollapse: "collapse" };
const tableHeaderRow: any = { background: "#f8f9fa", textAlign: "left" };
const tableTh: any = { padding: "12px 8px", borderBottom: "2px solid #eee" };
const tableTd: any = { padding: "10px 8px", borderBottom: "1px solid #eee" };
const tableRow: any = { transition: "background 0.2s" };
const modalBody: any = { fontSize: 14 };