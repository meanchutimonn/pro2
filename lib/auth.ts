import { auth } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
} from "firebase/auth";
import emailjs from "@emailjs/browser";

// 1. ฟังก์ชันสำหรับส่งรหัส OTP 6 หลักเข้าอีเมลจริง
export const sendOTP = async (email: string, otp: string) => {
  try {
    // นำค่ามาจากหน้า Dashboard ของ EmailJS ที่คุณเปิดค้างไว้
    await emailjs.send(
      "service_7tvofyw", // ⭐ แทนที่ด้วย Service ID ของคุณ
      "template_j25uqiu", // ⭐ แทนที่ด้วย Template ID (จากรูปที่ 7)
      {
        email: email,      // ต้องตรงกับ {{email}} ใน Template
        passcode: otp,    // ต้องตรงกับ {{passcode}} ใน Template
      },
      "KUCdy-sZTS-SSy2cR"    // ⭐ แทนที่ด้วย Public Key จากหน้า Account ของคุณ
    );
    return { success: true };
  } catch (error: any) {
    console.error("EmailJS Error:", error.message);
    return { success: false, error: error.message };
  }
};

// 2. ฟังก์ชันสมัครสมาชิก (จะเรียกใช้หลังจากกรอก OTP ถูกต้องแล้ว)
export const signUp = async (email: string, password: string) => {
  try {
    // สร้าง User ใน Firebase จริงๆ
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return { success: true, user };
  } catch (error: any) {
    console.error("Signup Error:", error.message);
    return { success: false, error: error.message };
  }
};