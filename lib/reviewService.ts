import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
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
  const reviews = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const enrichedReviews = await Promise.all(
    reviews.map(async (review: any) => {
      const userId = review.user_id;
      let resolvedName = review.displayName || review.user_name || review.userName || review.username || review.name || "ผู้ใช้";

      if (userId) {
        try {
          const userSnap = await getDoc(doc(db, "users", userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            resolvedName =
              userData?.nickname ||
              userData?.nickName ||
              userData?.username ||
              userData?.displayName ||
              userData?.name ||
              resolvedName;
          }
        } catch (error) {
          console.error("Error resolving review author name:", error);
        }
      }

      return {
        ...review,
        displayName: resolvedName,
        user_name: resolvedName,
      };
    })
  );

  return enrichedReviews;
};