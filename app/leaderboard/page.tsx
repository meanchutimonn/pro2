"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Icon } from "@iconify/react";

const LeaderBoard = () => {
  const router = useRouter();

  const [champions, setChampions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);

  const [sortType, setSortType] = useState("score"); // score | name

  useEffect(() => {
    const loadData = async () => {
      const gameSnap = await getDocs(collection(db, "game_records"));
      const userSnap = await getDocs(collection(db, "users"));
      const locSnap = await getDocs(collection(db, "locations"));


      // users map
      const usersMap: any = {};
      userSnap.forEach((doc) => {
        usersMap[doc.id] = doc.data();
      });

      // location map
      const locationMap: any = {};
      locSnap.forEach((doc) => {
        locationMap[doc.id] = doc.data();
      });


      // Find champion for each location
      let bestByLocation: any = {};

      gameSnap.forEach((doc) => {
        const data = doc.data();

        if (data.game_id !== "match_pair") return;

        const locId = data.location_id;

        if (
          !bestByLocation[locId] ||
          data.score > bestByLocation[locId].score ||
          (data.score === bestByLocation[locId].score &&
            data.time_used < bestByLocation[locId].time_used)
        ) {
          bestByLocation[locId] = data;
        }
      });

      const result = Object.keys(bestByLocation).map((locId) => {
        const g = bestByLocation[locId];
        const loc = locationMap[locId];

        return {
          locationId: locId,
          locationName: loc?.locationName || "Unknown",
          locationPhoto: loc?.mainImage || "",
          category: loc?.category_name || "other",
          playerName: usersMap[g.user_id]?.name || "Unknown",
          playerPhoto: usersMap[g.user_id]?.photoURL || "",
          score: g.score,
        };
      });

      setChampions(result);
      setFiltered(result);
    };

    loadData();
  }, []);

  // sort + filter
  useEffect(() => {
    let data = [...champions];


    // sort
    if (sortType === "name") {
      data.sort((a, b) => a.locationName.localeCompare(b.locationName));
    } else {
      data.sort((a, b) => b.score - a.score);
    }

    setFiltered(data);
  }, [sortType, champions]);

  return (
    <div className="page bg-white min-h-screen flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="flex items-center px-4 py-4 border-b border-gray-100">
        <button
          className="p-2 rounded-full bg-[#6D4326] text-white hover:bg-[#5a371f] transition-colors"
          onClick={() => router.push("game")}
        >
          <Icon icon="lucide:chevron-left" width="30" />
        </button>

        <h1 className="flex-1 text-center text-lg font-semibold mr-10">
          LeaderBoard
        </h1>
      </header>

      {/* Filter Bar */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-50">
        <select
          className="bg-gray-50 border-none rounded-full px-4 py-2 text-sm font-medium focus:ring-0"
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
        >
          <option value="score">By Score</option>
          <option value="name">By Name</option>
        </select>

      </div>

      {/* Compact List of Location Champions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filtered.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push(`/leaderboard/${item.locationId}`)}
            >
            {/* Small Square Location Image */}
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
              <img
                src={item.locationPhoto || "https://via.placeholder.com/150"}
                alt={item.locationName}
                className="w-full h-full object-cover"
                />
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">

  {/* 👤 Player */}
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-full overflow-hidden border">
      <img src={item.playerPhoto} className="w-full h-full object-cover" />
    </div>
    <p className="text-sm font-semibold truncate">{item.playerName}</p>
  </div>

  {/* 📍 Location */}
  <div className="flex items-center gap-1 text-gray-500">
    <Icon icon="lucide:map-pin" width="14" />
    <p className="text-xs truncate">{item.locationName}</p>
  </div>

</div>

            {/* Rank & Score Section */}
            <div className="flex flex-col items-end gap-1 shrink-0">
  <span className="text-xs text-gray-400 font-bold">
    #{index + 1}
  </span>

  <div className="bg-[#F3F4F6] px-3 py-1 rounded-full text-xs font-bold">
    {item.score} pts
  </div>
</div>
          </div>
        ))}

      </div>
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
    }
  }
`}</style>
    </div>
  );
};


export default LeaderBoard;
