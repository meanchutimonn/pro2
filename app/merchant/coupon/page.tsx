"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { Icon } from "@iconify/react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { deleteDoc, doc } from "firebase/firestore";

export default function MerchantCouponPage() {

  const [uid, setUid] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    coupon_name: "",
    description: "",
    discount_type: "",
    discount_value: "",
    points_required: "",
    expiry_date: ""
  });

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        router.push("/login");
        return;
      }

      setUid(user.uid);

      const q = query(
        collection(db, "coupon"),
        where("location_id", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCoupons(data);
    });

    return () => unsubscribe();

  }, [router]);

const [focus, setFocus] = useState("");
  const createCoupon = async () => {

    if (!uid) return;

    const confirmSave = confirm(
      "เมื่อสร้างคูปองแล้ว คุณจะไม่สามารถแก้ไขหรือลบได้ จนกว่าคูปองจะหมดอายุ\n\nต้องการสร้างคูปองหรือไม่?"
    );

    if (!confirmSave) return;

    await addDoc(collection(db, "coupon"), {
      location_id: uid,
      ...form
    });

    alert("สร้างคูปองสำเร็จ");

    setShowForm(false);
    window.location.reload();
  };
  const handleDelete = async (id: string) => {
  const confirmDelete = confirm("ต้องการลบคูปองนี้ใช่หรือไม่?");

  if (!confirmDelete) return;

  await deleteDoc(doc(db, "coupon", id));

  alert("ลบคูปองสำเร็จ");
   setCoupons(prev => prev.filter(c => c.id !== id));
  setCoupons(prev => prev.filter(c => c.id !== id));
};


  if (!uid) return <p style={{ padding: 40 }}>กำลังโหลด...</p>;


  return (
    
    <div style={containerStyle}>
        <style jsx>{`
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type=number] {
    -moz-appearance: textfield;
  }
`}</style>

      <TabBar pathname={pathname} router={router} />

      <h1 style={{ marginBottom: 20 }}>Coupons ของร้าน</h1>

      <button
        style={createBtn}
        onClick={() => setShowForm(true)}
      >
        + สร้างคูปอง
      </button>

      <div style={{ marginTop: 30 }}>

        {coupons.length === 0 && <p>ยังไม่มีคูปอง</p>}

        {coupons.map((c) => {

          const today = new Date();
          const expiry = new Date(c.expiry_date);
          const expired = expiry < today;

          return (
            

            <div
              key={c.id}
              style={{
                ...couponCard,
                opacity: expired ? 0.6 : 1
              }}
            >
                {expired && (
  <button
    onClick={() => handleDelete(c.id)}
    style={deleteBtn}
  >
    <Icon icon="mdi:trash-can-outline" width="18" color="#fff" />
  </button>
)}

              <div style={couponLeftHole}></div>
              <div style={couponRightHole}></div>

              <div style={couponContent}>

                <div style={discountBadge}>
                  {c.discount_value}
                  {c.discount_type === "percent" ? "%" : "฿"}
                  <span style={{ fontSize: 14 }}> OFF</span>
                </div>

                <div style={{ flex: 1 }}>

                  <h3 style={{ marginBottom: 5 }}>
                    {c.coupon_name}

                    {expired && (
                      <span style={expiredBadge}>Expired</span>
                    )}
                  </h3>

                  <p style={{ marginBottom: 6 }}>
                    {c.description}
                  </p>

                  <p style={{ fontSize: 13 }}>
                    ใช้ {c.points_required} points
                  </p>

                  <p style={{ fontSize: 12, color: "#666" }}>
                    หมดอายุ : {c.expiry_date}
                  </p>

                </div>

              </div>

            </div>

          );
        })}

      </div>


      {showForm && (
        <div style={modalBg}>

          <div style={modalCard}>

            <h2>สร้างคูปองของร้านคุณ</h2>

<div style={inputGroup}>
  <label
    style={{
      ...floatingLabel,
      top: form.coupon_name || focus === "coupon_name" ? -8 : 14,
      fontSize: form.coupon_name || focus === "coupon_name" ? 12 : 14,
      color: form.coupon_name || focus === "coupon_name" ? "#065f46" : "#999"
    }}
  >
    ชื่อคูปอง
  </label>

  <input
    value={form.coupon_name}
    onFocus={() => setFocus("coupon_name")}
    onBlur={() => setFocus("")}
    onChange={(e) =>
      setForm({ ...form, coupon_name: e.target.value })
    }
    style={inputStyle}
  />
</div>

            <div style={inputGroup}>
  <label
    style={{
      ...floatingLabel,
      top: form.description || focus === "description" ? -8 : 14,
      fontSize: form.description || focus === "description" ? 12 : 14,
      color: form.description || focus === "description" ? "#065f46" : "#999"
    }}
  >
    คำบรรยายของคูปอง
  </label>

  <input
    value={form.description}
    onFocus={() => setFocus("description")}
    onBlur={() => setFocus("")}
    onChange={(e) =>
      setForm({ ...form, description: e.target.value })
    }
    style={inputStyle}
  />
</div>
<div style={inputGroup}>
  <label
    style={{
      ...floatingLabel,
      top: form.discount_type || focus === "discount_type" ? -8 : 14,
      fontSize: form.discount_type || focus === "discount_type" ? 12 : 14,
      color: form.discount_type || focus === "discount_type" ? "#065f46" : "#999"
    }}
  >
    ประเภทส่วนลด
  </label>

  <select
    value={form.discount_type}
    onFocus={() => setFocus("discount_type")}
    onBlur={() => setFocus("")}
    onChange={(e) =>
      setForm({ ...form, discount_type: e.target.value })
    }
    style={inputStyle}
  >
    <option value="">เลือกประเภท</option>
    <option value="percent">เปอร์เซ็นต์ (%)</option>
    <option value="baht">บาท (฿)</option>
  </select>
</div>

 <div style={inputGroup}>
  <label
    style={{
      ...floatingLabel,
      top: form.discount_value || focus === "discount_value" ? -8 : 14,
      fontSize: form.discount_value || focus === "discount_value" ? 12 : 14,
      color: form.discount_value || focus === "discount_value" ? "#065f46" : "#999"
    }}
  >
    ส่วนลดของคูปอง
  </label>

  <input
    type="number"
    value={form.discount_value}
    onFocus={() => setFocus("discount_value")}
    onBlur={() => setFocus("")}
    onChange={(e) =>
      setForm({ ...form, discount_value: e.target.value })
    }
    style={inputStyle}
  />
</div>

<div style={inputGroup}>
  <label
    style={{
      ...floatingLabel,
      top: form.points_required || focus === "points_required" ? -8 : 14,
      fontSize: form.points_required || focus === "points_required" ? 12 : 14,
      color: form.points_required || focus === "points_required" ? "#065f46" : "#999"
    }}
  >
    คะแนนที่ต้องใช้แลกคูปอง
  </label>

  <select
    value={form.points_required}
    onFocus={() => setFocus("points_required")}
    onBlur={() => setFocus("")}
    onChange={(e) =>
      setForm({ ...form, points_required: e.target.value })
    }
    style={inputStyle}
  >
    <option value="">เลือกคะแนน</option>  {/* ⭐ สำคัญ */}
    <option value="50">50 คะแนน</option>
    <option value="100">100 คะแนน</option>
    <option value="150">150 คะแนน</option>
    <option value="200">200 คะแนน</option>
  </select>
</div>

            <input
              style={inputStyle}
              type="date"
              onChange={(e) =>
                setForm({ ...form, expiry_date: e.target.value })
              }
            />

            <p style={warningText}>
              เมื่อสร้างคูปองแล้วจะไม่สามารถแก้ไขหรือลบได้
              จนกว่าคูปองจะหมดอายุ
            </p>

            <button style={saveBtn} onClick={createCoupon}>
              บันทึกข้อมูล
            </button>

            <button
              style={cancelBtn}
              onClick={() => setShowForm(false)}
            >
              ยกเลิก
            </button>

          </div>

        </div>
      )}

    </div>
  );
}


/* TAB */

function TabBar({ pathname, router }: any) {
  return (
    <div style={tabWrapper}>

      <button
        onClick={() => router.push("/merchant")}
        style={{
          ...tabBtn,
          borderBottom:
            pathname === "/merchant"
              ? "3px solid #065f46"
              : "none",
          fontWeight:
            pathname === "/merchant" ? "bold" : "normal",
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
        คูปอง
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


/* STYLE */

const containerStyle = {
  maxWidth: 900,
  margin: "40px auto",
  padding: 30,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
};

const createBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: 8,
  cursor: "pointer",
};

const couponCard = {
  position: "relative" as const,
  background: "#f0fdf4",
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
};

const couponContent = {
  display: "flex",
  gap: 20,
  alignItems: "center",
};

const discountBadge = {
  fontSize: 28,
  fontWeight: "bold",
  color: "#065f46",
  background: "#bbf7d0",
  padding: "10px 14px",
  borderRadius: 10,
};

const couponLeftHole = {
  position: "absolute" as const,
  left: -10,
  top: "50%",
  width: 20,
  height: 20,
  background: "#fff",
  borderRadius: "50%",
  transform: "translateY(-50%)",
};

const couponRightHole = {
  position: "absolute" as const,
  right: -10,
  top: "50%",
  width: 20,
  height: 20,
  background: "#fff",
  borderRadius: "50%",
  transform: "translateY(-50%)",
};

const expiredBadge = {
  marginLeft: 10,
  fontSize: 12,
  background: "#ef4444",
  color: "#fff",
  padding: "2px 6px",
  borderRadius: 4,
};

const modalBg = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalCard = {
  background: "#fff",
  padding: 30,
  borderRadius: 10,
  width: 320,
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};


const warningText = {
  fontSize: 12,
  color: "#b91c1c",
};

const saveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: 10,
  borderRadius: 6,
  cursor: "pointer",
};

const cancelBtn = {
  background: "#ddd",
  border: "none",
  padding: 10,
  borderRadius: 6,
  cursor: "pointer",
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
};
const inputGroup: any = {
  position: "relative",
  marginBottom: 18
};

const floatingLabel: any = {
  position: "absolute",
  left: 12,
  background: "#fff",
  padding: "0 4px",
  fontSize: 13,
  color: "#999",
  transition: "0.2s",
  pointerEvents: "none",
};

const inputStyle: any = {
  width: "100%",
  border: "1px solid #d1d5db",
  padding: "16px 12px 10px",   // ⭐ สำคัญ
  borderRadius: 8,
};

const deleteBtn = {
  position: "absolute" as const,
  top: 10,
  right: 10,
  background: "#ef4444",
  border: "none",
  borderRadius: "50%",
  width: 32,
  height: 32,
  color: "#fff",
  fontSize: 14,
display: "flex",              // ⭐ เพิ่ม
  alignItems: "center",         // ⭐ เพิ่ม
  justifyContent: "center",  
  cursor: "pointer",
};