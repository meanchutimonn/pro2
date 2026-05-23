"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { QRCodeCanvas } from "qrcode.react";


export default function LocationDetailPage() {
  const ADMIN_UID = "7Ay3Nc5bn8hAqjyl2QKM8oBGyBt1";
  const dayMap: any = {
  Mon: "จันทร์",
  Tue: "อังคาร",
  Wed: "พุธ",
  Thu: "พฤหัสบดี",
  Fri: "ศุกร์",
  Sat: "เสาร์",
  Sun: "อาทิตย์",
};

  const { id } = useParams();
  const router = useRouter();

  const [ownerId, setOwnerId] = useState("");
  const isOwner = ownerId === ADMIN_UID;

  const [locationName, setLocationName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [googleMap, setGoogleMap] = useState("");

  const [mainImage, setMainImage] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
const [longitude, setLongitude] = useState<number | null>(null);

const displayName =
  category?.toLowerCase().trim() === "sight"
    ? "Other Attraction"
    : category;

  const checkinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkin/${id}`
      : "";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const snap = await getDoc(doc(db, "locations", id as string));
    if (snap.exists()) {
      const data = snap.data();

      setOwnerId(data.ownerId || "");
      setLocationName(data.locationName || "");
      setCategory(data.category || "");
      setAddress(data.address || "");
      setDescription(data.description || "");
      setGoogleMap(data.googleMap || "");
      setMainImage(data.mainImage || "");
      setExtraImages(data.extraImages || []);
      setSchedule(data.schedule || []);
      setLatitude(data.latitude || null);
setLongitude(data.longitude || null);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 50 }}>กำลังโหลด...</div>;

  return (
    <div style={wrapper}>
      {/* 🔙 back */}
      <button
        onClick={() => router.push(`/admin/add-location/`)}
        style={backBtn}
      >
        <Icon icon="lucide:chevron-left" width="30" />
      </button>

      <div style={container}>
        {/* 🟫 MAIN CARD */}
        <div style={card}>
          {mainImage && <img src={mainImage} style={mainImg} />}
          <h1 style={title}>{locationName}</h1>
          <p style={{ color: "#555" }}>{description}</p>
        </div>

        {/* 🟫 CATEGORY */}
        <div style={card}>
          <h3 style={{ fontWeight: "bold", fontSize: 18 }}>
  หมวดหมู่
</h3>

          <p>{displayName}</p>
        </div>

        {/* 🟫 PHOTOS */}
        {extraImages.length > 0 && (
          <div style={card}>
            <h3 style={{ fontWeight: "bold", fontSize: 18 }}>
  รูปภาพเพิ่มเติม
</h3>
            <div style={imageGrid}>
              {extraImages.map((img, i) => (
                <img key={i} src={img} style={extraImg} />
              ))}
            </div>
          </div>
        )}

        {/* 🟫 OPENING */}
        {schedule.length > 0 && (
          <div style={card}>
  <h3 style={{ fontWeight: "bold", fontSize: 18 }}>
    เวลา เปิด-ปิด
  </h3>

  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => {
    const found = schedule.find((s: any) =>
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
          gap: 50,
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

        {/* 🟫 ADDRESS */}
        <div style={card}>
         <h3 style={{ fontWeight: "bold", fontSize: 18 }}>
  ที่อยู่สถานที่
</h3>
          <p>{address}</p>
        </div>

        {latitude && longitude && (
  <div style={card}>
    <h3 style={{ fontWeight: "bold", fontSize: 18 }}>
      พิกัดสถานที่
    </h3>
    <p>Latitude: {latitude}</p>
    <p>Longitude: {longitude}</p>
  </div>
)}

        {/* 🟫 MAP */}
        {googleMap && (
          <div style={card}>
            <h3>Map</h3>
            <iframe
              src={
                googleMap.includes("iframe")
                  ? googleMap.match(/src="([^"]+)"/)?.[1]
                  : googleMap
              }
              width="100%"
              height="250"
              style={mapStyle}
            />
          </div>
        )}

        {/* 🟩 QR CODE */}
        <div style={card}>
          <h3 style={{ fontWeight: "bold", fontSize: 18 }}>
  QR Code สำหรับ เช็กอิน
</h3>

          <div style={qrBox}>
            <QRCodeCanvas value={checkinUrl} size={180} />
          </div>

          <p style={{ fontSize: 12, marginTop: 10 }}>
            ให้ลูกค้าสแกนเพื่อเช็คอิน
          </p>
        </div>

        {/* 🟫 BUTTONS */}
        {isOwner && (
          <div style={card}>
            <button
              onClick={() =>
                router.push(`/admin/add-location/edit/${id}`)
              }
              style={editBtn}
            >
              แก้ไขข้อมูล
            </button>

            <button
              onClick={() => router.push(`/admin/qr/${id}`)}
              style={qrBtn}
            >
              เปิดหน้า QR เต็ม
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== STYLE ===== */

const wrapper = {
  background: "#f9fafb",
  minHeight: "100vh",
  padding: 40,
};

const container = {
  maxWidth: 900,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column" as const,
  gap: 20,
};

const card = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
};

const title = {
  fontSize: 28,
  marginTop: 10,
};

const backBtn = {
  position: "fixed" as const,
  top: 20,
  left: 20,
  width: 50,
  height: 50,
  borderRadius: "50%",
  background: "#614124",
  border: "none",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const mainImg = {
  width: "100%",
  height: 300,
  objectFit: "cover" as const,
  borderRadius: 16,
  marginBottom: 20,
};

const imageGrid = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const extraImg = {
  width: 120,
  height: 120,
  objectFit: "cover" as const,
  borderRadius: 10,
};

const scheduleCard = {
  background: "#f5f5f5",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
};

const mapStyle = {
  borderRadius: 12,
  border: "none",
  marginTop: 10,
};

const qrBox = {
  display: "flex",
  justifyContent: "center",
  marginTop: 10,
};

const editBtn = {
  padding: "12px 20px",
  background: "#614124",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%",
};

const qrBtn = {
  marginTop: 10,
  padding: "12px 20px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%",
};