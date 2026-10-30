import { t } from '../../../i18n/translate.js';
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Zap, Globe } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";

const FEATURES = [
  { icon: <Zap size={20} />, title: "سريع وآمن", desc: "استلم حوالتك في ثوانٍ" },
  { icon: <Shield size={20} />, title: "KYC موثوق", desc: "تحقق من هويتك بخطوات بسيطة" },
  { icon: <Globe size={20} />, title: "عالمي", desc: "من أي مكان في العالم إلى بنكك" },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate("/home", { replace: true });
  }, [isAuthenticated]);

  return (
    <div
      className="bg-animated"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}
    >
      {/* Demo Banner */}
      

      <div style={{ maxWidth: 420, width: "100%", marginTop: 40 }}>
        {/* Logo */}
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            className="animate-float"
            style={{
              width: 90,
              height: 90,
              borderRadius: 28,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 20px 60px rgba(108,99,255,0.4)",
              fontSize: 40,
            }}
          >
            💸
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 900,
              background: "linear-gradient(135deg, var(--primary-light) 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-1px",
              marginBottom: 8,
            }}
          >{t("حوالتي")} </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, lineHeight: 1.6 }}>{t("منصة استلام الحوالات الذكية")}<br />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("آمنة · سريعة · موثوقة")}</span>
          </p>
        </div>

        {/* Features */}
        <div
          className="animate-fade-in-up"
          style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36, animationDelay: "0.1s" }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="glass"
              style={{
                borderRadius: 16,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,170,0.1))",
                  border: "1px solid rgba(108,99,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary-light)",
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t(f.title)}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t(f.desc)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div
          className="animate-fade-in-up"
          style={{ display: "flex", flexDirection: "column", gap: 12, animationDelay: "0.2s" }}
        >
          <button
            id="btn-register"
            className="btn-primary"
            onClick={() => navigate("/register")}
            style={{ fontSize: 17, padding: "16px 28px" }}
          >{t("إنشاء حساب جديد")} </button>
          <button
            id="btn-login"
            className="btn-secondary"
            onClick={() => navigate("/login")}
            style={{ fontSize: 17, padding: "16px 28px" }}
          >{t("تسجيل الدخول")} </button>
        </div>

        {/* Demo hint */}
        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            padding: "12px 16px",
            background: "rgba(255,217,61,0.08)",
            border: "1px solid rgba(255,217,61,0.2)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--warning)",
          }}
        >{t("💡 للعرض التجريبي: رمز OTP الثابت هو")} <strong>123456</strong>
        </div>
      </div>
    </div>
  );
}
