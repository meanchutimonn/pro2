"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  getDoc,   // 👈 เพิ่มตัวนี้
  serverTimestamp
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

export default function CouponPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [myCoupons, setMyCoupons] = useState<any[]>([]);
  const [balance, setBalance] = useState(0); // 🔥 เริ่ม 0

  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("coupon");

  const [sortBy, setSortBy] = useState("default");

  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setUserId(user.uid);

      // 🔥 ดึง user (คะแนน)
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setBalance(userData.balance || 0);
      }

      // coupon
      const couponSnap = await getDocs(collection(db, "coupon"));
      setCoupons(
        couponSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );

      // location
      const locSnap = await getDocs(collection(db, "locations"));
      setLocations(
        locSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );

      // user_coupon
      const mySnap = await getDocs(
        query(collection(db, "user_coupons"), where("user_id", "==", user.uid))
      );

      setMyCoupons(mySnap.docs.map((doc) => doc.data()));
    });

    return () => unsubscribe();
  }, []);

  const handleClaim = async (coupon: any) => {
    if (!userId) {
      alert("กรุณา เข้าสู่ระบบ");
      return;
    }

    if (balance < Number(coupon.points_required)) {
      alert("คะแนนของคุณ ไม่พอ");
      return;
    }


    // 🔥 เพิ่ม user_coupon
    await addDoc(collection(db, "user_coupons"), {
      user_id: userId,
      coupon_id: coupon.id,
      used: false,
      created_at: new Date(),
    });

    // 🔥 หักคะแนนใน users
    await updateDoc(doc(db, "users", userId), {
      balance: balance - Number(coupon.points_required),
    });

    await addDoc(collection(db, "notifications"), {
      userId: userId,
      title: "แลกคูปองสำเร็จ 🎉",
      body: `คุณแลกคูปอง ${coupon.coupon_name || "คูปอง"} สำเร็จ ใช้ไป ${coupon.points_required} คะแนน`,
      couponId: coupon.id,
      couponName: coupon.coupon_name || "",
      type: "coupon_claim",
      read: false,
      createdAt: serverTimestamp(),
    });

    setBalance((prev) => prev - Number(coupon.points_required));
    setMyCoupons((prev) => [...prev, { coupon_id: coupon.id }]);

    alert("เก็บคูปองสำเร็จ!");
  };


  const validCoupons = coupons
    .filter(c => {
      if (!c.expiry_date) return true;

      const expiry = new Date(c.expiry_date);

      if (isNaN(expiry.getTime())) return true;

      const today = new Date();

      return expiry >= today;
    })
    .sort((a, b) => {
      if (sortBy === "expiry") {
        return (
          new Date(a.expiry_date).getTime() -
          new Date(b.expiry_date).getTime()
        );
      }

      if (sortBy === "distance") {
        const locA = locations.find((l) => l.id === a.location_id);
        const locB = locations.find((l) => l.id === b.location_id);

        return (locA?.distanceKm || 9999) - (locB?.distanceKm || 9999);
      }

      return 0;
    });

  return (
    <div className="page">
      {/* HEADER */}
      <div className="header">
        <button onClick={() => router.push("/")} className="backBtn">
          <Icon icon="mingcute:left-line" width="22" />
        </button>

        <div className="tabs">
          <span className={activeTab === "coupon" ? "active" : ""}>
            คูปองทั้งหมด
          </span>

          <span
            className={activeTab === "my" ? "active" : ""}
            onClick={() => router.push("/mycoupon")}
          >
            คูปองของฉัน
          </span>
        </div>
      </div>

      {/* BALANCE */}
      <div className="balanceBox">
        <Icon icon="mdi:trophy" className="trophyIcon" />
        <span>คะแนนคงเหลือ :</span>
        <span className="balanceValue">{balance}</span>
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

      {/* LIST */}
      <div className="list">
        {validCoupons.slice(0, 5).map((c) => {
          const location = locations.find(
            (l) => l.id === c.location_id
          );
          if (!location) return null;



          return (
            <div
              className="card"
              key={c.id}
              onClick={() => setSelectedCoupon({ ...c, location })}
            >
              <img src={location.mainImage} />

              <div className="overlay">
                <div className="bottomRow">

                  <div className="textBox">
                    <h2>{location.locationName}</h2>
                    <p>{location.description}</p>
                  </div>

                  <div
                    className="pointBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaim(c);
                    }}
                  >
                    <Icon icon="mdi:trophy" width="16" color="white" />
                    {c.points_required}
                  </div>


                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 POPUP (เหมือนเดิมทุกอย่าง) */}
      {selectedCoupon && (
        <div className="popup">
          <div className="popupCard">

            <div
              className="closeIcon"
              onClick={() => setSelectedCoupon(null)}
            >
              ✕
            </div>

            <h1 className="shopName">
              {selectedCoupon.location.locationName}
            </h1>

            <h2 className="couponName">
              {selectedCoupon.coupon_name}
            </h2>

            <div className="section">
              <p className="label">ส่วนลด</p>
              <div className="discountBox">
                ลด {selectedCoupon.discount_value} บาท
              </div>
            </div>

            <div className="section">
              <p className="label">รายละเอียด</p>
              <p className="desc">{selectedCoupon.description}</p>
            </div>

            <div className="section">
              <p className="label">วันหมดอายุ</p>
              <p className="expiry">{selectedCoupon.expiry_date}</p>
            </div>

            <button
              className="redeemBtn"
              onClick={() => handleClaim(selectedCoupon)}
            >
              <Icon icon="mdi:trophy" width="18" />
              แลก {selectedCoupon.points_required} คะแนน
            </button>

          </div>
        </div>
      )}

      <style jsx global>{`
                body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

        .page{
            background:#fff;
            min-height:100vh;
            padding:16px;

            margin:0;              /* ⭐ mobile ไม่มีขอบ */
            max-width:100%;
            border-radius:0;
            }

        .header {
            position: relative;
            display: flex;
            align-items: center;
            height: 50px; /* เพิ่ม balance */
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
            width:42px;
            height:42px;
            background:#6b4729;
            color:white;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:2; /* กันโดนทับ */
            }

        .tabs {
            position: absolute;
            left: 50%;
            top: 50%; /* 🔥 เพิ่ม */
            transform: translate(-50%, -50%); /* 🔥 เปลี่ยน */

            display: flex;
            gap: 20px;
            font-weight: 600;

            align-items: center; /* 🔥 เพิ่ม */
            }

            .tabs span {
            white-space: nowrap; /* 🔥 กันตก */
            line-height: 1;       /* 🔥 กันเพี้ยน */
            }

        .tabs span {
            color: #aaa;
            padding-bottom: 6px;
            }

            .tabs .active {
            color: #000;
            border-bottom: 2px solid #000;
            }

        .balanceBox{
        display:flex;
        justify-content:center;
        align-items:center;
        gap:10px;
        font-size:22px;
        font-weight:700;
        margin:18px 0;
        }

        /* 🔥 ถ้วยใหญ่ขึ้น + เด่น */
        .trophyIcon{
        font-size:28px;
        color:#facc15;
        }

        /* 🔥 ตัวเลขใหญ่กว่า */
        .balanceValue{
        font-size:28px;
        font-weight:800;
        }

        .list { display:flex; flex-direction:column; gap:16px; }

        .card { position:relative; overflow:hidden; }

        .card img {
          width:100%; height:170px; object-fit:cover;
        }

        .overlay {
          position:absolute; inset:0;
          padding:12px;
          background:linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0));
          color:white;
          display:flex;
          justify-content:flex-end;
        }

        .bottomRow {
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          width:100%;
        }

        .textBox { flex:1; }

        .textBox h2 { font-size:16px; font-weight:700; }
        .textBox p {
          font-size:13px;
          opacity:0.9;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }

        .pointBtn {
          background:#facc15;
          color:white;
          font-weight:700;
          padding:6px 10px;
          display:flex;
          align-items:center;
          gap:4px;
          min-width:70px;
          justify-content:center;
        }

        .claimed {
          background:#ddd;
          padding:6px 10px;
          font-weight:600;
          min-width:70px;
          text-align:center;
        }

        .showMoreWrap { display:flex; justify-content:center; margin-top:20px; }
        .showMore {
          background:#6b4729;
          color:white;
          padding:10px 22px;
          border-radius:30px;
        }

        /* 🔥 POPUP */
        .popup {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.6);
          display:flex;
          justify-content:center;
          align-items:center;
          backdrop-filter:blur(6px);
        }

        .popupCard {
          position:relative;
          background:white;
          padding:22px;
          border-radius:20px;
          width:85%;
          max-width:340px;
          box-shadow:0 12px 40px rgba(0,0,0,0.25);
        }

        .closeIcon {
          position:absolute;
          top:12px;
          right:14px;
          font-size:18px;
          cursor:pointer;
          color:#999;
        }

        .shopName { font-size:18px; font-weight:800; }
        .couponName { font-size:14px; color:#666; margin-bottom:12px; }

        .discountBox {
            background: #fff7cc;       /* 🔥 สีอ่อน */
            border: 1px solid #facc15;

            padding: 10px;
            border-radius: 10px;

            text-align: center;
            font-weight: 700;

            color: #333;
            }

        .section { margin-bottom:12px; }
        .label { font-size:12px; color:#888; }
        .desc { font-size:13px; color:#444; }
        .expiry { font-size:13px; font-weight:500; }

        .redeemBtn {
            background: #facc15;
            border: none;

            padding: 12px;
            width: 100%;
            border-radius: 12px;

            font-weight: 800;
            font-size: 15px;

            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;

            box-shadow: 0 6px 15px rgba(0,0,0,0.2);
            }

        .bottomNav {
          position:fixed;
          bottom:0; left:0; right:0;
          height:70px;
          background:#6b4729;
          display:flex;
          justify-content:space-around;
          align-items:center;
          color:white;
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
  
        .navItem { text-align:center; font-size:11px; }

        .scan {
          width:60px; height:60px;
          background:#ffcc00;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          margin-top:-30px;
        }
          /* desktop เท่านั้น */
            @media(min-width:1024px){
            .page{
                max-width:1100px;
                margin:40px auto;
                border-radius:20px;
                overflow:hidden;
            }
            }
      `}</style>
    </div>
  );
}