"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import type { TripDetail, TripStop } from "@/app/components/TripDetailPage";

const W = {
  yellow: "#EFBB3A",
  darkYellow: "#C49A28",
  green: "#4F772D",
  white: "#FFFFFF",
  text: "#000000",
  muted: "#7A7A7A",
  dark: "#614124",
  pink: "#FF7B7B",
  blue: "#4A90D9",
  lightGray: "#f0f0f0",
  bg: "#ffffff",
};

type StopState = "locked" | "active" | "completed";

interface StopNode {
  id: string;
  label: number;
  state: StopState;
  x: number;
  y: number;
}

interface TripMapPageProps {
  trip: TripDetail;
  onHome?: () => void;
  onMapClose: () => void;
  onClaim: () => void;
}

// ✅ เรียง stops ตามลำดับเช็คอิน แล้วต่อด้วยที่ยังไม่เช็ค
function buildNodes(
  stops: TripStop[],
  historyIds: Set<string>,
  checkinOrder: string[]
): StopNode[] {
  const total = stops.length;
  const layoutY = (i: number) => 120 + (total - 1 - i) * 140;
  // ✅ ห่างจากขอบ: 28% และ 62%
  const xPos = (i: number): number => (i % 2 === 0 ? 28 : 62);
  const getId = (s: any) =>
    String(s.location_id || s.locationId || s.id);

  const checkedStops = checkinOrder
    .map((id) => stops.find((s) => getId(s) === id))
    .filter(Boolean) as TripStop[];

  const uncheckedStops = stops.filter((s) => !historyIds.has(getId(s)));
  const ordered = [...checkedStops, ...uncheckedStops];

  return ordered.map((stop, i) => {
    const locationId = getId(stop);
    const isChecked = historyIds.has(locationId);
    const isActive =
      !isChecked &&
      (i === 0 ||
        ordered.slice(0, i).every((prev) => historyIds.has(getId(prev))));

    const state: StopState = isChecked
      ? "completed"
      : isActive
        ? "active"
        : "locked";

    return { id: locationId, label: i + 1, state, x: xPos(i), y: layoutY(i) };
  });
}

function MapNode({ node, stop }: { node: StopNode; stop: TripStop }) {
  const isDesktop = useIsDesktop();
  const size = isDesktop ? 80 : 72;
  const isRevealed = node.state === "completed";
  const isActive = node.state === "active";

  return (
    <div
      style={{
        position: "absolute",
        left: `${node.x}%`,
        top: node.y,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: isActive ? 20 : isRevealed ? 15 : 10,
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 24,
          background: isRevealed ? "#4F772D" : "#3d3d3d",
          border: isActive ? `4px solid ${W.yellow}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isActive
            ? `0 0 20px ${W.yellow}44`
            : "0 4px 15px rgba(0,0,0,0.5)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isRevealed ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {stop.image ? (
              <img
                src={stop.image}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "grayscale(100%) brightness(0.6)",
                }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#1A1A1A" }} />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(79, 119, 45, 0.4)",
              }}
            >
              <Icon icon="mdi:check-circle" width="42" color="white" />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Icon
              icon={isActive ? "mdi:map-marker-question" : "mdi:lock"}
              width="24"
              color={isActive ? W.yellow : "#555555"}
            />
            <span style={{ fontSize: 18, fontWeight: 900, color: "#555555" }}>
              {node.label}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "6px 16px",
          borderRadius: 20,
          background: "#FFFFFF",
          border: isRevealed ? `1.5px solid ${W.green}` : "1px solid #333",
          color: isRevealed ? W.green : "#555",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 6,
          zIndex: 21,
        }}
      >
        {isRevealed ? (
          <>
            <Icon icon="mdi:map-marker" width="14" />
            {stop.name}
          </>
        ) : (
          "???????????"
        )}
      </div>
    </div>
  );
}

// ✅ Curve เหมือนเดิม + offset ห่างจากขอบ
// ✅ 1. ปรับ DottedPath ให้คำนวณตำแหน่งจาก "จุดกึ่งกลาง" ของ Node จริงๆ
function DottedPath({
  nodes,
  containerWidth,
}: {
  nodes: StopNode[];
  containerWidth: number;
}) {
  const isDesktop = useIsDesktop();
  if (nodes.length < 2 || containerWidth === 0) return null;

  const nodeSize = isDesktop ? 80 : 72;
  const halfNode = nodeSize / 2;

  const pts = nodes.map((n) => {
    // ใช้สูตรเดียวกันกับที่ใช้จัดวาง Node (Percentage -> Pixel)
    return {
      x: (n.x / 100) * containerWidth + halfNode,
      y: n.y + halfNode,
    };
  });

  const svgHeight = Math.max(...pts.map((p) => p.y)) + 150;

  return (
    <svg
      width={containerWidth}
      height={svgHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {pts.map((p, i) => {
        if (i === pts.length - 1) return null;
        const pNext = pts[i + 1];
        const isPassed = nodes[i].state === "completed" && nodes[i + 1].state !== "locked";
        const color = isPassed ? "#D1D5DB" : "#4A90D9";

        // ✅ คำนวณความโค้งให้พริ้วตามระยะห่าง (S-Curve)
        const controlY = (pNext.y - p.y) / 2;

        return (
          <path
            key={i}
            d={`M ${p.x},${p.y} C ${p.x},${p.y + controlY} ${pNext.x},${pNext.y - controlY} ${pNext.x},${pNext.y}`}
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="10 12"
            fill="none"
            style={{ transition: "stroke 0.4s ease" }}
          />
        );
      })}
    </svg>
  );
}


export default function TripMapPage({
  trip,
  onHome,
  onMapClose,
  onClaim,
}: TripMapPageProps) {
  const [containerWidth, setContainerWidth] = useState(360);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
  const [checkinOrder, setCheckinOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  // ✅ Firebase: ดึง checkins เรียงตาม createdAt
  // ✅ Firebase: ดึง checkins และกรองเอาเฉพาะวันแรกสุดของแต่ละที่
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "checkins"),
            where("userId", "==", user.uid)
          );
          const snap = await getDocs(q);

          // 1. ใช้ Object เพื่อเก็บเฉพาะ "เช็คอินแรกสุด" ของแต่ละ locationId
          const earliestMap: Record<string, Date> = {};

          snap.forEach((doc) => {
            const data = doc.data();
            const locId = String(data.locationId);
            const checkinTime = data.createdAt?.toDate?.() ?? new Date();

            if (locId) {
              // ถ้ายังไม่มี locId นี้ หรือเจออันที่เก่ากว่า (เวลาน้อยกว่า) ให้บันทึกแทนที่
              if (!earliestMap[locId] || checkinTime < earliestMap[locId]) {
                earliestMap[locId] = checkinTime;
              }
            }
          });

          // 2. แปลงจาก Object เป็น Array เพื่อเอาไป Sort เรียงลำดับเส้นเดินทาง
          const records = Object.entries(earliestMap).map(([locId, date]) => ({
            locationId: locId,
            createdAt: date,
          }));

          // 3. เรียงลำดับจาก เก่าไปใหม่ (ใครเช็คอินก่อน อยู่จุดเริ่มทริป)
          records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          setHistoryIds(new Set(records.map((r) => r.locationId)));
          setCheckinOrder(records.map((r) => r.locationId));
        } catch (err) {
          console.error("Error fetching checkins:", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ track container width
  useEffect(() => {
    const update = () => {
      if (mapRef.current) setContainerWidth(mapRef.current.offsetWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const nodes = buildNodes(trip.stops, historyIds, checkinOrder);
  const allChecked =
    trip.stops.length > 0 &&
    trip.stops.every((s: any) =>
      historyIds.has(String(s.location_id || s.locationId || s.id))
    );

  if (loading) {
    return (
      <div
        style={{
          background: W.yellow,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        Loading Map...
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: #6b4729;
          margin: 0;
        }
        @media (min-width: 1024px) {
          body {
            padding: 40px 0;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
          height: "100vh",
          background: W.yellow,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ปุ่มย้อนกลับ */}
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 30 }}>
          <button
            onClick={onMapClose}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              border: "none",
              color: W.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon icon="lucide:chevron-left" width="28" height="28" />
          </button>
        </div>

        {/* พื้นที่แผนที่ */}
        {/* พื้นที่แผนที่ */}
        <div ref={mapRef} style={{
          flex: 1,
          overflowY: "auto",
          position: "relative", // สำคัญมาก: เพื่อให้ SVG และ Node อ้างอิงจุดเริ่มเดียวกัน
          width: "100%"
        }}>
          <div
            style={{
              position: "relative",
              width: "100%", // ให้กว้างเต็มพื้นที่
              maxWidth: "430px", // ถ้าคุณต้องการให้แผนที่ดูเหมือนมือถือบน Desktop ให้จำกัดความกว้างตรงนี้
              margin: "0 auto", // จัดกึ่งกลาง
              minHeight: trip.stops.length * 140 + 200,
              paddingBottom: 120,
            }}
          >
            {/* SVG จะวาดตาม containerWidth ที่วัดได้จาก mapRef */}
            <DottedPath nodes={nodes} containerWidth={containerWidth} />

            {nodes.map((node, i) => {
              const stop = trip.stops.find((s: any) =>
                String(s.location_id || s.locationId || s.id) === node.id
              ) ?? trip.stops[i];
              return <MapNode key={node.id} node={node} stop={stop} />;
            })}
          </div>
        </div>
        {/* แถบเมนูด้านล่าง */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 430,
            zIndex: 25,
          }}
        >
          {/* ปุ่ม Claim It */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 30,
            }}
          >
            <button
              onClick={allChecked ? onClaim : undefined}
              style={{
                width: 147,
                height: 79,
                borderRadius: 20,
                background: allChecked ? W.pink : "rgba(255,123,123,0.45)",
                border: "none",
                cursor: allChecked ? "pointer" : "not-allowed",
                fontSize: 24,
                fontWeight: 900,
                color: W.text,
                transition: "all 0.3s ease",
                boxShadow: allChecked
                  ? "0 8px 20px rgba(255,123,123,0.4)"
                  : "none",
              }}
            >
              claim it
            </button>
          </div>

          {/* แถบสีขาว Home/Map */}
          <div
            style={{
              background: W.white,
              width: "100%",
              height: 78,
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 -8px 25px rgba(0,0,0,0.06)",
              borderTopLeftRadius: 50,
              borderTopRightRadius: 50,
            }}
          >
            <button
              onClick={onHome || onMapClose}
              style={{
                width: 65,
                height: 52,
                borderRadius: 15,
                background: "#6591B9",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                icon="material-symbols-light:home-rounded"
                width="26"
                height="26"
                color="#FFFFFF"
              />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                home
              </span>
            </button>

            <div style={{ width: 147 }} />

            <button
              onClick={onMapClose}
              style={{
                width: 65,
                height: 52,
                borderRadius: 15,
                background: W.yellow,
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon icon="mdi:map-outline" width="26" height="26" color={W.white} />
              <span style={{ fontSize: 16, fontWeight: 700, color: W.white }}>
                map
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(window.innerWidth >= 768);
    }
  }, []);

  return isDesktop;
}