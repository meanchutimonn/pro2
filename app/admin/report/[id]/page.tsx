"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

export default function LocationReviewsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchReviews();
  }, [id]);

  const fetchReviews = async () => {
    try {
      const q = query(
        collection(db, "reviews"),
        where("location_id", "==", id) // ✅ แก้ตรงนี้
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReviews(list);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const deleteReview = async (reviewId: string) => {
    const confirmDelete = confirm("ลบรีวิวนี้ใช่ไหม?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "reviews", reviewId));
    fetchReviews();
  };

  return (
    <div className="layout">
      <div className="content">

        {/* HEADER */}
        <div className="header">
          <button className="backBtn" onClick={() => router.back()}>
            ←
          </button>
          <h1>Location Reviews</h1>
        </div>

        {/* CARD */}
        <div className="card">

          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  {/* ✅ FIX FIELD */}
                  <td>{review.user_name}</td>

                  <td className="rating">
                    ⭐ {review.rating}
                  </td>

                  <td className="comment">
                    {review.review_text}
                  </td>

                  <td>
                    {review.review_date
                      ? new Date(
                          review.review_date.seconds * 1000
                        ).toLocaleString()
                      : "-"}
                  </td>

                  <td>
                    <button
                      className="deleteBtn"
                      onClick={() => deleteReview(review.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {reviews.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No reviews found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      </div>

      {/* CSS */}
      <style jsx>{`
        .layout {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        /* HEADER */
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 25px;
        }

        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
        }

        .backBtn {
          background: white;
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 18px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }

        /* CARD */
        .card {
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        /* TABLE */
        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th {
          background: #6B4226;
          color: white;
          padding: 14px;
          text-align: left;
        }

        .table td {
          padding: 14px;
          border-bottom: 1px solid #eee;
        }

        .table tr:hover {
          background: #fafafa;
        }

        .rating {
          font-weight: 600;
        }

        .comment {
          max-width: 300px;
        }

        /* BUTTON */
        .deleteBtn {
          background: #e53935;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
        }

        .deleteBtn:hover {
          opacity: 0.9;
        }

        /* EMPTY */
        .empty {
          text-align: center;
          padding: 30px;
          color: #777;
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .table {
            font-size: 12px;
          }

          .comment {
            max-width: 150px;
          }
        }
      `}</style>
    </div>
  );
}