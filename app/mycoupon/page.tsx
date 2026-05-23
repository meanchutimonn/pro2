"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { updateDoc, deleteDoc, serverTimestamp, addDoc } from "firebase/firestore";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function MyCouponPage() {
  const [myCoupons, setMyCoupons] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null); // สำหรับคุม Popup
  const router = useRouter();
  const [sortBy, setSortBy] = useState("default");


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [mySnap, couponSnap, locSnap] = await Promise.all([
          getDocs(query(collection(db, "user_coupons"), where("user_id", "==", userId))),
          getDocs(collection(db, "coupon")),
          getDocs(collection(db, "locations"))
        ]);

        setMyCoupons(mySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCoupons(couponSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLocations(locSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  const handleUseCoupon = async (item: any) => {
    if (!userId) return;

    const code = generateCode();

    await updateDoc(doc(db, "user_coupons", item.myCouponId), {
      used: true,
      code: code,
      used_at: serverTimestamp()
    });

    await addDoc(collection(db, "notifications"), {
      userId: userId,
      title: "ใช้คูปองสำเร็จ ✅",
      body: `คุณใช้คูปอง ${item.coupon_name || "คูปอง"} ที่ ${item.location?.locationName || "ร้านค้า"} เรียบร้อยแล้ว`,
      couponId: item.id,
      couponName: item.coupon_name || "",
      placeName: item.location?.locationName || "",
      type: "coupon_used",
      read: false,
      createdAt: serverTimestamp()
    });

    alert("รหัสของคุณคือ: " + code);
    setSelectedItem(null);
    window.location.reload();
  };

  const filteredCoupons = myCoupons
    .filter(mc => !mc.used)
    .sort((a, b) => {
      if (sortBy === "expiry") {
        const couponA = coupons.find(c => c.id === a.coupon_id);
        const couponB = coupons.find(c => c.id === b.coupon_id);

        const dateA = couponA?.expiry_date
          ? new Date(couponA.expiry_date).getTime()
          : 999999999999;

        const dateB = couponB?.expiry_date
          ? new Date(couponB.expiry_date).getTime()
          : 999999999999;

        return dateA - dateB;
      }

      return 0;
    });

  return (
    <div className="page">
      <div className="header">
        <button onClick={() => router.push("/")} className="backBtn">
          <Icon icon="lucide:chevron-left" width="30" />
        </button>

        <div className="tabs">
          <span onClick={() => router.push("/coupon")} style={{ cursor: 'pointer' }}>คูปองทั้งหมด</span>
          <span className="active">คูปองของฉัน</span>
        </div>
      </div>

      <div className="sortBar">
        <button
          className={sortBy === "default" ? "activeSort" : ""}
          onClick={() => setSortBy("default")}
        >
          ทั้งหมด
        </button>

        <button
          className={sortBy === "expiry" ? "activeSort" : ""}
          onClick={() => setSortBy("expiry")}
        >
          ใกล้หมดอายุ
        </button>
      </div>

      <div className="list">
        {isLoading ? (
          <div className="emptyText">กำลังโหลด...</div>
        ) : myCoupons.filter(mc => !mc.used).length === 0 ? (
          <div className="emptyText">ยังไม่มีคูปองที่คุณเก็บไว้</div>
        ) : (
          filteredCoupons.map((mc, index) => {
            const coupon = coupons.find(c => c.id === mc.coupon_id);
            if (!coupon) return null;
            const location = locations.find(l => l.id === coupon.location_id);
            if (!location) return null;

            const isExpired = new Date(coupon.expiry_date) < new Date();

            return (
              <div
                className="card"
                key={index}
                onClick={() => !isExpired && setSelectedItem({ ...coupon, location, myCouponId: mc.id })}
                style={{ cursor: isExpired ? 'default' : 'pointer' }}
              >
                <img src={location.mainImage} alt="" />
                <div className="overlay">
                  <h2>{location.locationName}</h2>
                  <p>{coupon.description}</p>
                  {isExpired && <p style={{ color: "#ff4d4d", fontWeight: "bold" }}>คูปองหมดอายุแล้ว</p>}
                </div>

                {isExpired ? (
                  <div className="applyBtn" style={{ background: "gray" }} onClick={(e) => {
                    e.stopPropagation();
                    deleteDoc(doc(db, "user_coupons", mc.id)).then(() => window.location.reload());
                  }}>ลบ</div>
                ) : (
                  <div className="applyBtn">รายละเอียด</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Popup รายละเอียดคูปอง */}
      {selectedItem && (
        <div className="popupOverlay" onClick={() => setSelectedItem(null)}>
          <div className="popupCard" onClick={(e) => e.stopPropagation()}>
            <div className="closeBtn" onClick={() => setSelectedItem(null)}>✕</div>

            <h1 className="popupShopName">{selectedItem.location.locationName}</h1>
            <h2 className="popupCouponName">{selectedItem.coupon_name || "ส่วนลดพิเศษ"}</h2>

            <div className="popupSection">
              <p className="popupLabel">ส่วนลด</p>
              <div className="popupDiscountBox">ลด {selectedItem.discount_value} บาท</div>
            </div>

            <div className="popupSection">
              <p className="popupLabel">รายละเอียด</p>
              <p className="popupDesc">{selectedItem.description}</p>
            </div>

            <div className="popupSection">
              <p className="popupLabel">วันหมดอายุ</p>
              <p className="popupExpiry">{selectedItem.expiry_date}</p>
            </div>

            <button className="confirmUseBtn" onClick={() => handleUseCoupon(selectedItem)}>
              ใช้งานคูปองตอนนี้
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        body {
          background-image: url('/photo/background.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .page {
          background: #fff;
          min-height: 100vh;
          padding: 16px;
          margin: 0;
          max-width: 100%;
          border-radius: 0;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          position: relative;
          height: 50px;
        }
        .tabs {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          gap: 20px;
          font-weight: 600;
        }
        .tabs span {
          color: #aaa;
          padding-bottom: 6px;
          white-space: nowrap;
          line-height: 1;
        }
        .tabs .active {
          color: black;
          border-bottom: 2px solid black;
          display: inline-block;
        }
        .header::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: #ccc;
        }
        .backBtn {
          width: 42px;
          height: 42px;
          background: #6b4729;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .card {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          transition: 0.2s;
        }
        .card:active {
          transform: scale(0.98);
        }
        .card img {
          width: 100%;
          height: 170px;
          object-fit: cover;
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          color: white;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .applyBtn {
          position: absolute;
          right: 12px;
          bottom: 12px;
          background: #facc15;
          color: white;
          padding: 8px 14px;
          border-radius: 4px;
          font-weight: 700;
          cursor: pointer;
        }
        .applyBtn:hover {
          opacity: 0.9;
        }

        /* Popup Styles */
        .popupOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .popupCard { background: white; width: 90%; max-width: 350px; border-radius: 20px; padding: 24px; position: relative; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .closeBtn { position: absolute; top: 15px; right: 15px; font-size: 20px; color: #999; cursor: pointer; }
        .popupShopName { font-size: 20px; font-weight: 800; margin-bottom: 4px; color: #333; }
        .popupCouponName { font-size: 15px; color: #666; margin-bottom: 20px; }
        .popupSection { margin-bottom: 16px; }
        .popupLabel { font-size: 12px; color: #999; margin-bottom: 4px; }
        .popupDiscountBox { background: #fff7cc; border: 1px solid #facc15; padding: 12px; border-radius: 10px; text-align: center; font-weight: 800; font-size: 18px; color: #333; }
        .popupDesc { font-size: 14px; color: #444; line-height: 1.4; }
        .popupExpiry { font-size: 14px; font-weight: 600; color: #333; }
        .confirmUseBtn { background: #facc15; color: white; border: none; width: 100%; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 16px; margin-top: 10px; cursor: pointer; transition: 0.2s; }
        .confirmUseBtn:active { transform: scale(0.97); }

        .emptyText {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60vh;
          text-align: center;
          font-size: 16px;
          color: #777;
        }
        @media (min-width: 1024px) {
          .page {
            max-width: 1100px;
            margin: 40px auto;
            border-radius: 20px;
            overflow: hidden;
          }
        }

        .sortBar{
  display:flex;
  gap:10px;
  margin-bottom:18px;
  overflow:auto;
}

.sortBar button{
  border:none;
  background:#eee;
  padding:8px 14px;
  border-radius:20px;
  font-weight:600;
  white-space:nowrap;
}

.activeSort{
  background:#6b4729 !important;
  color:white;
}
      `}</style>
    </div>
  );
}