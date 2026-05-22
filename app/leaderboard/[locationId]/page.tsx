"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Crown } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const LeaderBoard = () => {

  const router = useRouter();
  const params = useParams();
  const locationId = params.locationId as string;

  const [players, setPlayers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {

      // 🔥 โหลด game_records
      const gameSnap = await getDocs(collection(db, "game_records"));

      let scores: any = {};

      gameSnap.forEach(doc => {
        const data = doc.data();

        // ✅ filter ตามเกม + location
        if (
          data.game_id !== "match_pair" ||
          data.location_id !== locationId
        ) return;

        // ✅ เอาคะแนนสูงสุดต่อ user
        if (
          !scores[data.user_id] ||
          data.score > scores[data.user_id].score
        ) {
          scores[data.user_id] = data;
        }
      });

      // 🔥 โหลด users
      const userSnap = await getDocs(collection(db, "users"));

      const usersMap: any = {};
      userSnap.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });

      // 🔥 รวมข้อมูล
      let result = Object.values(scores).map((g: any) => ({
        user_id: g.user_id,
        score: Number(g.score) || 0,
        time_used: g.time_used,
        name: usersMap[g.user_id]?.name || "Unknown",
        photo: usersMap[g.user_id]?.photoURL || "https://ui-avatars.com/api/?name=" + (usersMap[g.user_id]?.name || "U"),
      }));

      // 🔥 sort (คะแนน > เวลา)
      result.sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time_used - b.time_used;
      });

      setPlayers(result);

      // 🔥 current user
      const user = getAuth().currentUser;
      if (user) {
        const me = result.find(p => p.user_id === user.uid);
        setCurrentUser(me);
      }

      // 🔥 ดึงชื่อ location
      const locSnap = await getDocs(collection(db, "locations"));
      locSnap.forEach(doc => {
        if (doc.id === locationId) {
          setLocationName(doc.data().locationName);
        }
      });
    };

    loadLeaderboard();
  }, [locationId]);

  // 🔥 top 3
 const topThree = [
  players[1] || {},
  players[0] || {},
  players[2] || {},
];

  const rankings = players.slice(3);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col font-sans text-gray-900">

      {/* Header */}
      <header className="flex items-center px-4 py-4 border-b border-gray-200">
        <button 
          className="p-2 rounded-full bg-[#6D4326] text-white"
          onClick={() => router.push("/leaderboard")}
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="flex-1 text-center text-xl font-bold mr-10">
          {locationName || "LeaderBoard"}
        </h1>
      </header>

      {/* Top 3 */}
      <div className="px-4 py-8 flex items-end justify-center gap-2">

        {/* 2nd */}
        <div className="bg-[#92B6D1] w-1/3 rounded-2xl p-4 flex flex-col items-center shadow-sm h-48 justify-center">
          <img src={topThree[0]?.photo} className="w-16 h-16 rounded-full mb-2 object-cover"/>
          <span className="font-bold text-lg">2nd</span>
          <span className="font-bold">{topThree[0]?.name}</span>
          <span className="text-xs text-white/80">{topThree[0]?.score || 0} matches</span>
        </div>

        {/* 1st */}
        <div className="bg-[#6B91B8] w-1/3 rounded-2xl p-4 flex flex-col items-center shadow-md h-56 justify-center relative">
          <div className="absolute -top-2 -left-1 rotate-[-20deg]">
            <Crown size={32} className="text-[#F2C94C]" fill="#F2C94C" />
          </div>
          <img src={topThree[1]?.photo} className="w-20 h-20 rounded-full mb-2 object-cover"/>
          <span className="font-bold text-xl">1st</span>
          <span className="font-bold">{topThree[1]?.name}</span>
          <span className="text-xs text-white/80">{topThree[1]?.score || 0} matches</span>
        </div>

        {/* 3rd */}
        <div className="bg-[#92B6D1] w-1/3 rounded-2xl p-4 flex flex-col items-center shadow-sm h-44 justify-center">
          <img src={topThree[2]?.photo} className="w-14 h-14 rounded-full mb-2 object-cover"/>
          <span className="font-bold text-lg">3rd</span>
          <span className="font-bold">{topThree[2]?.name}</span>
          <span className="text-xs text-white/80">{topThree[2]?.score || 0} matches</span>
        </div>

      </div>

      {/* Rankings */}
      <div className="px-4 flex-1">
  <h2 className="text-xl font-bold mb-4">Rankings</h2>

  {/* ✅ เพิ่มตรงนี้ */}
  {players.length === 0 && (
    <p className="text-center mt-10 text-gray-400">
      ยังไม่มีผู้เล่น 😢
    </p>
  )}

  <div className="space-y-3">
    {rankings.map((item, index) => (
            <div key={index} className="bg-[#A67C5B] rounded-2xl p-4 flex items-center text-black">
              <span className="text-xl font-bold w-8">{index + 4}</span>
              <img src={item.photo} className="w-12 h-12 rounded-full mr-4 object-cover"/>
              <span className="font-bold flex-1">{item.name}</span>
              <span className="text-sm text-white/90">{item.score} matches</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="mt-6 border-t-4 border-gray-100 p-4 flex items-center bg-white sticky bottom-0">

          <span className="text-xl font-bold w-12 text-center">
            {players.findIndex(p => p.user_id === currentUser.user_id) + 1}
          </span>

          <img 
            src={currentUser.photo}
            className="w-12 h-12 rounded-full mr-4 border-2 border-[#F2C94C] object-cover"
          />

          <span className="font-bold flex-1 text-lg">{currentUser.name}</span>

          <span className="text-gray-500">
            {currentUser.score} matches
          </span>
        </div>
      )}

    </div>
  );
};

export default LeaderBoard;