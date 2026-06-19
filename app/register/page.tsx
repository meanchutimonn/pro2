"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signUp, sendOTP } from "@/lib/auth"; // ⭐ เรียกใช้ฟังก์ชันจาก lib/auth.ts
import { doc, setDoc } from "firebase/firestore";
import { Eye, EyeOff, User as UserIcon, Store } from "lucide-react";
import { Icon } from "@iconify/react"; // ดึง Iconify มาใช้ทำสัญลักษณ์สวยๆ ในป๊อปอัป

export default function RegisterPage() {
  const router = useRouter();

  // --- ข้อมูลผู้ใช้ ---
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- สถานะการโฟกัส ---
  const [emailFocus, setEmailFocus] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [confirmFocus, setConfirmFocus] = useState(false);

  // --- ⭐ ส่วนที่เพิ่ม: ระบบ OTP ---
  const [step, setStep] = useState(1); // 1: กรอกข้อมูล, 2: กรอก OTP
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [timer, setTimer] = useState(10);

  // 🔔 เพิ่ม State สำหรับจัดการ Custom Alert Popup แทนของเดิมที่เป็นเหลี่ยมเบราว์เซอร์
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // นับถอยหลัง 10 วินาที
  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // ฟังก์ชัน 1: ขอรับรหัส OTP
  const handleRequestOTP = async () => {
    if (!name || !gender || !email || !password) {
      setAlertMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // สุ่มเลข 6 หลัก
    setGeneratedOtp(code);

    const res = await sendOTP(email, code); // ส่งเข้าเมลผ่าน EmailJS
    setLoading(false);

    if (res.success) {
      setStep(2);
      setTimer(10);
    } else {
      setAlertMessage("ส่งรหัสไม่สำเร็จ กรุณาเช็คการตั้งค่า EmailJS หรือตรวจสอบอีเมลของคุณอีกครั้ง");
    }
  };

  // ฟังก์ชัน 2: ยืนยัน OTP และสมัครสมาชิกจริง
  const handleVerifyAndRegister = async () => {
    if (otpInput !== generatedOtp) {
      setAlertMessage("รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    try {
      setLoading(true);
      const result = await signUp(email, password); // สร้าง User ใน Firebase

      if (result.success && result.user) {
        await setDoc(doc(db, "users", result.user.uid), {
          name, gender, email, role, isNewUser: true, createdAt: new Date(),
        });
        setAlertMessage("สมัครสมาชิกสำเร็จ!");
      } else {
        setAlertMessage("ผิดพลาด: " + result.error);
      }
    } catch (error) {
      setAlertMessage("เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name && email && gender && password.length >= 6 && password === confirmPassword;

  // ฟังก์ชันช่วยจัดการเมื่อปิดหน้าต่างแจ้งเตือน (ถ้าสำเร็จให้ดีดหน้าไปต่อ)
  const handleCloseAlert = () => {
    const isSuccess = alertMessage?.includes("สำเร็จ");
    setAlertMessage(null);
    if (isSuccess) {
      router.push("/introduce");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/photo/newtrace.png" style={styles.logo} />

        {step === 1 ? (
          <>
            <p style={styles.subtitle}>สมัครเพื่อเริ่มใช้งาน</p>

            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.floatingLabel, top: email || emailFocus ? -8 : 14, fontSize: email || emailFocus ? 12 : 14, color: email || emailFocus ? "#614124" : "#999" }}>
                อีเมล
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)} style={styles.input} />
            </div>

            {/* Name */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.floatingLabel, top: name || nameFocus ? -8 : 14, fontSize: name || nameFocus ? 12 : 14, color: name || nameFocus ? "#614124" : "#999" }}>
                ชื่อเล่น
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setNameFocus(true)} onBlur={() => setNameFocus(false)} style={styles.input} />
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.floatingLabel, top: password || passwordFocus ? -8 : 14, fontSize: password || passwordFocus ? 12 : 14, color: password || passwordFocus ? "#614124" : "#999" }}>
                รหัสผ่าน
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
                style={{ ...styles.input, paddingRight: 40 }}
              />
              <span onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>
            </div>

            {/* Confirm Password */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.floatingLabel, top: confirmPassword || confirmFocus ? -8 : 14, fontSize: confirmPassword || confirmFocus ? 12 : 14, color: confirmPassword || confirmFocus ? "#614124" : "#999" }}>
                ยืนยันรหัสผ่าน
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setConfirmFocus(true)}
                onBlur={() => setConfirmFocus(false)}
                style={{ ...styles.input, paddingRight: 40, border: confirmPassword && password !== confirmPassword ? "1px solid red" : "1px solid #ddd" }}
              />
              <span onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>
            </div>

            {confirmPassword.length > 0 && password !== confirmPassword && <p style={styles.errorText}>รหัสผ่านไม่ตรงกัน</p>}
            {password.length > 0 && password.length < 6 && <p style={styles.errorText}>รหัสผ่านต้องอย่างน้อย 6 ตัว</p>}

            {/* Gender */}
            <div style={{ marginBottom: "15px", textAlign: "left" }}>
              <p style={styles.label}>เพศ</p>
              <div style={{ display: "flex", gap: "15px" }}>
                {["male", "female", "other"].map((g) => (
                  <label key={g} style={styles.radioLabel}>
                    <input type="radio" value={g} checked={gender === g} onChange={(e) => setGender(e.target.value)} />
                    <span style={{ marginLeft: "6px" }}>{g === "male" ? "ผู้ชาย" : g === "female" ? "ผู้หญิง" : "ไม่ระบุ"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Role */}
            <div style={{ marginBottom: "20px" }}>
              <p style={styles.label}>ประเภทบัญชี</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <label style={{ ...styles.roleBox, border: role === "user" ? "2px solid #614124" : "1px solid #ddd", background: role === "user" ? "#f4f6ff" : "white" }}>
                  <input type="radio" value="user" checked={role === "user"} onChange={(e) => setRole(e.target.value)} style={{ display: "none" }} />
                  <div style={styles.roleContent}><UserIcon size={18} /> ผู้ใช้งาน</div>
                </label>
                <label style={{ ...styles.roleBox, border: role === "merchant" ? "2px solid #614124" : "1px solid #ddd", background: role === "merchant" ? "#f4f6ff" : "white" }}>
                  <input type="radio" value="merchant" checked={role === "merchant"} onChange={(e) => setRole(e.target.value)} style={{ display: "none" }} />
                  <div style={styles.roleContent}><Store size={18} /> ร้านค้า</div>
                </label>
              </div>
            </div>

            <button onClick={handleRequestOTP} disabled={loading || !isFormValid} style={{ ...styles.button, background: !isFormValid ? "#ccc" : "#F8D45A", color: !isFormValid ? "#888" : "#614124", cursor: !isFormValid ? "not-allowed" : "pointer" }}>
              {loading ? "กำลังส่งรหัส..." : "รับรหัสยืนยันตัวตน"}
            </button>
          </>
        ) : (
          /* --- STEP 2: หน้ากรอก OTP --- */
          <>
            <h3 style={{ color: "#614124", marginBottom: "10px" }}>ยืนยันรหัส OTP</h3>
            <p style={styles.subtitle}>กรุณากรอกรหัส 6 หลักที่ส่งไปที่ {email}</p>

            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="000000"
              style={{ ...styles.input, textAlign: "center", fontSize: "24px", letterSpacing: "8px", marginBottom: "15px" }}
            />

            <div style={{ marginBottom: "20px" }}>
              {timer > 0 ? (
                <p style={{ fontSize: "16px", color: "gray" }}>ขอรหัสใหม่ได้ใน {timer} วินาที</p>
              ) : (
                <span style={styles.link} onClick={handleRequestOTP}>ส่งรหัสใหม่อีกครั้ง</span>
              )}
            </div>

            <button onClick={handleVerifyAndRegister} disabled={loading || otpInput.length < 6} style={{ ...styles.button, background: otpInput.length < 6 ? "#ccc" : "#F8D45A", color: otpInput.length < 6 ? "#888" : "#614124" }}>
              {loading ? "กำลังสมัคร..." : "ยืนยันการสมัครสมาชิก"}
            </button>
          </>
        )}
      </div>

      {/* 🔔 Custom Alert Popup ดีไซน์ทรงมนสไตล์เดียวกันกับโมดอลของแอป */}
      {alertMessage && (
        <div style={styles.popupOverlay} onClick={handleCloseAlert}>
          <div style={styles.popupCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.alertIconWrapper}>
              <Icon 
                icon={alertMessage.includes("สำเร็จ") ? "ep:success-filled" : "solar:danger-triangle-bold"} 
                width="52" 
                color={alertMessage.includes("สำเร็จ") ? "#10B981" : "#F3BC00"} 
              />
            </div>
            <p style={styles.alertMessageText}>{alertMessage}</p>
            <button style={styles.alertConfirmBtn} onClick={handleCloseAlert}>
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", backgroundImage: "url('/photo/background.jpg')", backgroundSize: "cover", backgroundPosition: "center" },
  card: { width: "95%", maxWidth: "450px", padding: "40px 30px", background: "white", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", textAlign: "center" },
  inputGroup: { position: "relative", marginBottom: "15px" },
  floatingLabel: { position: "absolute", left: 12, background: "white", padding: "0 4px", transition: "all 0.2s ease", pointerEvents: "none", zIndex: 1 },
  input: { width: "100%", padding: "14px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", outline: "none" },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)", 
    cursor: "pointer",
    color: "#999",
    display: "flex",
    alignItems: "center"
  },
  button: { width: "100%", padding: "12px", borderRadius: "8px", fontWeight: "bold", fontSize: "15px", border: "none", transition: "0.3s" },
  subtitle: { marginBottom: "20px", color: "gray", fontSize: "14px" },
  loginText: { marginTop: "20px", fontSize: "14px" },
  link: { color: "#614124", cursor: "pointer", fontWeight: "bold" },
  label: { fontWeight: "bold", marginBottom: "8px", display: "block", fontSize: "14px" },
  radioLabel: { display: "flex", alignItems: "center", fontSize: "14px", cursor: "pointer" },
  roleBox: { flex: 1, padding: "12px", borderRadius: "8px", textAlign: "center", cursor: "pointer", fontWeight: "bold" },
  roleContent: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  logo: { width: "240px", display: "block", margin: "0 auto 10px" },
  errorText: { color: "red", fontSize: 11, textAlign: "left", marginTop: -10, marginBottom: 10 },

  // โครงสร้าง CSS ในรูปแบบ Object สำหรับหน้าต่างป๊อปอัปแจ้งเตือนอันใหม่
  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    backdropFilter: "blur(4px)"
  },
  popupCard: {
    background: "white",
    width: "85%",
    maxWidth: "320px",
    borderRadius: "24px",
    padding: "30px 24px 20px 24px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    boxSizing: "border-box"
  },
  alertIconWrapper: {
    marginBottom: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  alertMessageText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#444",
    lineHeight: "1.5", // 🌟 แก้ไขตรงนี้เป็น CamelCase เรียบร้อย บั๊กหายร้อยเปอร์เซ็นต์ครับ!
    marginBottom: "24px",
    whiteSpace: "pre-line"
  },
  alertConfirmBtn: {
    background: "#614124", 
    color: "white",
    border: "none",
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    transition: "all 0.2s"
  }
};