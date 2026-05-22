"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Lightbulb, X } from "lucide-react";
import { doc, updateDoc, increment } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { addDoc, serverTimestamp, query, where } from "firebase/firestore";

function AdminGameContent() {
  const [gameState, setGameState] = useState<"start" | "countdown" | "playing">("start");
  const [count, setCount] = useState(3);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setMerchantId(params.get("merchantId"));
    }
  }, []);

  const [question, setQuestion] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [locationPoints, setLocationPoints] = useState(10);

  const [hint, setHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);

  const [timeLeft, setTimeLeft] = useState(30);

  const [showExitPopup, setShowExitPopup] = useState(false);
  const [showHintPopup, setShowHintPopup] = useState(false);

  const [rewarded, setRewarded] = useState(false);

  const [showResultPopup, setShowResultPopup] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [resultType, setResultType] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [showAnswerPopup, setShowAnswerPopup] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // สร้างฟังก์ชันบันทึกประวัติการเล่น
  const saveGameRecord = async () => {
    const user = getAuth().currentUser;
    if (!user || !merchantId) return;

    try {
      await addDoc(collection(db, "game_records"), {
        user_id: user.uid,
        location_id: merchantId,
        game_id: "quiz_game", // ต้องตรงกับที่ใช้เช็คด้านบน
        score: resultType === "correct" ? locationPoints : 0,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Save record error:", err);
    }
  };

  const useHint = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      balance: increment(-5),
    });

    setShowHint(true);
    setUsedHint(true);
    setShowHintPopup(false);
  };



  const addPointsToUser = async (points: number) => {
    const user = getAuth().currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    try {
      await updateDoc(ref, {
        balance: increment(points)
      });
    } catch (err) {
      console.error("add points error:", err);
    }
  };

  useEffect(() => {
    const checkPlayedToday = async () => {
      const user = getAuth().currentUser;
      if (!user || !merchantId) return;

      // 1. กำหนดวันที่ปัจจุบัน (รูปแบบ YYYY-MM-DD) ตามเวลาไทย
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      });

      try {
        // 2. Query หาประวัติการเล่นของ User คนนี้ ที่ร้านนี้
        const q = query(
          collection(db, "game_records"),
          where("user_id", "==", user.uid),
          where("location_id", "==", merchantId),
          where("game_id", "==", "quiz_game") // ตั้งชื่อ ID เกมให้ตรงกับตอนบันทึก
        );

        const snap = await getDocs(q);

        // 3. เช็คว่ามี Record ของวันนี้แล้วหรือยัง
        const played = snap.docs.some((doc) => {
          const data = doc.data();
          if (!data.createdAt) return false;

          const playDate = data.createdAt.toDate
            ? data.createdAt.toDate().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
            : new Date(data.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

          return playDate === today;
        });

        if (played) {
          setAlreadyPlayed(true);
          alert("คุณได้เล่นเกมของสถานที่นี้ไปแล้วในวันนี้ กลับมาใหม่พรุ่งนี้นะคะ!");
          window.location.href = "/"; // ส่งกลับหน้าหลัก
        }
      } catch (err) {
        console.error("Check played error:", err);
      }
    };

    checkPlayedToday();
  }, [merchantId]);



  // ---------------- LOAD DATA ----------------
  useEffect(() => {
    const loadGame = async () => {
      const snap = await getDocs(collection(db, "locations"));

      let locations: any[] = [];

      snap.forEach((doc) => {
        const data = doc.data();

        if (data.category !== "Temple" && data.category !== "Sight") return;
        if (!data.extraImages || data.extraImages.length === 0) return;

        locations.push({
          name: data.locationName,
          images: data.extraImages,
          description: data.description || "",
        });
      });

      const correct =
        locations[Math.floor(Math.random() * locations.length)];

      const randomImage =
        correct.images[Math.floor(Math.random() * correct.images.length)];

      let choices = locations
        .sort(() => 0.5 - Math.random())
        .slice(0, 4)
        .map((l) => l.name);

      if (!choices.includes(correct.name)) {
        choices[0] = correct.name;
      }

      choices = choices.sort(() => 0.5 - Math.random());

      // 🔥 hint กลางประโยค
      const words = correct.description.split(" ");
      const shortHint = words.slice(0, 4).join(" ");

      setQuestion("สถานที่นี้คือที่ไหน?");
      setImageUrl(randomImage);
      setOptions(choices);
      setCorrectAnswer(correct.name);
      setHint(shortHint);
    };

    loadGame();
  }, []);

  useEffect(() => {
    if (!rewarded && resultType) {
      let pts = 0;

      if (resultType === "correct") {
        pts = usedHint
          ? Math.floor(locationPoints / 2)
          : locationPoints;
      }
      else if (resultType === "wrong") {
        pts = usedHint ? 1 : 3;
      }

      if (pts > 0) {
        addPointsToUser(pts);
        saveGameRecord(); // 🔥 เพิ่มบรรทัดนี้
        setRewarded(true);
      }
    }
  }, [resultType, rewarded, locationPoints, usedHint]);

  useEffect(() => {
    const loadPoints = async () => {
      if (!merchantId) return;

      const ref = doc(db, "locations", merchantId);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const data = snap.data();

      let pts = 10;

      // 👉 ใช้ logic ของเธอ
      if (
        data.category?.toLowerCase().trim() !== "temple" &&
        data.category?.toLowerCase().trim() !== "market"
      ) {
        pts = Math.random() > 0.5 ? 5 : 10;
      }

      setLocationPoints(pts);
    };

    loadPoints();
  }, [merchantId]);


  // ---------------- TIMER ----------------
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0 && !isGameOver) {
      const timer = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState, timeLeft, isGameOver]);



  useEffect(() => {
    if (timeLeft === 0 && !selected && !isGameOver) {
      setResultType("timeout");
      setIsGameOver(true); // 🔥 สำคัญมาก
      setShowResultPopup(true);
    }
  }, [timeLeft, selected, isGameOver]);

  const handleAnswer = (answer: string) => {
    if (timeLeft === 0 || isGameOver) return;

    setSelected(answer);

    if (answer === correctAnswer) {
      setResultType("correct");
    } else {
      setResultType("wrong");
    }

    setIsGameOver(true); // 🔥 หยุดเวลา
    setShowResultPopup(true);
  };

  // ---------------- COUNTDOWN ----------------
  useEffect(() => {
    if (gameState === "countdown") {
      const timer = setInterval(() => {
        setCount((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            setGameState("playing");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState]);

  // ---------------- START ----------------
  if (gameState === "start") {
    return (
      <div className="page min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-bold">พร้อมหรือยัง?</h1>

        <button
          onClick={() => setGameState("countdown")}
          className="bg-[#8B5E3C] text-white px-6 py-3 rounded-xl"
        >
          เริ่มเกม
        </button>

        <button
          onClick={() => setShowExitPopup(true)}
          className="text-red-500"
        >
          ออก
        </button>

        {/* EXIT POPUP */}
        {showExitPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-lg">
              <h2 className="font-bold text-lg mb-2">ออกจากเกม?</h2>
              <p className="text-sm text-gray-500 mb-4">
                หากออก คุณจะไม่สามารถเล่นเกมนี้ได้อีก 7 วัน
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitPopup(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-200"
                >
                  ยกเลิก
                </button>

                <button
                  onClick={() => window.history.back()}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white"
                >
                  ออก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }



  // ---------------- COUNTDOWN ----------------
  if (gameState === "countdown") {
    return (
      <div className="page min-h-screen bg-white flex items-center justify-center text-6xl font-bold">
        {count}
      </div>
    );
  }


  // ---------------- GAME ----------------
  return (
    <div className="page min-h-screen bg-white flex flex-col items-center p-4">

      {/* TIMER */}
      <div className="w-full text-right mb-4">
        <p className="text-red-500 text-xl font-bold">{timeLeft}s</p>
      </div>

      {/* QUESTION */}
      <p className="text-xl font-semibold mb-6 text-center">{question}</p>

      {/* IMAGE */}
      <div className="w-full max-w-sm aspect-video rounded-lg overflow-hidden mb-6 shadow">
        {imageUrl && (
          <img src={imageUrl} className="w-full h-full object-cover" />
        )}
      </div>

      {/* HINT BUTTON */}
      <button
        onClick={() => setShowHintPopup(true)}
        disabled={usedHint}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border 
        ${usedHint
            ? "bg-gray-100 text-gray-400 border-gray-200"
            : "bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100"}
        font-semibold shadow-sm transition active:scale-95`}
      >
        <Lightbulb size={18} />
        {usedHint ? "ใช้คำใบ้แล้ว" : "ดูคำใบ้"}
      </button>

      {/* HINT CARD */}
      {showHint && (
        <div className="mt-3 w-full max-w-sm bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 shadow-sm">
          {hint}
        </div>
      )}

      {/* HINT POPUP */}
      {showHintPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-lg">
            <h2 className="font-bold text-lg mb-2">ใช้คำใบ้?</h2>
            <p className="text-sm text-gray-500 mb-4">
              ใช้คำใบ้จะเสีย 5 แต้ม
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowHintPopup(false)}
                className="flex-1 py-2 rounded-xl bg-gray-200"
              >
                ยกเลิก
              </button>

              <button
                onClick={useHint}
                className="flex-1 py-2 rounded-xl bg-purple-500 text-white"
              >
                ใช้คำใบ้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONS */}
      <div className="w-full max-w-sm flex flex-col gap-4 mt-4">
        {options.map((option, index) => {
          let style = "bg-gray-300";

          if (selected || showAnswer) {
            if (option === correctAnswer) style = "bg-green-500 text-white";
            else if (option === selected) style = "bg-red-500 text-white";
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              className={`py-4 rounded-xl font-bold ${style}`}
              disabled={selected !== null || timeLeft === 0 || isGameOver}
            >
              {option}
            </button>

          );

        })}
      </div>

      {/* RESULT */}
      {showResultPopup && resultType === "correct" && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-xl">

            <h2 className="text-green-500 text-xl font-bold mb-2">
              🎉 ถูกต้อง!
            </h2>

            <p className="text-lg mb-4">
              คุณได้ {usedHint ? Math.floor(locationPoints / 2) : locationPoints} คะแนน
            </p>

            <button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-[#8B5E3C] text-white py-2 rounded-xl"
            >
              กลับหน้าหลัก
            </button>

          </div>
        </div>
      )}

      {showResultPopup && resultType === "wrong" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-xl">

            <h2 className="text-red-400 text-lg font-bold mb-2">
              เสียใจด้วยนะคะ 💔
            </h2>

            <p className="text-gray-600 text-sm mb-4">
              คุณตอบผิด
            </p>

            <p className="text-green-600 text-sm mb-2">
              คุณได้ {usedHint ? "1" : "3"} คะแนน 🎉
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResultPopup(false);
                  setShowAnswerPopup(true);
                }}
                className="flex-1 bg-gray-200 py-2 rounded-xl"
              >
                ดูเฉลย
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 bg-[#8B5E3C] text-white py-2 rounded-xl"
              >
                กลับหน้าหลัก
              </button>
            </div>

          </div>
        </div>
      )}

      {showResultPopup && resultType === "timeout" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-xl">

            <h2 className="text-yellow-500 text-lg font-bold mb-2">
              ⏰ หมดเวลา!
            </h2>

            <p className="text-gray-600 text-sm mb-4">
              คุณยังไม่ได้เลือกคำตอบ
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResultPopup(false);
                  setShowAnswerPopup(true);
                }}
                className="flex-1 bg-gray-200 py-2 rounded-xl"
              >
                ดูเฉลย
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 bg-[#8B5E3C] text-white py-2 rounded-xl"
              >
                กลับหน้าหลัก
              </button>
            </div>

          </div>
        </div>
      )}

      {showAnswerPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-xl">

            <h2 className="text-green-600 font-bold text-lg mb-2">
              ✅ คำตอบที่ถูกคือ
            </h2>

            <p className="text-xl font-bold mb-4">
              {correctAnswer}
            </p>

            <button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-[#8B5E3C] text-white py-2 rounded-xl"
            >
              กลับหน้าหลัก
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
  border-radius: 0;
  margin: 0;
}

/* 💻 DESKTOP */
@media(min-width:1024px){
  .page{
    max-width: 1100px;
    margin: 40px auto;
    border-radius: 20px;
    box-shadow: 0 0 20px rgba(0,0,0,0.25);
    overflow: hidden;

    min-height: calc(100vh - 80px);  /* 🔥 แก้ตรงนี้ */
  }
}
`}</style>

    </div>
  );
}

export default AdminGameContent;