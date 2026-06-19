"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react"; // ⭐ นำเข้าไลบรารี Iconify สำหรับเรียกใช้งานไอคอน

// --- ข้อมูลหน้าแนะนำการใช้งาน (เพิ่มเป็น 5 หน้าตามบรีฟ) ---
const steps = [
  {
    type: "logo", // ⭐ มาร์กไว้ว่าเป็นหน้าต้อนรับ เพื่อสลับไปใช้รูปโลโก้แทนไอคอนปกติ
    title: "ยินดีต้อนรับสู่ Trace",
    description:
      "ค้นพบร้านค้า คาเฟ่ และสถานที่ท่องเที่ยวในอำเภอสามพราน พร้อมสะสมแต้มจากการเดินทางของคุณ",
  },
  {
    type: "icon",
    icon: <Icon icon="tabler:qrcode" className="text-[#5D4037] text-7xl" />,
    title: "เช็คอินสถานที่",
    description:
      "สแกน QR Code ณ ร้านค้าหรือสถานที่ท่องเที่ยว เพื่อรับข้อมูลและบันทึกการเดินทางของคุณ",
  },
  {
    type: "icon",
    icon: <Icon icon="icon-park-solid:game-three" className="text-[#5D4037] text-7xl" />,
    title: "ปลดล็อกเกม",
    description:
      "หลังจากเช็คอินสำเร็จ คุณจะได้รับสิทธิ์เล่นเกมประจำสถานที่ เพื่อสะสมคะแนน", // cite: user_correction_ledger
  },
  {
    type: "icon",
    icon: <Icon icon="flowbite:clipboard-list-solid" className="text-[#5D4037] text-7xl" />,
    title: "ภารกิจ",
    description: (
      <>
        เมื่อเลือกทำภารกิจหนึ่งอย่าง ต้องไปตามสถานที่ในภารกิจ เมื่อทำภารกิจเสร็จรับแต้ม 50 แต้ม!{" "}
      {/* ⭐ ปรับปรุงตรงนี้: ใช้ block เพื่อสั่งให้ขยับลงมาขึ้นบรรทัดใหม่ข้างล่างทั้งหมดพร้อมวงเล็บ และเพิ่ม mt-1 ให้มีระยะห่างพอ*/}
       <span 
          className="block mt-2 font-semibold text-md leading-6"
          style={{ 
            color: "#fd5656"
          }}
        >
          (ไม่สามารถทำภารกิจอีกอันได้ถ้ายังทำภารกิจเดิมไม่สำเร็จ)
        </span>
      </>
    ),
  },
  {
    type: "icon",
    icon: <Icon icon="mdi:coupon-outline" className="text-[#5D4037] text-7xl" />,
    title: "สะสมแต้ม แลกรางวัล",
    description:
      "รับคะแนนสะสมจากการเล่นเกม และนำไปแลกรับคูปองหรือสิทธิพิเศษจากร้านค้าที่ร่วมรายการ",
  },
];

export default function IntroducePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const finishIntro = () => {
    localStorage.setItem("intro_seen", "true");
    router.push("/");
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishIntro();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F8F5F1] to-[#EFE4D6] flex flex-col">
      {/* Header */}
      <div className="flex justify-end p-6">
        <button
          onClick={finishIntro}
          className="text-[#8D6E63] font-medium transition-colors hover:text-[#5D4037]"
        >
          ข้าม
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 text-center">
      {/* ⭐ เช็คเงื่อนไขตรงนี้: ถ้าเป็นโลโก้ให้โปร่งใสไม่มีพื้นหลัง/ไม่มีวงกลมขาว แต่ถ้าเป็นหน้าไอคอน (Step 2-5) ให้ดึงวงกลมขาวและเงากลับมาเหมือนเดิม */}
        <div className={`w-44 h-44 flex items-center justify-center mb-10 overflow-hidden ${
          steps[currentStep].type === "logo" 
            ? "" 
            : "bg-white shadow-md p-2 rounded-full"
        }`}>
          {steps[currentStep].type === "logo" ? (
            <img 
              src="/photo/newtrace.png" 
              className="w-full h-full object-contain" 
              alt="Trace Logo" 
            />
          ) : (
            steps[currentStep].icon
          )}
        </div>

        <p className="text-sm font-medium text-[#8D6E63] mb-2">
          STEP {currentStep + 1} / {steps.length}
        </p>

        <h2 className="text-2xl font-bold text-[#5D4037] mb-4">
          {steps[currentStep].title}
        </h2>

       {/* ⭐ แก้ไขการคุมความกว้างตรงนี้: ถ้าเป็นหน้าภารกิจจะขยายพื้นที่เป็น max-w-md เพื่อป้องกันไม่ให้คำว่า 'สำเร็จ)' ตกบรรทัด ส่วนหน้าอื่นๆ ใช้ max-w-sm ตามปกติครับ */}
        <div className={`text-[#6D5D54] text-base leading-8 ${
          steps[currentStep].type === "icon" && currentStep === 3 
            ? "max-w-md px-2" 
            : "max-w-sm"
        }`}>
          {steps[currentStep].description}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-10">
        {/* Indicators จุดบอกหน้าสไลด์ */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-10 bg-[#5D4037]"
                  : "w-2 bg-[#D7CCC8]"
              }`}
            />
          ))}
        </div>

        {/* ปุ่มควบคุม */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="w-1/3 border border-[#5D4037] text-[#5D4037] py-4 rounded-2xl font-medium active:bg-[#5D4037]/5 transition-colors"
            >
              ย้อนกลับ
            </button>
          )}

          {/* ⭐ ปรับสีปุ่มตรงนี้: หน้าสุดท้ายปุ่มจะเป็นสีเหลือง #F3BC00 เสมอ ส่วนหน้าปกติจะเป็นสีน้ำตาล #5D4037 และเปลี่ยนสีตัวอักษรของหน้าสุดท้ายเป็นสีน้ำตาลเข้มเพื่อการมองเห็นที่ชัดเจนขึ้น */}
          <button
            onClick={nextStep}
            className={`flex-1 py-4 rounded-2xl font-bold transition-all duration-300 ${
              currentStep === steps.length - 1
                ? "bg-[#F3BC00] text-[#5D4037] hover:bg-[#E2AF00] shadow-md"
                : "bg-[#5D4037] text-white active:bg-[#4E342E]"
            }`}
          >
            {currentStep === steps.length - 1
              ? "เริ่มต้นใช้งาน"
              : "ถัดไป"}
          </button>
        </div>
      </div>
    </main>
  );
}