"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "../components/AdminSidebar";
import { useRouter } from "next/navigation";

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortType, setSortType] = useState("latest");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [usersPerPage, setUsersPerPage] = useState(8);
  const router = useRouter();

  const [currentAdminUID, setCurrentAdminUID] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [banUser, setBanUser] = useState<any>(null);

  // ✅ State สำหรับควบคุม Pop-up บัญชีผู้ดูแลระบบ
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  // ✅ State สำหรับจัดการการแก้ไขชื่อใน Pop-up
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentAdminUID(user.uid);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, sortType]);

  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    const data = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as any),
    }));
    setUsers(data);
    setLoading(false);
  };

  const totalUsers = users.filter(u => u.role === "user").length;
  const totalMerchants = users.filter(u => u.role === "merchant").length;
  const totalAdmins = users.filter(u => u.role === "admin").length;
  const totalBanned = users.filter(u => u.status === "banned").length;

  let adminUsers = users.filter(u => u.role === "admin");

  adminUsers.sort((a, b) => {
    if (a.uid === currentAdminUID) return -1;
    if (b.uid === currentAdminUID) return 1;
    return 0;
  });

  let processedUsers = users.filter((u) => u.role !== "admin");

  processedUsers = processedUsers.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (roleFilter !== "all") {
    processedUsers = processedUsers.filter(
      (u) => u.role === roleFilter
    );
  }

  if (sortType === "az") {
    processedUsers.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }

  if (sortType === "latest") {
    processedUsers.sort(
      (a, b) =>
        (b.createdAt?.seconds || 0) -
        (a.createdAt?.seconds || 0)
    );
  }

  if (sortType === "oldest") {
    processedUsers.sort(
      (a, b) =>
        (a.createdAt?.seconds || 0) -
        (b.createdAt?.seconds || 0)
    );
  }

  const currentUsers = processedUsers.slice(0, usersPerPage);

  const confirmDelete = async (user: any) => {
    if (user.uid === currentAdminUID) {
      alert("คุณไม่สามารถลบบัญชีตนเองได้");
      return;
    }

    const ok = confirm(
      `ถ้าลบบัญชีของ : ${user.email} ?\nจะไม่สามารถกู้คืนได้`
    );

    if (!ok) return;

    await deleteDoc(doc(db, "users", user.uid));

    if (selectedAdmin?.uid === user.uid) {
      setSelectedAdmin(null);
    }

    fetchUsers();
  };

  const handleBan = async (user: any) => {
    if (user.status === "banned") {
      await updateDoc(doc(db, "users", user.uid), {
        status: "active",
        banUntil: null
      });
      fetchUsers();
      return;
    }

    const ok = confirm(`คุณมั่นใจว่าจะแบน ${user.email} เป็นเวลา 7 วันใช่ไหม?`);
    if (!ok) return;

    const banUntil = new Date();
    banUntil.setDate(banUntil.getDate() + 7);

    await updateDoc(doc(db, "users", user.uid), {
      status: "banned",
      banUntil: banUntil
    });

    fetchUsers();
  };

  // ✅ ฟังก์ชันอัปเดตชื่อใหม่ลงไปที่ Firestore บัญชี Admin
  const handleUpdateName = async () => {
    if (!editName.trim()) {
      alert("กรุณากรอกชื่อด้วยครับ");
      return;
    }

    try {
      const userRef = doc(db, "users", selectedAdmin.uid);
      await updateDoc(userRef, {
        name: editName
      });

      setSelectedAdmin({ ...selectedAdmin, name: editName });
      setIsEditing(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating name:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขชื่อ");
    }
  };

  const handleOpenAdminModal = (admin: any) => {
    setSelectedAdmin(admin);
    setEditName(admin.name || "");
    setIsEditing(false);
  };

  const resetFilter = () => {
    setSearch("");
    setRoleFilter("all");
    setSortType("latest");
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", background: "#f5f5f5" }}>
      <AdminSidebar />

      <div style={{ flex: 1, padding: 30, paddingTop: 80, minWidth: 0 }}>
        <div>
          {/* STATS */}
          <div style={statsContainer}>
            <StatCard title="ผู้ใช้งาน" value={totalUsers} />
            <StatCard title="ผู้ประกอบการ" value={totalMerchants} />
            <StatCard title="ผู้ดูแลระบบ" value={totalAdmins} />
            <StatCard title="บัญชีถูกระงับ" value={totalBanned} />
          </div>

          {/* ADMIN TABLE */}
          <div style={sectionBar}>บัญชีของผู้ดูแลระบบ</div>

          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>อีเมล</th>
                  <th style={th}>การดำเนินการ</th>
                </tr>
              </thead>

              <tbody>
                {adminUsers.map((u) => (
                  <tr
                    key={u.uid}
                    style={row}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f6efe8"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                  >
                    <td style={td}>
                      {u.email}
                      {u.uid === currentAdminUID && " (You)"}
                    </td>

                    <td style={td}>
                      <div style={actionWrap}>
                        <button style={viewBtn} onClick={() => handleOpenAdminModal(u)}>
                          ดูข้อมูล
                        </button>

                        {u.uid !== currentAdminUID && (
                          <button style={deleteBtn} onClick={() => confirmDelete(u)}>
                            ลบบัญชี
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* USERS */}
          <div style={sectionBar}>บัญชี ผู้ใช้งาน และ ผู้ประกอบการ</div>

          <div style={searchSection}>
            <input
              placeholder="ค้นหา อีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={searchBox}
            />

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={dropdown}>
              <option value="all">บทบาททั้งหมด</option>
              <option value="user">ผู้ใช้งาน</option>
              <option value="merchant">ผู้ประกอบการ</option>
            </select>

            <select value={sortType} onChange={(e) => setSortType(e.target.value)} style={dropdown}>
              <option value="az">ก-ฮ</option>
              <option value="latest">เข้าสู่ระบบล่าสุด</option>
              <option value="oldest">เข้าสู่ระบบเมื่อนานมาแล้ว</option>
            </select>

            <button style={resetBtn} onClick={resetFilter}>
              คืนค่า
            </button>
          </div>

          {loading && <p style={{ marginTop: 20 }}>กำลังโหลด...</p>}

          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ชื่อ</th>
                  <th style={th}>อีเมล</th>
                  <th style={th}>วันที่สมัคร</th>
                  <th style={th}>บทบาท</th>
                  <th style={th}>สถานะ</th>
                  <th style={th}>การดำเนินการ</th>
                </tr>
              </thead>

              <tbody>
                {currentUsers.map((u) => (
                  <tr
                    key={u.uid}
                    style={row}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f6efe8"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                  >
                    <td style={td}>{u.name}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>
                      {u.createdAt
                        ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </td>

                    <td style={td}>
                      <RoleBadge role={u.role} />
                    </td>

                    <td style={td}>
                      {u.status === "banned" ? "🔴 ระงับบัญชี" : "🟢 บัญชีใช้งานได้"}
                    </td>

                    <td style={td}>
                      <div style={actionWrap}>
                        <button
                          style={viewBtn}
                          onClick={() => setSelectedUser(u)}
                        >
                          ดูข้อมูล
                        </button>
                        <button
                          style={banBtn}
                          onClick={() => handleBan(u)}
                        >
                          {u.status === "banned" ? "Unban" : "Ban"}
                        </button>
                        <button style={deleteBtn} onClick={() => confirmDelete(u)}>
                          ลบบัญชี
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usersPerPage < processedUsers.length && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <button
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "white",
                    cursor: "pointer"
                  }}
                  onClick={() => setUsersPerPage(prev => prev + 8)}
                >
                  ดูเพิ่มเติม
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ✅ หน้าต่าง Pop-up (Modal) ข้อมูลผู้ดูแลระบบพร้อมระบบแก้ไขชื่อ */}
      {/* ========================================================================= */}
      {selectedAdmin && (
        <div style={modalOverlay} onClick={() => setSelectedAdmin(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>

            <button style={modalCloseBtn} onClick={() => setSelectedAdmin(null)}>×</button>

            <div style={modalBody}>
              <h3 style={{ margin: "0 0 20px 0", textAlign: "center", color: "#614124" }}>
                ข้อมูลผู้ดูแลระบบ {selectedAdmin.uid === currentAdminUID && "(บัญชีของคุณ)"}
              </h3>

              {/* รูปโปรไฟล์แอดมินตามตัวอักษรแรกของอีเมล */}
              <div style={avatarWrapper}>
                {selectedAdmin.profileImage ? (
                  <img src={selectedAdmin.profileImage} alt="Admin Profile" style={avatarImg} />
                ) : (
                  <div style={avatarFallback}>
                    {selectedAdmin.email ? selectedAdmin.email[0].toUpperCase() : "A"}
                  </div>
                )}
              </div>

              {/* รายละเอียด ข้อมูลแอดมินและการจัดการฟิลด์ชื่อ */}
              <div style={infoGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={infoLabel}>ชื่อผู้ดูแลระบบ</label>
                  {/* ✅ แก้ไข: เปลี่ยนจากไอคอนดินสอเป็นปุ่มข้อความ "แก้ไขชื่อ" ที่ดูเป็นทางการและมีสไตล์ขึ้น */}
                  {!isEditing && (
                    <button
                      style={editNameTextBtn}
                      onClick={() => {
                        setEditName(selectedAdmin.name || "");
                        setIsEditing(true);
                      }}
                    >
                      แก้ไขชื่อ
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={modalInput}
                    />
                    <button style={saveSmallBtn} onClick={handleUpdateName}>บันทึก</button>
                    <button style={cancelSmallBtn} onClick={() => setIsEditing(false)}>ยกเลิก</button>
                  </div>
                ) : (
                  <div style={{ ...infoValue, fontWeight: "bold" }}>{selectedAdmin.name || "ไม่มีข้อมูลชื่อ"}</div>
                )}
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>อีเมลติดต่อ</label>
                <div style={infoValue}>{selectedAdmin.email || "-"}</div>
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>UID ระบบ</label>
                <div style={{ ...infoValue, fontSize: 11, color: "#888" }}>{selectedAdmin.uid}</div>
              </div>

              {/* ปุ่มลบบัญชี */}
              <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
                {selectedAdmin.uid !== currentAdminUID ? (
                  <button
                    style={{ ...deleteBtn, padding: "10px 24px", width: "100%", fontSize: 14 }}
                    onClick={() => confirmDelete(selectedAdmin)}
                  >
                    ลบบัญชีผู้ดูแลระบบรายนี้
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
                    * คุณไม่สามารถลบบัญชีปัจจุบันที่กำลังล็อกอินอยู่ได้
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div style={modalOverlay} onClick={() => setSelectedUser(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseBtn} onClick={() => setSelectedUser(null)}>
              ×
            </button>

            <div style={modalBody}>
              <h3 style={{ margin: "0 0 20px 0", textAlign: "center", color: "#614124" }}>
                ข้อมูลบัญชี
              </h3>

              <div style={avatarWrapper}>
                {selectedUser.profileImage ? (
                  <img
                    src={selectedUser.profileImage}
                    alt="Profile"
                    style={avatarImg}
                  />
                ) : (
                  <div style={avatarFallback}>
                    {selectedUser.email ? selectedUser.email[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>ชื่อ</label>
                <div style={infoValue}>{selectedUser.name || "-"}</div>
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>อีเมล</label>
                <div style={infoValue}>{selectedUser.email || "-"}</div>
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>บทบาท</label>
                <div style={infoValue}>
                  {selectedUser.role === "merchant" ? "ผู้ประกอบการ" : "ผู้ใช้งาน"}
                </div>
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>สถานะ</label>
                <div style={infoValue}>
                  {selectedUser.status === "banned" ? "🔴 ระงับบัญชี" : "🟢 บัญชีใช้งานได้"}
                </div>
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>วันที่สมัคร</label>
                <div style={infoValue}>
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt.seconds * 1000).toLocaleDateString("th-TH")
                    : "-"}
                </div>
              </div>

              <div style={infoGroup}>
                <label style={infoLabel}>UID ระบบ</label>
                <div style={{ ...infoValue, fontSize: 11, color: "#888" }}>
                  {selectedUser.uid}
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                <button
                  style={{ ...banBtn, flex: 1 }}
                  onClick={() => {
                    handleBan(selectedUser);
                    setSelectedUser(null);
                  }}
                >
                  {selectedUser.status === "banned" ? "Unban" : "Ban"}
                </button>

                <button
                  style={{ ...deleteBtn, flex: 1 }}
                  onClick={() => {
                    confirmDelete(selectedUser);
                    setSelectedUser(null);
                  }}
                >
                  ลบบัญชี
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* COMPONENTS */
function StatCard({ title, value }: { title: string, value: number }) {
  return (
    <div style={statCard}>
      <h4>{title}</h4>
      <p style={{ fontSize: 24, fontWeight: "bold" }}>{value}</p>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const color = role === "merchant" ? "#f59e0b" : "#3b82f6";
  return (
    <span style={{
      background: color,
      color: "white",
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 12
    }}>
      {role}
    </span>
  );
}

/* STYLES */
const mainContainer = {
  background: "#fff",
  borderRadius: 16,
  padding: 25,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
} as const

const statsContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: 20,
  marginBottom: 30
} as const

const statCard = {
  background: "white",
  padding: 25,
  borderRadius: 14,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
} as const

const sectionBar = {
  background: "#614124",
  color: "white",
  padding: "10px 15px",
  marginTop: 30,
  fontWeight: "bold",
  borderRadius: 6
} as const

const searchSection = {
  marginTop: 25,
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
} as const

const searchBox = {
  padding: 10,
  width: 260,
  borderRadius: 6,
  border: "1px solid #ccc"
} as const

const dropdown = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer"
} as const

const resetBtn = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "#ddd",
  cursor: "pointer"
} as const

const table = {
  width: "100%",
  marginTop: 15,
  borderCollapse: "collapse",
  background: "white",
  minWidth: 700
} as const

const row = {
  cursor: "pointer",
  transition: "background 0.2s ease"
} as const

const th = {
  padding: 12,
  borderBottom: "1px solid #ddd",
  textAlign: "left"
} as const

const td = {
  padding: 12,
  borderBottom: "1px solid #eee"
} as const

const actionWrap = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
} as const

const viewBtn = {
  padding: "6px 10px",
  border: "none",
  background: "#2563eb",
  color: "white",
  borderRadius: 6,
  cursor: "pointer"
} as const

const banBtn = {
  padding: "6px 10px",
  border: "none",
  background: "#dc2626",
  color: "white",
  borderRadius: 6,
  cursor: "pointer"
} as const

const deleteBtn = {
  padding: "6px 10px",
  border: "none",
  background: "#6b7280",
  color: "white",
  borderRadius: 6,
  cursor: "pointer"
} as const

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
} as const;

const modalContent = {
  backgroundColor: "white",
  padding: "30px",
  borderRadius: "16px",
  width: "90%",
  maxWidth: "420px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  position: "relative"
} as const;

const modalCloseBtn = {
  position: "absolute",
  top: "12px",
  right: "16px",
  background: "none",
  border: "none",
  fontSize: "28px",
  cursor: "pointer",
  color: "#999",
  lineHeight: "1"
} as const;

const modalBody = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch"
} as const;

const avatarWrapper = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "24px"
} as const;

const avatarImg = {
  width: "90px",
  height: "90px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid #614124"
} as const;

const avatarFallback = {
  width: "90px",
  height: "90px",
  borderRadius: "50%",
  backgroundColor: "#614124",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: "bold",
  boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
} as const;

const infoGroup = {
  marginBottom: "15px",
  borderBottom: "1px solid #f0f0f0",
  paddingBottom: "8px"
} as const;

const infoLabel = {
  fontSize: "12px",
  color: "#888",
  fontWeight: "bold",
  margin: 0
} as const;

const infoValue = {
  fontSize: "15px",
  color: "#333",
  wordBreak: "break-all"
} as const;

// ✅ แก้ไขสไตล์ใหม่: ปุ่มข้อความ "แก้ไขชื่อ" ที่มีความเป็นทางการ มินิมอล และสวยงาม
const editNameTextBtn = {
  background: "none",
  border: "none",
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "4px",
  transition: "all 0.2s ease",
  textDecoration: "underline",
} as const;

const modalInput = {
  flex: 1,
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
  outline: "none"
} as const;

const saveSmallBtn = {
  padding: "6px 12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px"
} as const;

const cancelSmallBtn = {
  padding: "6px 12px",
  background: "#ddd",
  color: "#333",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px"
} as const;