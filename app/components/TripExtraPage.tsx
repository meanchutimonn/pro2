"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import TripDetailPage from "@/app/components/TripDetailPage";
import type { TripDetail } from "@/app/components/TripDetailPage";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  runTransaction 
} from "firebase/firestore";

// ── Palette ────────────────────────────────────────────────────────────────────
const W = {
  bg: "#ffffff",
  text: "#000000",
  muted: "#7A7A7A",
  dark: "#614124",
  white: "#FFFFFF",
  lightGray: "#f0f0f0",
};

const trips: (TripDetail & { subtitle: string; image: string })[] = [
  {
    id: 1,
    title: "สงบใจในอาราม",
    subtitle: "ในวันที่ชีวิตหมุนเร็วเกินไปจนเกิดความเหนื่อยล้า เราขอชวนคุณทิ้งความวุ่นวายไว้ข้างหลัง แล้วออกเดินทางไปสัมผัสความสงบภายใน",
    image: "/photo/pointaram.png",
    heroImage: "/photo/temple_trip.png",
    points: 50,
    stops: [],
  },
  {
    id: 2,
    title: "The Green Caffeine Tour",
    subtitle: 'ร่วมเดินทางในทริปพิเศษที่จะพาไป "Hopping" คาเฟ่ที่ดีที่สุดในย่านสามพราน ทริปที่คัดมาแล้วว่าไม่ได้มีดีแค่กาแฟ',
    image: "/photo/green cafe.png",
    heroImage: "/photo/cafe_tour.png",
    points: 50,
    stops: [],
  },
  {
    id: 3,
    title: "One Day Magic Sam Phran",
    subtitle: "มาเปลี่ยนวันว่างธรรมดา ให้เป็นวันแห่งการพักผ่อนที่สามพราน",
    image: "/photo/oneday.png",
    heroImage: "/photo/sampran_trip.png",
    points: 50,
    stops: [],
  },
];

export default function TripExtraPage({ onBack, initialTripId }: { onBack: () => void; initialTripId?: number }) {
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(
    initialTripId ? (trips.find((t) => t.id === initialTripId) ?? null) : null
  );

  const [userLocation, setUserLocation] = useState<{
  lat: number;
  lng: number;
} | null>(null);

  const [randomImages, setRandomImages] = useState<{ temple: string | null; cafe: string | null; all: string | null }>({
    temple: null,
    cafe: null,
    all: null,
  });

    useEffect(() => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition((pos) => {
    setUserLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
  });
}, []);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        let templeImages: string[] = [];
        let cafeImages: string[] = [];
        let allImages: string[] = [];

        snap.forEach((doc) => {
          const data = doc.data();
          if (data.extraImages && Array.isArray(data.extraImages) && data.extraImages.length > 0) {
            if (data.category === "Temple") templeImages.push(...data.extraImages);
            if (data.category === "Cafe") cafeImages.push(...data.extraImages);
            allImages.push(...data.extraImages);
          }
        });

        setRandomImages({
          temple: templeImages.length > 0 ? templeImages[Math.floor(Math.random() * templeImages.length)] : null,
          cafe: cafeImages.length > 0 ? cafeImages[Math.floor(Math.random() * cafeImages.length)] : null,
          all: allImages.length > 0 ? allImages[Math.floor(Math.random() * allImages.length)] : null,
        });
      } catch (error) {
        console.error("Error loading images:", error);
      }
    };
    loadImages();
  }, []);

  if (selectedTrip) {
    return (
      <TripDetailPage
        trip={selectedTrip}
        onBack={() => setSelectedTrip(null)}
        onHome={() => setSelectedTrip(null)}
      />
    );
  }


function getDistanceKm(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLon = (lon2 - lon1) * Math.PI/180;

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2)**2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

  return (
    <div className="page" style={{ width: "100%", minHeight: "100%", background: W.bg, display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: W.white, borderBottom: `1px solid ${W.lightGray}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <button onClick={onBack} style={{ width: 42, height: 42, borderRadius: "50%", background: W.dark, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: W.white }}>
          <Icon icon="lucide:chevron-left" width="22" height="22" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 800, color: W.text }}>Point x2</span>
        <div style={{ width: 42 }} />
      </div>

      {/* Trip List */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: "20px 0", alignItems: "center" }}>
        {trips.map((trip) => {
          // Logic เลือกรูปภาพ
          let bgImage = trip.image; // default fallback
          if (trip.title.includes("อาราม") && randomImages.temple) bgImage = randomImages.temple;
          else if (trip.title.includes("Caffeine") && randomImages.cafe) bgImage = randomImages.cafe;
          else if (trip.title.includes("Magic") && randomImages.all) bgImage = randomImages.all;

          return (
            <div
              key={trip.id}
              onClick={async () => {

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const ref = doc(db, "monthlyTrips", monthKey);

  let data: any;

  await runTransaction(db, async (transaction) => {

    const snap = await transaction.get(ref);

    // ✅ ถ้ามีแล้ว → ใช้เลย
    if (snap.exists() && snap.data()?.data) {
      data = snap.data().data;
      return;
    }

    // 🔥 ถ้ายังไม่มี → สุ่ม
    const locSnap = await getDocs(collection(db, "locations"));

    let all:any[] = [];
    let cafe:any[] = [];
    let temple:any[] = [];

    locSnap.forEach(doc => {
      const d = doc.data();
      const item = { id: doc.id, ...d };

      all.push(item);
      if (d.category === "Cafe") cafe.push(item);
      if (d.category === "Temple") temple.push(item);
    });

    const rand = (arr:any[]) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());

      if (shuffled.length === 0) return [];
      if (shuffled.length >= 5) return shuffled.slice(0, 5);

      let result = [...shuffled];
      while (result.length < 5) {
        result.push(shuffled[result.length % shuffled.length]);
      }
      return result;
    };

    data = {
      Cafeeine: rand(cafe),
      อาราม: rand(temple),
      Magic: rand(all),
    };

    // 🔥 เขียนแบบ transaction (ล็อค)
    transaction.set(ref, {
      month: monthKey,
      data: data
    });
  });

  // 🔥 เลือกหมวด
  let type = "Magic";
  if (trip.title.includes("Caffeine")) type = "Cafeeine";
  else if (trip.title.includes("อาราม")) type = "อาราม";
const stopsRaw = Array.isArray(data[type]) ? data[type] : [];

const newTrip = {
  ...trip,
  stops: stopsRaw.map((item:any, i:number) => {

    let distanceText = "loading...";

    if (
      userLocation &&
      item.latitude &&
      item.longitude
    ) {
      const d = getDistanceKm(
        userLocation.lat,
        userLocation.lng,
        item.latitude,
        item.longitude
      );

      distanceText = d.toFixed(1) + " km";
    }

    return {
      id: i,
      location_id: item.id, // ✅ เพิ่มเพื่อใช้เช็คอินอัตโนมัติ
      locationId: item.id,  // ✅ เพิ่มเผื่อไว้กันเหนียว
      cafeId: item.id,

      name: item.locationName || "ไม่พบชื่อ",

      rating: item.rating ?? 0,
      distance: distanceText,

      description: item.description || "",
      image: item.mainImage || item.extraImages?.[0] || "",
    };
  })
};
  setSelectedTrip(newTrip);
}}
              className="trip-card"
              style={{
                position: "relative",
                width: "90%",
                maxWidth: "420px",
                height: "clamp(200px, 25vw, 320px)",
                cursor: "pointer",
                overflow: "hidden",
                flexShrink: 0
              }}
            >
              {/* Image Layer */}
              <div style={{ 
                position: "absolute", 
                inset: 0, 
                background: `url('${bgImage}') center/cover #555` 
              }} />

              {/* Text Overlay */}
              <div style={{
                position: "absolute", bottom: 0, width: "100%", height: "40%",
                background: "rgba(0, 0, 0, 0.65)", display: "flex", flexDirection: "column",
                justifyContent: "center", padding: "0 16px", boxSizing: "border-box", textAlign: "left"
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: W.white, marginBottom: 2 }}>
                  {trip.title}
                </div>
                <div style={{
                  fontSize: 16, fontFamily: "'Sarabun', sans-serif", color: W.white,
                  lineHeight: "1.2", display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden"
                }}>
                  {trip.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        body{ 
  background-image: url('/photo/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
        .page{ border-radius: 0; margin: 0; }
        @media(min-width:1024px){
          .page{
            max-width: 1100px;
            margin: 40px auto;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(0,0,0,0.25);
            overflow: hidden;
          }
          .trip-card{ max-width: 700px !important; }
        }
      `}</style>
    </div>
  );
}