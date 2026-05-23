"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useParams } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";

export default function AccountDetailPage() {
  const { uid } = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const userSnap = await getDoc(doc(db, "users", uid as string));
    if (userSnap.exists()) {
      setUserData(userSnap.data());
    }

    const shopSnap = await getDocs(
      query(collection(db, "shops"), where("ownerId", "==", uid))
    );

    const shopData = shopSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    setShops(shopData);
  };

  return (
    <div style={{ display: "flex" }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 40 }}>
        <h1>Account Detail</h1>

        {userData && (
          <>
            <p>Email: {userData.email}</p>
            <p>Role: {userData.role}</p>
            <p>Status: {userData.status}</p>
          </>
        )}

        {userData?.role === "merchant" && (
          <>
            <h2 style={{ marginTop: 30 }}>ร้านของผู้ใช้</h2>

            {shops.length === 0 && <p>ไม่มีร้าน</p>}

            {shops.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 15,
                  background: "#f3f4f6",
                  marginBottom: 10,
                  borderRadius: 8,
                }}
              >
                <h4>{s.shopName}</h4>
                <p>{s.address}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}