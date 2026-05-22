import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// เพิ่มรีวิว
export const addReview = async (data: any) => {
  await addDoc(collection(db, "reviews"), {
    ...data,
    review_date: serverTimestamp()
  });
};

// ดึงรีวิว
export const getReviews = async (cafeId: string) => {
  const q = query(
    collection(db, "reviews"),
    where("location_id", "==", cafeId),
    orderBy("review_date", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};