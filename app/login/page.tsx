"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Icon } from "@iconify/react"; // 🔔 เพิ่ม Icon เข้ามาใช้สำหรับหน้า Alert Popup

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  // 🔔 [NEW] State สำหรับคุมการแสดงผล Custom Alert Popup แทน alert() ของระบบ
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      const docSnap = await getDoc(doc(db, "users", user.uid));

      if (!docSnap.exists()) {
        setAlertMessage("ไม่พบข้อมูลของคุณในระบบ");
        await signOut(auth);
        return;
      }

      const data = docSnap.data();
      const role = data.role;

      /* 🔴 ตรวจสอบการแบน */
      if (data.banUntil) {
        const now = new Date();
        const bannedDate = data.banUntil.toDate();

        if (bannedDate > now) {
          const diffTime = bannedDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setAlertMessage(
            `คุณถูกระงับสิทธิ์การใช้งานจนถึงวันที่ ${bannedDate.toLocaleDateString()}\n(เหลืออีก ${diffDays} วัน)\nกรุณาติดต่อผู้ดูแลระบบ`
          );

          await signOut(auth);
          return;
        }
      }

      /* ✅ ถ้าไม่โดนแบน ดีดไปตาม Role */
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "merchant") {
        router.push("/merchant");
      } else {
        router.push("/");
      }

    } catch (error) {
      setAlertMessage("อีเมล หรือ รหัสผ่าน ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/photo/newtrace.png" style={styles.logo} />
        <p style={styles.subtitle}>เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>

        {/* EMAIL */}
        <div style={styles.inputGroup}>
          <label
            style={{
              ...styles.floatingLabel,
              top: email || emailFocus ? -8 : 14,
              fontSize: email || emailFocus ? 12 : 14,
              color: email || emailFocus ? "#614124" : "#999"
            }}
          >
            อีเมล
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            style={styles.input}
          />
        </div>

        {/* PASSWORD */}
        <div style={styles.inputGroup}>
          <label
            style={{
              ...styles.floatingLabel,
              top: password || passwordFocus ? -8 : 14,
              fontSize: password || passwordFocus ? 12 : 14,
              color: password || passwordFocus ? "#614124" : "#999"
            }}
          >
            รหัสผ่าน
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocus(true)}
            onBlur={() => setPasswordFocus(false)}
            style={styles.input}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            ...styles.button,
            background: !email || !password ? "#ccc" : "#F8D45A",
            color: !email || !password ? "#888" : "#614124",
            cursor: !email || !password ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        <p style={styles.registerText}>
          ยังไม่มีบัญชีใช่ไหม?{" "}
          <span
            style={styles.link}
            onClick={() => router.push("/register")}
          >
            สมัครสมาชิก
          </span>
        </p>
      </div>

      {/* 🔔 [NEW] Custom Alert Popup ดีไซน์สีน้ำตาลสไตล์รอยทาง มีปุ่มกากบาทมุมขวา */}
      {alertMessage && (
        <div style={styles.popupOverlay} onClick={() => setAlertMessage(null)}>
          <div style={styles.customAlertCard} onClick={(e) => e.stopPropagation()}>
            {/* ปุ่มกากบาทขวาบน */}
            <div style={styles.alertCloseBtn} onClick={() => setAlertMessage(null)}>✕</div>

            <div style={styles.alertIconWrapper}>
              <Icon 
                icon="solar:danger-triangle-bold" 
                width="48" 
                color="#F3BC00" 
              />
            </div>
            <p style={styles.alertMessageText}>{alertMessage}</p>
            <button 
              style={styles.alertConfirmBtn} 
              onClick={() => setAlertMessage(null)}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    backgroundImage: "url('/photo/background.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative"
  },
  card: {
    width: "90%",
    maxWidth: "400px",
    padding: "40px 30px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    textAlign: "center",
  },
  subtitle: {
    marginBottom: "30px",
    color: "gray",
    fontSize: "14px",
  },
  inputGroup: {
    position: "relative",
    marginBottom: "20px"
  },
  floatingLabel: {
    position: "absolute",
    left: 12,
    background: "white",
    padding: "0 4px",
    transition: "0.2s",
    pointerEvents: "none"
  },
  input: {
    width: "100%",
    padding: "18px 12px 10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none"
  },
  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    fontSize: "15px",
    transition: "all 0.2s"
  },
  registerText: {
    marginTop: "20px",
    fontSize: "14px",
  },
  link: {
    color: "#614124",
    cursor: "pointer",
    fontWeight: "bold",
  },
  logo: {
    width: "240px",
    display: "block",
    margin: "0 auto 2px",
  },

  // 🔔 เพิ่มสไตล์ CSS สำหรับ Custom Alert Popup ( inline-styles )
  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    backdropFilter: "blur(4px)",
  },
  customAlertCard: {
    background: "white",
    width: "85%",
    maxWidth: "320px",
    borderRadius: "24px",
    padding: "36px 24px 20px 24px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    position: "relative",
  },
  alertCloseBtn: {
    position: "absolute",
    top: "15px",
    right: "18px",
    fontSize: "18px",
    color: "#999",
    cursor: "pointer",
  },
  alertIconWrapper: {
    marginBottom: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  alertMessageText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#444",
    lineHeight: "1.5",
    marginBottom: "24px",
    whiteSpace: "pre-line",
  },
  alertConfirmBtn: {
    background: "#614124", // โทนสีน้ำตาลหลักของแอป
    color: "white",
    border: "none",
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  }
};