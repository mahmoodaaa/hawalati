import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, FileText, Camera } from "lucide-react";
import Header from "../../../components/layout/Header";
import { submitKyc } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";

const KYC_STEPS = [
  { icon: <FileText size={20} />, title: "صورة الهوية", desc: "صورة واضحة للوجهين", status: "demo" },
  { icon: <Camera size={20} />, title: "التحقق بالوجه", desc: "صورة سيلفي للمقارنة", status: "demo" },
  { icon: <Shield size={20} />, title: "مراجعة البيانات", desc: "تحقق آلي من المعلومات", status: "demo" },
];

export default function KycPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [error, setError] = useState("");

  async function handleSubmitKyc() {
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      await submitKyc();
      const profile = await refreshUser();
      if (!["VERIFIED", "DEMO_VERIFIED"].includes(profile.kycStatus)) throw new Error("لم تكتمل عملية التحقق.");
      setStatus("done");
    } catch (error) {
      setError(error.message);
      setStatus("idle");
    }
  }

  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title="التحقق من الهوية" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        {/* Intro */}
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(108,99,255,0.25), rgba(0,212,170,0.15))",
              border: "2px solid rgba(108,99,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 36,
            }}
          >
            🛡️
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>التحقق من الهوية (KYC)</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            لضمان سلامة المعاملات وحمايتك،<br />نحتاج للتحقق من هويتك مرة واحدة.
          </p>
        </div>

        {/* Demo disclaimer */}
        <div
          className="animate-fade-in-up"
          style={{
            background: "rgba(255,217,61,0.08)",
            border: "1px solid rgba(255,217,61,0.25)",
            borderRadius: 14,
            padding: "14px 16px",
            fontSize: 13,
            color: "var(--warning)",
            marginBottom: 20,
            animationDelay: "0.05s",
          }}
        >
          ⚠️ <strong>نسخة تجريبية:</strong> في هذا العرض، التحقق من الهوية تلقائي ومباشر. في النسخة الحقيقية ستحتاج لرفع صور الهوية والتحقق بالوجه.
        </div>

        {/* KYC Steps visual */}
        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: 20, marginBottom: 20, animationDelay: "0.1s" }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14 }}>
            خطوات التحقق
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {KYC_STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  background: status === "done" ? "rgba(0,212,170,0.06)" : "rgba(255,255,255,0.03)",
                  borderRadius: 12,
                  border: `1px solid ${status === "done" ? "rgba(0,212,170,0.2)" : "var(--border)"}`,
                  transition: "all 0.5s ease",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: status === "done"
                      ? "rgba(0,212,170,0.15)"
                      : "rgba(108,99,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: status === "done" ? "var(--accent)" : "var(--primary-light)",
                    flexShrink: 0,
                    transition: "all 0.5s ease",
                  }}
                >
                  {status === "done" ? <CheckCircle size={20} /> : step.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{step.desc}</div>
                </div>
                <span
                  className={`badge ${status === "done" ? "badge-success" : "badge-warning"}`}
                  style={{ fontSize: 11 }}
                >
                  {status === "done" ? "✓ تم" : "تجريبي"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>}
        {/* Action */}
        {status === "idle" && (
          <button
            id="btn-submit-kyc"
            className="btn-primary animate-fade-in-up"
            onClick={handleSubmitKyc}
            style={{ animationDelay: "0.15s" }}
          >
            إرسال طلب التحقق →
          </button>
        )}

        {status === "loading" && (
          <div
            className="glass-card animate-fade-in"
            style={{ padding: 24, textAlign: "center" }}
          >
            <div
              className="animate-spin"
              style={{
                width: 44,
                height: 44,
                border: "3px solid var(--primary)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                margin: "0 auto 12px",
              }}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              جارٍ التحقق من هويتك...
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
              (نسخة تجريبية — يتم القبول تلقائياً)
            </p>
          </div>
        )}

        {status === "done" && (
          <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              className="glass-card"
              style={{
                padding: 24,
                textAlign: "center",
                border: "1px solid rgba(107,203,119,0.3)",
              }}
            >
              <div
                className="animate-success-pop"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(107,203,119,0.15)",
                  border: "2px solid var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <CheckCircle size={28} color="var(--success)" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>تم التحقق بنجاح! ✅</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                حسابك الآن موثّق ويمكنك استلام الحوالات
              </p>
            </div>
            <button
              id="btn-kyc-continue"
              className="btn-accent"
              onClick={() => navigate("/home", { replace: true })}
            >
              الانتقال إلى الصفحة الرئيسية 🏠
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
