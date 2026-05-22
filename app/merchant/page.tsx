"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";



export default function MerchantViewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const dayMap: any = {
  Mon: "จันทร์",
  Tue: "อังคาร",
  Wed: "พุธ",
  Thu: "พฤหัสบดี",
  Fri: "ศุกร์",
  Sat: "เสาร์",
  Sun: "อาทิตย์",
};

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const snap = await getDoc(doc(db, "locations", user.uid));
      if (snap.exists()) {
        setData(snap.data());
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
  const confirmLogout = window.confirm("ต้องการออกจากระบบหรือไม่?");
  if (!confirmLogout) return;

  await signOut(auth);
  router.push("/login");
};


  if (loading) return <p style={{ padding: 40 }}>กำลังโหลด...</p>;

  if (!data)
    return (
      <div style={{ padding: 40 }}>
        <TabBar pathname={pathname} router={router} />
        <p>ยังไม่มีข้อมูลร้าน</p>
        <button
          onClick={() => router.push("/merchant/edit")}
          style={buttonStyle}
        >
          เพิ่มข้อมูลร้าน
        </button>
      </div>
    );

  return (
    <div style={containerStyle}>
      <TabBar pathname={pathname} router={router} />

      {data.mainImage && (
        <div style={sectionStyle}>
          <img
            src={data.mainImage}
            style={{
              width: "100%",
              height: 350,          // ปรับความสูงได้ตามชอบ เช่น 300–400
              objectFit: "cover",   // ครอปภาพให้เต็มกรอบ
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
            }}
            alt="main"
          />
        </div>
      )}

      <h1 style={titleStyle}>{data.locationName}</h1>

      <p style={descriptionStyle}>{data.description}</p>

      <div style={sectionStyle}>
        <h3 style={{ fontWeight: "bold" }}>
  หมวดหมู่
</h3>
        <p>{data.category}</p>
      </div>

      {data.extraImages?.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ fontWeight: "bold" }}>
  รูปภาพเพิ่มเติม
</h3>
          <div style={imageGridStyle}>
            {data.extraImages.map((img: string, i: number) => (
              <img key={i} src={img} style={extraImageStyle} alt="extra" />
            ))}
          </div>
        </div>
      )}


      {data.schedule?.length > 0 && (
        <div style={sectionStyle}>
          {data.schedule?.length > 0 && (
  <div style={sectionStyle}>
    <h3 style={{ fontWeight: "bold" }}>
  เวลา เปิด-ปิด
</h3>

    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => {
      const found = data.schedule.find((s: any) =>
        s.days.includes(day)
      );

      let text = "ปิดทำการ";

      if (found) {
        text = `${found.open} - ${found.close}`;
      }

      return (
        <div
          key={day}
          style={{
    display: "flex",
    gap: 20,              // 🔥 คุมระยะห่าง
    padding: "6px 0",
    borderBottom: "1px solid #eee",
    alignItems: "center"
  }}
        >
          <span style={{ fontWeight: 600, width: 80 }}>
  {dayMap[day]}
</span>
          <span>{text}</span>
        </div>
      );
    })}
  </div>
)}
        </div>
      )}

      {data.address && (
        <div style={sectionStyle}>
          <h3 style={{ fontWeight: "bold" }}>
ที่อยู่ร้านค้า
</h3>
          <p>{data.address}</p>
        </div>
      )}
      {data.latitude && data.longitude && (
  <div style={sectionStyle}>
    <p>ละติจูด : {data.latitude}</p>
    <p>ลองจิจูด : {data.longitude}</p>
  </div>
)}
      {data.googleMap && (
        <div style={sectionStyle}>
         <h3 style={{ fontWeight: "bold" }}>
  Google Map
</h3>
          <iframe
            src={
              data.googleMap.includes("iframe")
                ? data.googleMap.match(/src="([^"]+)"/)?.[1]
                : data.googleMap
            }
            width="100%"
            height="250"
            style={{ borderRadius: 12, border: "none" }}
            title="google-map"
          />
        </div>
      )}
      

      <button
        onClick={() => router.push("/merchant/edit")}
        style={buttonStyle}
      >
        แก้ไขข้อมูล
      </button>

      <br></br>
      <p onClick={handleLogout} style={logoutTextStyle}>
        ออกจากระบบ
      </p>

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


/* ================= STYLE ================= */

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

const containerStyle = {
  maxWidth: 900,
  margin: "40px auto",
  padding: 30,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
};

const titleStyle = {
  fontSize: 32,
  marginBottom: 10,
};

const descriptionStyle = {
  color: "#555",
  marginBottom: 20,
};

const sectionStyle = {
  marginBottom: 25,
};

const imageGridStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const extraImageStyle = {
  width: 120,
  height: 120,
  objectFit: "cover" as const,
  borderRadius: 10,
};

const scheduleCardStyle = {
  background: "#f5f5f5",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
};

const buttonStyle = {
  marginTop: 20,
  padding: "12px 20px",
  background: "#F3BC00",
  color: "#614124",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight:"bold",
};

const logoutTextStyle = {
  marginTop: 12,
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 500,
};



