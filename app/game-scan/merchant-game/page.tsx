"use client";

import React, { useEffect, useState } from "react";
import { Pause } from "lucide-react";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { query, where } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { collection, getDocs, addDoc, doc, updateDoc, increment } from "firebase/firestore";


export default function MatchThePairGame() {

  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [locationPoints, setLocationPoints] = useState(10);

  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);

  const addPointsToUser = async (points: number) => {
    const user = getAuth().currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    await updateDoc(ref, {
      balance: increment(points),
    });
  };

  const [locationId, setLocationId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("merchantId");
    setMerchantId(id);
    if (id) {
      setLocationId(id);
    }
  }, []);

  const [startTime, setStartTime] = useState<number | null>(null);

  const [showStart, setShowStart] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  const router = useRouter();

  const [confirmQuit, setConfirmQuit] = useState(false);

  const [alreadyChecked, setAlreadyChecked] = useState(false);

  const [showResult, setShowResult] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const scoreRef = React.useRef(0); // เก็บแต้มแบบเรียลไทม์ไว้ใช้ตอนบันทึก
  const saveLock = React.useRef(false); // สวิตช์ล็อกกันบันทึกซ้ำ (หัวใจสำคัญ)



  // 🔥 โหลดรูปจาก DB
  useEffect(() => {
    const loadImages = async () => {

      const snap = await getDocs(collection(db, "locations"));

      let images: string[] = [];

      snap.forEach(doc => {
        const data = doc.data();

        if (data.mainImage) images.push(data.mainImage);
        if (data.extraImages) images.push(...data.extraImages);
      });

      if (images.length < 12) {
        console.log("รูปไม่พอ ต้องมีอย่างน้อย 12 รูป");
        return;
      }

      const selected = images.sort(() => 0.5 - Math.random()).slice(0, 12);

      const pairs = [...selected, ...selected]
        .sort(() => 0.5 - Math.random())
        .map((img, i) => ({ id: i, img }));

      setCards(pairs);
    };

    loadImages();
  }, [locationId]);



  // 🚀 start + countdown
  const startGame = () => {
    if (cards.length === 0) {
      alert("กำลังโหลดรูป กรุณารอสักครู่");
      return;
    }
    setShowStart(false);
    setCountdown(3);

    let c = 3;

    const interval = setInterval(() => {
      c--;

      if (c === 0) {
        clearInterval(interval);
        setCountdown(null);

        setStarted(true);
        setStartTime(Date.now());

        setFlipped(cards.map((_, i) => i));
        setTimeout(() => setFlipped([]), 1000);

      } else {
        setCountdown(c);
      }

    }, 1000);
  };

  useEffect(() => {
    const loadPoints = async () => {
      if (!locationId) return;

      const ref = doc(db, "locations", locationId);
      const snap = await getDocs(collection(db, "locations"));

      const location = snap.docs.find(doc => doc.id === locationId);
      if (!location) return;

      const data = location.data();

      let pts = 10;

      if (
        data.category?.toLowerCase().trim() !== "temple" &&
        data.category?.toLowerCase().trim() !== "market"
      ) {
        pts = Math.random() > 0.5 ? 5 : 10;
      }

      setLocationPoints(pts);
    };

    loadPoints();
  }, [locationId]);

  useEffect(() => {

    if (!locationId) return;

    const checkPlayed = async () => {

      const user = getAuth().currentUser;
      if (!user) return;


      if (!locationId || !user) return;

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok"
      });

      const q = query(
        collection(db, "game_records"),
        where("user_id", "==", user.uid),
        where("location_id", "==", locationId)
      );

      const snap = await getDocs(q);

      const alreadyPlayed = snap.docs.some(doc => {
        const data = doc.data();

        if (!data.createdAt) return false;

        let playDate = "";

        if (data.createdAt?.toDate) {
          playDate = data.createdAt.toDate().toLocaleDateString("en-CA", {
            timeZone: "Asia/Bangkok"
          });
        } else {
          playDate = new Date(data.createdAt).toLocaleDateString("en-CA", {
            timeZone: "Asia/Bangkok"
          });
        }

        return playDate === today;
      });

      if (alreadyPlayed && !alreadyChecked) {   // ✅ ย้ายมาเช็คตรงนี้แทน
        setAlreadyChecked(true);
        alert("คุณเล่นเกมนี้ไปแล้วในสัปดาห์นี้");
        router.push("/scan");
      }
    };

    checkPlayed();

  }, [locationId, alreadyChecked]);


  // ⏱ timer
  useEffect(() => {
    // ถ้าเริ่มนับถอยหลังไปบันทึกแล้ว (saveLock) ให้หยุด Timer ทันที
    if (!started || paused || saveLock.current) return;

    const timer = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // เช็คอีกรอบก่อนเรียก เผื่อวินาทีนั้นเราจับคู่ครบพอดี
          if (!saveLock.current) finishGame(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, paused]);

  // 🏁 จบก่อนเวลา
  useEffect(() => {
    if (score === 12 && started) {
      finishGame(true);
    }
  }, [score, started]);

  // 🎮 flip
  // 🎮 flip
  const handleFlip = (i: number) => {
    // เพิ่ม saveLock.current เข้าไปเช็คด้วย เพื่อไม่ให้กดเล่นต่อได้ถ้าเกมกำลังจะบันทึก
    if (paused || flipped.length === 2 || flipped.includes(i) || removed.includes(i) || saveLock.current) return;

    const newFlip = [...flipped, i];
    setFlipped(newFlip);

    if (newFlip.length === 2) {
      const [a, b] = newFlip;
      if (cards[a].img === cards[b].img) {
        // อัปเดตแต้มเข้า Ref ทันทีเพื่อให้ค่าล่าสุดพร้อมบันทึก
        const nextScore = score + 1;
        setScore(nextScore);
        scoreRef.current = nextScore;

        setTimeout(() => {
          setRemoved(prev => [...prev, a, b]);
          setFlipped([]);
        }, 400);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  // 💾 save DB
  const finishGame = async (completed: boolean) => {
    // 🛑 บรรทัดนี้คือ "ยามเฝ้าประตู" ถ้ามีคนเข้าไปแล้ว คนที่สองจะโดนถีบออกทันที
    if (saveLock.current) return;
    saveLock.current = true;

    setIsSaving(true);
    setStarted(false);

    const user = getAuth().currentUser;
    const timeUsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 60;



    // บังคับคะแนน: ถ้าชนะ (completed=true) ให้เป็น 12 เสมอ ไม่ต้องรอ State
    const finalScoreValue = completed ? 12 : scoreRef.current;
    let rewardPoints = 0;

    rewardPoints = locationPoints; // 🎯 ได้เต็มเสมอ แค่เล่นก็ได้

    setFinalTime(timeUsed);
    setFinalScore(finalScoreValue);
    setShowResult(true);

    try {
      await addDoc(collection(db, "game_records"), {
        user_id: user?.uid || "guest",
        location_id: locationId,
        game_id: "match_pair",
        score: Number(finalScoreValue),
        time_used: timeUsed,
        completed: Boolean(completed),
        createdAt: serverTimestamp()
      });
      await addPointsToUser(rewardPoints);
      console.log("บันทึกเรียบร้อย (ครั้งเดียว)");
    } catch (err) {
      console.error("Save error:", err);
      // ถ้า Error จริงๆ ถึงจะปลดล็อกให้ลองใหม่ได้
      saveLock.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="page">

      {/* HEADER */}
      <header className="py-4 border-b border-gray-200">
        <h1 className="text-center text-xl font-bold">Match The Pair</h1>
      </header>

      {/* STATS */}

      <div className="relative flex border-b border-gray-200 min-h-[100px]">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-bold">เวลาคงเหลือ</span>
          <div className="text-3xl font-bold">
            00 : {time.toString().padStart(2, "0")}
          </div>
        </div>

        {/* RIGHT BOX */}
        <div className="ml-auto bg-[#2D70B3] text-white px-8 py-4 flex flex-col items-center justify-center z-10">
          <span className="text-sm font-bold">คู่ที่จับได้</span>
          <span className="text-3xl font-bold">
            {removed.length / 2}/12
          </span>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="w-full h-2 bg-gray-200">
        <div
          className="h-full bg-[#FF8A8A]"
          style={{ width: `${((removed.length / 2) / 12) * 100}%` }}
        />
      </div>

      {/* GRID */}
      <div className="p-6 flex items-center justify-center">
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 w-full max-w-4xl mx-auto">
          {cards.map((card, i) => {

            const isFlipped = flipped.includes(i);
            const isRemoved = removed.includes(i);

            return (
              <div
                key={i}
                className="cardWrap aspect-square"
                onClick={() => handleFlip(i)}
              >
                {isRemoved ? (
                  <div />
                ) : (
                  <div className={`card ${isFlipped ? "flip" : ""}`}>
                    <div className="front" />
                    <div className="back">
                      <img src={card.img} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>

      {/* PAUSE */}
      <div className="p-6 flex justify-center">
        <Pause size={40} onClick={() => setPaused(true)} />
      </div>

      {/* START POPUP */}
      {showStart && (
        <div className="overlay">
          <div className="popup startBox">

            <div className="close" onClick={() => router.push("/scan")}>✕</div>

            <h2>พร้อมหรือยัง?</h2>
            <p>คุณมีโอกาสเพียงครั้งเดียวในวันนี้</p>

            <button
              className="startBtn"
              onClick={startGame}
              disabled={cards.length === 0}
            >
              เริ่มเกม
            </button>

          </div>
        </div>
      )}

      {/* COUNTDOWN */}
      {countdown && (
        <div className="countdown">{countdown}</div>
      )}

      {confirmQuit && (
        <div className="overlay">
          <div className="popup danger">

            <h2>ออกจากเกม?</h2>

            <p>
              คุณจะไม่ได้รับคะแนน และจะไม่ถูกจัดอันดับ
            </p>

            <button
              className="dangerBtn"
              onClick={() => {
                router.push("/scan");
              }}
            >
              ยืนยันออก
            </button>

            <button onClick={() => setConfirmQuit(false)}>
              กลับไปเล่นต่อ
            </button>

          </div>
        </div>
      )}

      {/* PAUSE POPUP */}
      {paused && !confirmQuit && (
        <div className="overlay">
          <div className="popup pauseBox">

            <div className="close" onClick={() => setPaused(false)}>✕</div>

            <h2>Pause</h2>

            <button
              className="resumeBtn"
              onClick={() => setPaused(false)}
            >
              resume
            </button>

            <button
              className="quitBtn"
              onClick={() => setConfirmQuit(true)}
            >
              quit
            </button>

          </div>
        </div>
      )}

      {showResult && (
        <div className="overlay">
          <div className="popup resultBox2">

            <h2 className="title">ยินดีด้วย!</h2>

            <div className="resultCard">
              <p>⏱ เวลา</p>
              <h1>{finalTime}s</h1>
            </div>

            <div className="resultCard">
              <p>🧠 จำนวนคู่</p>
              <h1>{removed.length / 2}/12</h1>
            </div>

            <div className="btnGroup">
              <button
                className="mainBtn"
                onClick={() => router.push(`/leaderboard/${locationId}`)}
              >
                ดูอันดับ
              </button>

              <button
                className="subBtn"
                onClick={() => router.push("/scan")}
              >
                กลับหน้าแรก
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STYLE */}
      <style jsx>{`

      .startBox{
  background:linear-gradient(135deg,#6b4729,#8a5a35);
  color:white;
}

.startBtn{
  background:#F2C94C;
  color:black;
  padding:12px 30px;
  border-radius:20px;
  font-weight:bold;
}

.danger{
  background:#fff;
}

.dangerBtn{
  background:#c44d58;
  color:white;
  padding:10px 20px;
  border-radius:20px;
}

        .cardWrap{
          perspective:1000px;
        }

        .card{
          width:100%;
          height:100%;
          position:relative;
          transform-style:preserve-3d;
          transition:0.5s;
        }

        .flip{
          transform:rotateY(180deg);
        }

        .front,.back{
          position:absolute;
          width:100%;
          height:100%;
          border-radius:12px;
          backface-visibility:hidden;
        }

        .front{background:#6D4326;}

        .back{
          transform:rotateY(180deg);
          overflow:hidden;
        }

        .back img{
          width:100%;
          height:100%;
          object-fit:cover;
        }

        .overlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.5);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:999;
        }

        .popup{
          background:#6b8fb3;
          padding:25px;
          border-radius:20px;
          text-align:center;
          position:relative;
        }

        .popup button{
          margin-top:10px;
          padding:10px 20px;
          border-radius:20px;
        }

        .close{
          position:absolute;
          right:-10px;
          top:-10px;
          background:red;
          width:30px;
          height:30px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
        }

        .countdown{
          position:fixed;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:100px;
          background:rgba(0,0,0,0.7);
          color:white;
          z-index:1000;
        }

        .pauseBox{
  background:#6b8fb3;
  width:260px;
  border-radius:20px;
  padding:25px;
  text-align:center;
  position:relative;
}

.pauseBox h2{
  font-size:22px;
  font-weight:bold;
  margin-bottom:20px;
}

/* ปุ่ม resume */
.resumeBtn{
  background:#9DB36A;
  color:black;
  width:100%;
  padding:12px;
  border-radius:20px;
  font-weight:bold;
  margin-bottom:15px;
}

/* ปุ่ม quit */
.quitBtn{
  background:#C44D58;
  color:black;
  width:100%;
  padding:12px;
  border-radius:20px;
  font-weight:bold;
}
  /* 🌰 พื้นหลังนอก */
:global(body){
background-image: url('/photo/background.jpg'); /* 🔥 ใส่รูป */
  background-size: cover;       /* เต็มจอ */
  background-position: center;  /* กลาง */
  background-repeat: no-repeat; /* ไม่ซ้ำ */
}

/* PAGE */
.page{
  background:#fff;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  font-family:sans-serif;
}

/* DESKTOP */
@media(min-width:1024px){
  @media(min-width:1024px){
  .page{
    max-width:1100px;   /* ✅ กว้างขึ้น */
    margin:40px auto;
    border-radius:20px;
    box-shadow:0 0 20px rgba(0,0,0,0.25);
    overflow:hidden;
  }
}
}
.resultBox{
  background:#6B91B8;
  color:white;
  width:260px;
  border-radius:20px;
  padding:25px;
  text-align:center;
}

.resultBox h1{
  font-size:32px;
  margin:10px 0;
}

.resultBtn{
  background:#F2C94C;
  color:black;
  width:100%;
  padding:12px;
  border-radius:20px;
  font-weight:bold;
  margin-top:15px;
}

.resultBtn.secondary{
  background:white;
}

.resultBox2{
  background:linear-gradient(135deg,#6B91B8,#4e6f8f);
  color:white;
  width:280px;
  border-radius:24px;
  padding:30px 20px;
  text-align:center;
  animation:pop 0.3s ease;
}

.title{
  font-size:24px;
  font-weight:bold;
  margin-bottom:20px;
}

.resultCard{
  background:rgba(255,255,255,0.15);
  border-radius:15px;
  padding:15px;
  margin-bottom:15px;
}

.resultCard h1{
  font-size:28px;
  margin-top:5px;
}

.btnGroup{
  margin-top:15px;
  display:flex;
  flex-direction:column;
  gap:10px;
}

.mainBtn{
  background:#F2C94C;
  color:black;
  padding:12px;
  border-radius:20px;
  font-weight:bold;
}

.subBtn{
  background:white;
  color:black;
  padding:12px;
  border-radius:20px;
}

@keyframes pop{
  from{transform:scale(0.8);opacity:0;}
  to{transform:scale(1);opacity:1;}
}

      `}</style>

    </div>
  );
}