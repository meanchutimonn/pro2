"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


export default function HomePage() {

  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(2);

  // ✅ เพิ่ม State สำหรับคุม Popup
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  // ✅ State สำหรับจุดแจ้งเตือนสีแดง
  const [hasNewNotification, setHasNewNotification] = useState(true);

  /* banner slider */
  const banners = [
    "/photo/cafacontent.png",
    "/photo/foodcontent.png"
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 11) return "สวัสดีตอนเช้า";
    if (hour < 14) return "สวัสดีตอนสาย";
    if (hour < 18) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;

    // 👉 ปัดซ้าย
    if (distance > minSwipeDistance) {
      setCurrentBanner((prev) =>
        prev === banners.length - 1 ? 0 : prev + 1
      );
    }

    // 👉 ปัดขวา
    if (distance < -minSwipeDistance) {
      setCurrentBanner((prev) =>
        prev === 0 ? banners.length - 1 : prev - 1
      );
    }
  };

  const [currentBanner, setCurrentBanner] = useState(0);

  /* LOAD FIREBASE */
  const loadData = async () => {

    const couponSnap = await getDocs(collection(db, "coupon"));
    setCoupons(couponSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    const locationSnap = await getDocs(collection(db, "locations"));
    setLocations(locationSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    const catSnap = await getDocs(collection(db, "category"));
    setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

  };


  /* 🔥 FIX LOGIN: ไม่บังคับ login แล้ว */
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (user) {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setUserData(snap.data());
        }
      } else {
        setUserData(null); // ✅ ไม่ login ก็อยู่หน้าได้
      }

    });

    return () => unsubscribe();
  }, []);

  // ✅ ฟังก์ชันแลกคูปอง
  const handleClaim = async (coupon: any) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนแลกคูปอง");
      router.push("/login");
      return;
    }

    // ดึงคะแนนล่าสุดจาก DB
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const currentBalance = userDoc.data()?.balance || 0;

    if (currentBalance < Number(coupon.points_required)) {
      alert("คะแนนของคุณไม่เพียงพอ");
      return;
    }

    try {
      // 1. หักคะแนน
      await updateDoc(doc(db, "users", user.uid), {
        balance: currentBalance - Number(coupon.points_required),
      });

      // 2. เพิ่มใน user_coupons
      await addDoc(collection(db, "user_coupons"), {
        user_id: user.uid,
        coupon_id: coupon.id,
        used: false,
        created_at: new Date(),
      });

      alert("แลกคูปองสำเร็จ! ตรวจสอบได้ที่หน้าคูปองของฉัน");
      setSelectedCoupon(null); // ปิด Popup
      window.location.reload(); // รีโหลดเพื่ออัปเดตคะแนนหน้าแรก
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการแลกคูปอง");
    }
  };

  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      return;
    }

    const lower = keyword.toLowerCase();

    // 🔥 หา location
    const locationMatch = locations.filter((l) =>
      l.locationName?.toLowerCase().includes(lower)
    );

    // 🔥 หา category เช่น "วัด"
    const categoryMatch = categories.filter((c) =>
      c.category_name?.toLowerCase().includes(lower)
    );

    // รวมกัน
    const combined = [
      ...locationMatch.map((l) => ({ ...l, type: "location" })),
      ...categoryMatch.map((c) => ({ ...c, type: "category" })),
    ];

    setSuggestions(combined.slice(0, 5)); // จำกัด 5 อัน
  }, [keyword, locations, categories]);

  /* 🔥 handle profile click */
  const handleProfileClick = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("คุณยังไม่ได้เข้าสู่ระบบ");
      router.push("/login");
    } else {
      router.push("/profile");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) =>
        prev === banners.length - 1 ? 0 : prev + 1
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentBanner >= banners.length) {
      setCurrentBanner(0);
    }
  }, [banners.length]);

  useEffect(() => {
    loadData();
  }, []);
  // ✅ filter คูปองที่ยังไม่หมดอายุ
  const validCoupons = coupons.filter(c => {
    if (!c.expiry_date) return true;

    const today = new Date();
    const expiry = new Date(c.expiry_date);

    return expiry >= today;
  });

  // ✅ สุ่มแบบรายสัปดาห์
  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  };

  const weekSeed = getWeekNumber();

  const shuffledCoupons = [...validCoupons].sort(() => {
    return Math.sin(weekSeed) * 10000 - 0.5;
  });

  return (

    <div className="page">
      {/* HEADER - แก้ไข: เพิ่มแจ้งเตือนข้างโปรไฟล์ */}
      <div className="header">
        <div className="headerTop">
          <h1>{getGreeting()}, {userData?.name || "User"} !</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              onClick={() => { setHasNewNotification(false); router.push("/notifications"); }}
            >
              <Icon icon="basil:notification-on-solid" width="28" style={{ color: "#6b4729" }} />
              {hasNewNotification && (
                <span style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '10px', height: '10px', background: 'red',
                  borderRadius: '50%', border: '2px solid white'
                }} />
              )}
            </div>

            {userData?.photoURL ? (
              <img className="avatar" src={userData.photoURL} onClick={handleProfileClick} style={{ cursor: "pointer" }} />
            ) : (
              <div className="avatar placeholder" onClick={handleProfileClick} style={{ cursor: "pointer" }}>
                <Icon icon="mdi:account" width="28" />
              </div>
            )}
          </div>
        </div>

        <div className="balanceContainer">
          <span>คะแนนคงเหลือ :</span>
          <span className="balanceValue">{userData?.balance || 0}</span>
        </div>
      </div>

      {/* SEARCH */}
      <div className="searchBar" style={{ position: "relative" }}>
        <Icon icon="lucide:search" width="18" />

        <input
          placeholder="ค้นหา คาเฟ่ ร้านอาหาร สถานที่..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        {/* 🔥 DROPDOWN */}
        {suggestions.length > 0 && (
          <div className="searchDropdown">
            {suggestions.map((item, i) => (
              <div
                key={i}
                className="searchItem"
                onClick={() => {
                  if (item.type === "location") {
                    router.push(`/cafe/${item.id}`);
                  } else {
                    router.push(`/category/${item.category_name.toLowerCase()}`);
                  }
                }}
              >
                <Icon
                  icon={
                    item.type === "location"
                      ? "mdi:map-marker"
                      : "mdi:shape"
                  }
                  width="18"
                />
                <span>
                  {item.type === "location"
                    ? item.locationName
                    : item.category_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BANNER */}
      <div
        className="banner"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img src={banners[currentBanner]} />


        <div className="dots">
          {banners.map((_, i) => (
            <span key={i} className={i === currentBanner ? "active" : ""} />
          ))}
        </div>
      </div>

      {/* HOT DEALS */}
      <div className="sectionHeader">
        <h3 style={{ fontSize: "20px", fontWeight: "bold" }}>
          ดีลพิเศษ
        </h3>
        <span
          style={{ cursor: "pointer" }}
          onClick={() => setShowCount(prev => prev + 2)}
        >
          ดูเพิ่มเติม
        </span>
      </div>

      <div className="hotDeals">
        {shuffledCoupons.slice(0, showCount).map((c) => {

          const location = locations.find(
            (l) => l.id === c.location_id
          );

          if (!location) return null;

          return (
            <div
              className="dealCard"
              key={c.id}
              onClick={() => setSelectedCoupon({ ...c, location })} // 🔥 คลิกแล้วเปิด Popup
              style={{ cursor: "pointer" }}
            >
              <img src={location.mainImage} />

              <div className="dealText">
                <h2>
                  {c.discount_type === "baht"
                    ? `${c.discount_value}฿ off`
                    : `${c.discount_value}% off`}
                </h2>

                <p>{location.locationName}</p>
                <span style={{ fontSize: '11px', opacity: 0.9 }}>ใช้ {c.points_required} แต้ม</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* CATEGORIES */}
      <h3 style={{ fontSize: "20px", fontWeight: "bold" }}>
        <br></br>หมวดหมู่
      </h3>

      <div className="categories">
        {categories
          .sort((a, b) => {
            const order = ["cafe", "food", "temple", "sight"];
            return order.indexOf(a.category_name?.toLowerCase().trim())
              - order.indexOf(b.category_name?.toLowerCase().trim());
          })
          .map((c) => {

            const name = c.category_name?.toLowerCase().trim();

            const displayName =
              name === "sight"
                ? "Market"
                : c.category_name;

            let iconName = "maki:cafe";

            if (name === "cafe") iconName = "mdi:coffee";
            else if (name === "food") iconName = "mdi:silverware-fork-knife";
            else if (name === "temple") iconName = "mdi:temple-buddhist";
            else if (name === "sight") iconName = "mdi:storefront";

            return (
              <div
                key={c.id}
                className="catItem"
                onClick={() => {
                  router.push(`/category/${c.category_name.toLowerCase().trim()}`);
                }}
              >
                <div className="catCircle">
                  <Icon icon={iconName} width="32" />
                </div>
                <p>{displayName}</p>
              </div>
            )
          })}
      </div>

      {/* TRIP */}
      <div
        className="tripBanner"
        onClick={() => router.push("/trip")}
        style={{ cursor: "pointer" }}
      >
        <img src="/photo/tripextra.png" />

        <div className="tripText">
          <h2>ทริปพิเศษ</h2>
          <h2>รับคะแนน 2 เท่า</h2>

          <div className="arrowInside">
            <Icon icon="lucide:chevron-right" width="26" />
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="bottomNav">

        <div className="navItem">
          <Icon icon="material-symbols-light:home-rounded" width="28" />
          <p>หน้าหลัก</p>
        </div>

        <div
          className="navItem"
          onClick={() => router.push("/coupon")}
        >
          <Icon icon="mdi:coupon-outline" width="26" />
          <p>คูปอง</p>
        </div>

        <div className="scan" onClick={() => router.push("/scan")}>
          <Icon icon="tabler:qrcode" width="30" />
        </div>

        <div
          className="navItem"
          onClick={() => router.push("/game")}
        >
          <Icon icon="icon-park-solid:game-three" width="26" />
          <p>เกม</p>
        </div>

        {/* 🔥 แทนที่แจ้งเตือนด้วย Mission */}
        <div className="navItem" onClick={() => router.push("/mission")}>
          <Icon icon="flowbite:clipboard-list-solid" width="26" />
          <p>Mission</p>
        </div>
      </div>


      {/* 🔥 Popup แลกคูปอง */}
      {selectedCoupon && (
        <div className="popupOverlay" onClick={() => setSelectedCoupon(null)}>
          <div className="popupCard" onClick={(e) => e.stopPropagation()}>
            <div className="closeBtn" onClick={() => setSelectedCoupon(null)}>✕</div>

            <h1 className="popupShopName">{selectedCoupon.location.locationName}</h1>
            <h2 className="popupCouponName">{selectedCoupon.coupon_name || "ส่วนลดพิเศษ"}</h2>

            <div className="popupSection">
              <p className="popupLabel">ส่วนลด</p>
              <div className="popupDiscountBox">
                ลด {selectedCoupon.discount_value} {selectedCoupon.discount_type === "baht" ? "บาท" : "%"}
              </div>
            </div>

            <div className="popupSection">
              <p className="popupLabel">รายละเอียด</p>
              <p className="popupDesc">{selectedCoupon.description}</p>
            </div>

            <div className="popupSection">
              <p className="popupLabel">วันหมดอายุ</p>
              <p className="popupExpiry">{selectedCoupon.expiry_date}</p>
            </div>

            <button className="confirmRedeemBtn" onClick={() => handleClaim(selectedCoupon)}>
              <Icon icon="mdi:trophy" width="18" style={{ marginRight: '8px' }} />
              แลก {selectedCoupon.points_required} คะแนน
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`

/* 🌰 พื้นหลังนอก = น้ำตาล */
body{
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

/* PAGE */
.page{
  padding:20px;
  background:#fff;
  min-height:100vh;
  padding-bottom:90px;
  font-family:sans-serif;

  border-radius:0;   /* ✅ mobile = ไม่มีขอบ */
  margin:0;          /* ✅ mobile = เต็มจอ */
}

.avatar{
  width:55px;
  height:55px;
  border-radius:50%;
  object-fit:cover;
}

.placeholder{
  background:#eee;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#999;
  border:2px solid #ddd;
}

/* SEARCH */
.searchBar{
margin:18px 0;
background:white;
border-radius:30px;
padding:12px 16px;
display:flex;
align-items:center;
gap:10px;
border:1px solid #ddd;
}

.searchBar input{
border:none;
outline:none;
flex:1;
}

/* BANNER */
.banner{
position:relative;
border-radius:14px;
overflow:hidden;
}

.banner img{
width:100%;
object-fit:cover;
}

.bannerText{
position:absolute;
bottom:20px;
left:20px;
color:white;
}

.dots{
position:absolute;
bottom:10px;
left:50%;
transform:translateX(-50%);
display:flex;
gap:6px;
}

.dots span{
  width:10px;
  height:10px;
  background:#ddd;
  border-radius:50%;
  transition: all 0.3s ease;
}

/* 🔥 ตัวที่ active */
.dots .active{
  width:20px;              /* ✅ ยาว */
  height:12px;
  border-radius:20px;      /* ✅ วงรี */
  background:#a67c52;      /* ปรับสีตามที่หนูใช้ */
}

/* HOT DEALS */
.sectionHeader{
margin-top:20px;
display:flex;
justify-content:space-between;
}

.hotDeals{
margin-top:10px;
display:grid;
grid-template-columns:1fr 1fr;
gap:10px;
}

.dealCard{
position:relative;
border-radius:10px;
overflow:hidden;
transition: 0.2s;
}
.dealCard:active { transform: scale(0.96); }

.dealCard img{
width:100%;
height:120px;
object-fit:cover;
}

.dealText{
position:absolute;
bottom:10px;
left:10px;
color:white;
z-index:2;
}

/* CATEGORIES */
.categoryTitle{
margin-top:20px;
}

.categories{
display:flex;
justify-content:space-between;
margin-top:12px;
flex-wrap:wrap;
gap:10px;
}

.catItem{
text-align:center;
width:70px;
}

.catCircle{
width:70px;
height:70px;
background:#6b4729;
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
color:white;
margin:auto;
}

/* TRIP */
.tripBanner{
margin-top:20px;
position:relative;
border-radius:12px;
overflow:hidden;
}

.tripBanner img{
width:100%;
object-fit:cover;
}

.tripText{
position:absolute;
left:20px;
top:25px;
color:white;
display:flex;
flex-direction:column;
gap:6px;
}

.arrowInside{
margin-top:8px;
width:38px;
height:38px;
background:rgba(255,255,255,0.3);
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
color:white;
backdrop-filter:blur(6px);
}

/* NAV */
.bottomNav{
position:fixed;
bottom:0;
left:0;
right:0;
height:70px;
background:#6b4729;
display:flex;
align-items:center;
justify-content:space-around;
color:white;
z-index:9999;
}

.navItem{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  font-size:11px;
}

.scan{
width:60px;
height:60px;
background:#ffcc00;
border-radius:50%;
display:flex;
align-items:center;
justify-content:center;
margin-top:-30px;
}

@media(max-width:600px){

/* ===== HOT DEAL (แก้ใหม่ทั้งหมด) ===== */
.hotDeals{
display:flex;
gap:12px;
overflow-x:auto;
padding-bottom:10px;
}

.hotDeals::-webkit-scrollbar{
display:none;
}

.dealCard{
min-width:220px;   /* ✅ สำคัญมาก */
height:120px;
flex-shrink:0;
border-radius:10px;
}

.dealCard img{
width:100%;
height:100%;
object-fit:cover;
}

.dealText{
bottom:10px;
left:10px;
right:10px;
}

.dealText h2{
font-size:28px;   /* ✅ ใหญ่แบบ mock */
font-weight:800;
}

.dealText p{
font-size:14px;
font-weight:700;
margin-top:-4px;
}



/* ===== CATEGORY ===== */
.categories{
gap:16px;
padding-left:6px;
justify-content:flex-start;
}

.catCircle{
width:60px;
height:60px;
}

.catItem p{
font-size:12px;
}


.tripText h2{
  font-size:28px;     /* 🔥 ใหญ่ขึ้น */
  font-weight:900;    /* 🔥 หนามาก */
  line-height:1.2;
  letter-spacing:0.5px; /* ✨ ดู premium */
    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

}

/* DESKTOP */
@media(min-width:1024px){
  .page{
    max-width:1100px;
    margin:40px auto;          /* ✅ ทำให้เห็นขอบน้ำตาล */
    border-radius:20px;        /* ✅ โค้ง */
    box-shadow:0 0 20px rgba(0,0,0,0.25);
    overflow:hidden;
  }
     .dealCard{
    height:260px;   /* 🔥 ปรับตามใจได้เลย */
  }

  .dealCard img{
    height:100%;
  }

  .dealText h2{
    font-size:54px;   /* 🔥 ใหญ่มาก */
    font-weight:900;
    line-height:1;
  }

    .tripText h2{
    font-size:36px;    /* 🔥 ใหญ่ขึ้นใน desktop */
    font-weight:900;
    line-height:1.2;
    letter-spacing:0.5px;
    text-shadow: 0 3px 10px rgba(0,0,0,0.4);
  }
}
  


.categories{
justify-content:flex-start;   /* ไม่กระจายแล้ว */
gap:25px;                     /* กำหนดระยะห่างเอง */
}

.catItem{
width:auto;                   /* ไม่ fix 70px */
}

}


.banner img{
height:250px;
}



.dealCard::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  z-index:1;
}

  /* ===== SEARCH ===== */


.searchItem{
  display:flex;
  align-items:center;
  gap:10px;
  padding:12px;
  cursor:pointer;
}

.searchItem:hover{
  background:#f5f5f5;
}
.searchBar{
  position:relative;
  width:100%;
  max-width:600px;
  margin:20px auto; 
}

.searchDropdown{
  position:absolute;
  top:110%;
  left:0;
  width:100%;

  background:white;
  border-radius:12px;
  box-shadow:0 5px 20px rgba(0,0,0,0.15);
  z-index:999;
}

.tripBanner img{
  height: clamp(160px, 25vw, 260px);
  object-fit: cover;
}

.banner img{
  height: clamp(150px, 25vw, 310px);
  object-fit: cover;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.headerTop {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.headerTop h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.balanceContainer {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 480px) {
  .headerTop h1 {
    font-size: 22px;
  }
}
  
/* 🔥 POPUP CSS */
.popupOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); }
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
.confirmRedeemBtn { background: #facc15; color: white; border: none; width: 100%; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 16px; margin-top: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.confirmRedeemBtn:active { transform: scale(0.97); }

`}</style>

    </div>
  );
}