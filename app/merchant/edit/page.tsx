"use client";

import { useEffect, useState } from "react";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react"; // 🔔 เรียกใช้ไอคอนเพื่อยกระดับความพรีเมียม


export default function MerchantPage() {
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [googleMap, setGoogleMap] = useState("");
  const router = useRouter();
  const [mapLink, setMapLink] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  /* ================= IMAGES ================= */
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);

  /* ================= 🔔 STATES สำหรับ CONTROL CUSTOM POPUP 🔔 ================= */
  const [popupState, setPopupState] = useState<{
    show: boolean;
    type: "success" | "confirmLeave" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  const handleMainImage = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Upload error:", text);
        setPopupState({ show: true, type: "error", message: "อัปโหลดรูปภาพหลักล้มเหลว" });
        return;
      }

      const data = await res.json();
      if (data.url) {
        setMainImage(data.url);
      }
    } catch (err) {
      console.error("Upload main image failed", err);
    }
  };

  const handleExtraImages = async (e: any) => {
    const files = Array.from(e.target.files || []);

    for (const file of files as File[]) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Upload error:", text);
          continue;
        }

        const data = await res.json();

        if (data.url) {
          setExtraImages((prev) => [...prev, data.url]);
        }
      } catch (err) {
        console.error("Upload extra image failed", err);
      }
    }
  };

  const removeExtraImage = (index: number) => {
    setExtraImages(extraImages.filter((_, i) => i !== index));
  };

  /* ================= SCHEDULE ================= */
  const daysList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [schedules, setSchedules] = useState([
    { days: [] as string[], open: "08:00", close: "18:00" },
  ]);

  const toggleDay = (index: number, day: string) => {
    const updated = [...schedules];
    if (updated[index].days.includes(day)) {
      updated[index].days = updated[index].days.filter((d) => d !== day);
    } else {
      updated[index].days.push(day);
    }
    setSchedules(updated);
  };

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      { days: [], open: "09:00", close: "18:00" },
    ]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const fetchLocation = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "locations", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setLatitude(data.latitude || null);
        setLongitude(data.longitude || null);
        setLocationName(data.locationName || "");
        setDescription(data.description || "");
        setCategory(data.category || "");
        setAddress(data.address || "");
        setGoogleMap(data.googleMap || "");
        setMainImage(data.mainImage || null);
        setExtraImages(data.extraImages || []);
        setSchedules(
          data.schedule || [
            { days: [], open: "08:00", close: "18:00" },
          ]
        );
      }
    };

    fetchLocation();
  }, []);

  function extractLatLng(url: string) {
    const matchAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchAt) {
      return { lat: parseFloat(matchAt[1]), lng: parseFloat(matchAt[2]) };
    }
    const matchQ = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchQ) {
      return { lat: parseFloat(matchQ[1]), lng: parseFloat(matchQ[2]) };
    }
    return null;
  }

  /* ================= SAVE ================= */
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      setPopupState({ show: true, type: "error", message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
      return;
    }

    await setDoc(
      doc(db, "locations", user.uid),
      {
        locationName,
        description,
        category,
        address,
        googleMap,
        latitude,   
        longitude,  
        mainImage,
        extraImages,
        schedule: schedules,
        ownerId: user.uid,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // 🔔 เปลี่ยนจาก alert() ดั้งเดิมเป็นเปิด Custom Success Popup 
    setPopupState({
      show: true,
      type: "success",
      message: "บันทึกเรียบร้อย",
    });
  };

  // 🔔 เปลี่ยนจาก window.confirm เป็นสเตตป๊อปอัปยืนยัน
  const handleCancel = () => {
    setPopupState({
      show: true,
      type: "confirmLeave",
      message: "คุณยังไม่ได้บันทึกข้อมูล\nต้องการออกจากหน้านี้หรือไม่?",
    });
  };

  // จัดการการยืนยันการปิดหรือออกหลังจากกดปุ่มใน Custom Popup
  const confirmAction = () => {
    if (popupState.type === "success") {
      setPopupState((prev) => ({ ...prev, show: false }));
      router.push("/merchant"); // ย้ายหน้าหลังจากบันทึกเสร็จและกดตกลง
    } else if (popupState.type === "confirmLeave") {
      setPopupState((prev) => ({ ...prev, show: false }));
      router.push("/merchant"); // ยอมรับการออกจากหน้าโดยไม่บันทึก
    } else {
      setPopupState((prev) => ({ ...prev, show: false }));
    }
  };


  return (
    <div style={container}>
      <h1 style={title}>ข้อมูลร้านค้า</h1>

      <input
        style={input}
        placeholder="ชื่อร้าน"
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
      />

      <textarea
        style={input}
        placeholder="รายละเอียดร้าน"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <h3 style={sectionTitle}>ที่อยู่ร้าน</h3>
      <textarea
        style={input}
        placeholder="เช่น 123 ถนนพระราม 9 แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <h3 style={sectionTitle}>ลิงก์ Google Map (Embed link)</h3>
      <input
        style={input}
        placeholder="วางลิงก์ iframe จาก Google Map"
        value={googleMap}
        onChange={(e) => setGoogleMap(e.target.value)}
      />

      <h3 style={sectionTitle}>ลิงก์ Google Maps (สำหรับคำนวณพิกัด)</h3>
      <input
        style={input}
        placeholder="วางลิงก์ Google Maps ปกติ เช่น https://maps.google.com/..."
        value={mapLink}
        onChange={(e) => setMapLink(e.target.value)}
      />

      <button
        style={{
          marginBottom: 10,
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: "#614124",
          color: "#fff",
          cursor: "pointer",
          fontWeight: "bold"
        }}
        onClick={() => {
          const coords = extractLatLng(mapLink);
          if (!coords) {
            setPopupState({ show: true, type: "error", message: "ลิงก์ไม่ถูกต้อง ❌" });
            return;
          }
          setLatitude(coords.lat);
          setLongitude(coords.lng);
        }}
      >
        คำนวณพิกัด
      </button>

      {latitude && longitude && (
        <div style={{ marginBottom: 15, background: "#fcf8f2", padding: 10, borderRadius: 8 }}>
          <p style={{ margin: "2px 0" }}>📍 ละติจูด : {latitude}</p>
          <p style={{ margin: "2px 0" }}>📍 ลองจิจูด : {longitude}</p>
        </div>
      )}

      {/* ================= CATEGORY ================= */}
      <h3 style={sectionTitle}>หมวดหมู่ร้าน</h3>
      <div style={categoryWrapper}>
        {["Cafe", "Food", "Temple", "Sight"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              ...categoryBtn,
              backgroundColor: category === cat ? "#614124" : "white",
              color: category === cat ? "white" : "#614124",
              border: "1.5px solid #614124",
              fontWeight: "bold"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ================= MAIN IMAGE ================= */}
      <h3 style={sectionTitle}>รูปหลักร้าน</h3>
      <div style={{ marginBottom: 20 }}>
        <label style={mainUploadBox}>
          {mainImage ? (
            <img src={mainImage} style={mainPreviewImage} alt="main-preview" />
          ) : (
            <div style={uploadContent}>
              📷
              <p>เลือกรูปหลัก</p>
            </div>
          )}
          <input type="file" hidden onChange={handleMainImage} />
        </label>

        {mainImage && (
          <button style={deleteBtn} onClick={() => setMainImage(null)}>
            ลบรูปหลัก
          </button>
        )}
      </div>

      {/* ================= EXTRA IMAGES ================= */}
      <h3 style={sectionTitle}>รูปอื่น ๆ</h3>
      <div style={extraGrid}>
        {extraImages.map((img, index) => (
          <div key={index} style={extraItem}>
            <img src={img} style={extraImageStyle} alt="extra-preview" />
            <button
              style={smallDeleteBtn}
              onClick={() => removeExtraImage(index)}
            >
              ✕
            </button>
          </div>
        ))}

        <label style={addImageBox}>
          +
          <input type="file" hidden multiple onChange={handleExtraImages} />
        </label>
      </div>

      {/* ================= SCHEDULE ================= */}
      <h3 style={sectionTitle}>เวลาเปิดปิด</h3>
      {schedules.map((schedule, index) => (
        <div key={index} style={scheduleBox}>
          {daysList.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(index, day)}
              style={{
                ...dayBtn,
                backgroundColor: schedule.days.includes(day) ? "#614124" : "white",
                color: schedule.days.includes(day) ? "white" : "#614124",
                border: "1.5px solid #614124",
              }}
            >
              {day}
            </button>
          ))}

          <div style={{ marginTop: 10 }}>
            <input
              type="time"
              style={timeInput}
              value={schedule.open}
              onChange={(e) => {
                const updated = [...schedules];
                updated[index].open = e.target.value;
                setSchedules(updated);
              }}
            />
            {" - "}
            <input
              type="time"
              style={timeInput}
              value={schedule.close}
              onChange={(e) => {
                const updated = [...schedules];
                updated[index].close = e.target.value;
                setSchedules(updated);
              }}
            />
          </div>

          {schedules.length > 1 && (
            <button
              style={deleteBtn}
              onClick={() => removeSchedule(index)}
            >
              ลบช่วงเวลา
            </button>
          )}
        </div>
      ))}

      <button style={addBtn} onClick={addSchedule}>
        + เพิ่มช่วงเวลา
      </button>

      <br /><br />

      <div style={{ display: "flex", gap: 15 }}>
        <button style={cancelBtn} onClick={handleCancel}>
          ยกเลิก
        </button>

        <button style={saveBtn} onClick={handleSave}>
          บันทึกข้อมูลร้าน
        </button>
      </div>

      {/* ================= 🔔 [NEW DOM] GLOBAL CUSTOM POPUP DIALOG 🔔 ================= */}
      {popupState.show && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.card}>
            
            {/* 1. แสดง Icon และสีหัวเรื่องตามประเภทของเหตุการณ์ */}
            <div style={popupStyles.iconWrapper}>
              {popupState.type === "success" && (
                <Icon icon="solar:check-circle-bold-duotone" width="64" color="#065f46" />
              )}
              {popupState.type === "confirmLeave" && (
                <Icon icon="solar:danger-triangle-bold-duotone" width="64" color="#F3BC00" />
              )}
              {popupState.type === "error" && (
                <Icon icon="solar:close-circle-bold-duotone" width="64" color="#dc2626" />
              )}
            </div>

            {/* 2. ข้อความแจ้งเตือน */}
            <p style={popupStyles.messageText}>{popupState.message}</p>

            {/* 3. จัดกลุ่มปุ่มตามเงื่อนไขเพื่อตอบสนอง User Action */}
            <div style={popupStyles.btnGroup}>
              {popupState.type === "confirmLeave" ? (
                <>
                  <button 
                    style={popupStyles.secondaryBtn} 
                    onClick={() => setPopupState((prev) => ({ ...prev, show: false }))}
                  >
                    ยกเลิก
                  </button>
                  <button 
                    style={popupStyles.dangerConfirmBtn} 
                    onClick={confirmAction}
                  >
                    ตกลง
                  </button>
                </>
              ) : (
                <button 
                  style={{
                    ...popupStyles.primaryBtn,
                    background: popupState.type === "success" ? "#065f46" : "#614124"
                  }} 
                  onClick={confirmAction}
                >
                  ตกลง
                </button>
              )}
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}

/* ================= STYLE ================= */
const container = {
  maxWidth: 900,
  margin: "auto",
  padding: 20,
  fontFamily: "sans-serif",
};

const title: React.CSSProperties = {
  color: "#614124",
  fontWeight: "bold",
  textAlign: "center",
  fontSize: "28px",
};

const input = {
  width: "100%",
  padding: 10,
  marginBottom: 15,
  borderRadius: 10,
  border: "1px solid #614124",
  boxSizing: "border-box" as const,
};

const timeInput = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #614124",
  margin: "0 4px"
};

const sectionTitle = {
  marginTop: 25,
  marginBottom: 10,
  color: "#614124",
  fontWeight:"bold",
};

const categoryWrapper = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginBottom: 15,
};

const categoryBtn = {
  padding: "8px 16px",
  borderRadius: 20,
  border: "none",
  cursor: "pointer",
};

const mainUploadBox = {
  width: "100%",
  height: 220,
  borderRadius: 16,
  border: "2px dashed #614124",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  overflow: "hidden",
};

const uploadContent = {
  textAlign: "center" as const,
  fontSize: 18,
  color: "#614124",
};

const mainPreviewImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const extraGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  gap: 12,
  marginBottom: 15,
};

const extraItem = {
  position: "relative" as const,
  borderRadius: 12,
  overflow: "hidden",
};

const extraImageStyle = {
  width: "100%",
  height: 100,
  objectFit: "cover" as const,
};

const addImageBox = {
  height: 100,
  borderRadius: 12,
  border: "2px dashed #614124",
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
  color: "#614124",
  cursor: "pointer",
};

const smallDeleteBtn = {
  position: "absolute" as const,
  top: 6,
  right: 6,
  backgroundColor: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "50%",
  width: 22,
  height: 22,
  fontSize: 12,
  cursor: "pointer",
};

const scheduleBox = {
  border: "1px solid #614124",
  padding: 15,
  borderRadius: 10,
  marginBottom: 15,
};

const dayBtn = {
  marginRight: 6,
  marginBottom: 6,
  padding: "5px 10px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
};

const deleteBtn = {
  marginTop: 10,
  backgroundColor: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const addBtn = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "#614124",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const saveBtn = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  backgroundColor: "#065f46",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const cancelBtn = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  backgroundColor: "#ba0900",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

// 🔔 [NEW STYLES] สไตล์พิกัดของ Custom Popup ยุคใหม่ไร้เงา localhost
const popupStyles: any = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20000,
    backdropFilter: "blur(5px)"
  },
  card: {
    background: "#fff",
    width: "90%",
    maxWidth: "360px",
    borderRadius: "24px",
    padding: "32px 24px 24px 24px",
    textAlign: "center",
    boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
    boxSizing: "border-box"
  },
  iconWrapper: {
    marginBottom: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  messageText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#4A3E3D", // คลุมโทนสีตัวอักษรน้ำตาลเข้ม
    lineHeight: "1.6",
    marginBottom: "26px",
    whiteSpace: "pre-line"
  },
  btnGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center"
  },
  primaryBtn: {
    flex: 1,
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "14px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer"
  },
  secondaryBtn: {
    flex: 1,
    background: "#F3F4F6",
    color: "#4B5563",
    border: "1px solid #E5E7EB",
    padding: "12px",
    borderRadius: "14px",
    fontWeight: "600",
    fontSize: "15px",
    cursor: "pointer"
  },
  dangerConfirmBtn: {
    flex: 1,
    background: "#ba0900", // สีแดงสำหรับการกดยืนยันที่จะละทิ้งข้อมูลไป
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "14px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer"
  }
};