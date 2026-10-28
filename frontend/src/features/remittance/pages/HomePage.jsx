import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, Clock, RotateCcw } from "lucide-react";
import Header from "../../../components/layout/Header";
import BottomNav from "../../../components/layout/BottomNav";
import { useAuth } from "../../../context/AuthContext";
import { getTransactions } from "../../../services/storageService";
import { formatAmount, formatDate } from "../../../utils/formatters";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [resetDone, setResetDone] = useState(false);

  const recentTxns = currentUser
    ? getTransactions(currentUser.id).slice(0, 3)
    : [];

  function resetDemoData() {
    // Clear only received remittances and transactions — keeps user session
    localStorage.removeItem("hawalati_received");
    localStorage.removeItem("hawalati_transactions");
    setResetDone(true);
    setTimeout(() => {
      setResetDone(false);
      window.location.reload(); // refresh to clear recentTxns list
    }, 1500);
  }


  return (
    <div className="bg-animated" style={{ minHeight: "100vh", paddingBottom: 80 }}>
      <Header />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        {/* Welcome card */}
        <div
          className="animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, rgba(108,99,255,0.25) 0%, rgba(0,212,170,0.15) 100%)",
            border: "1px solid rgba(108,99,255,0.3)",
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>مرحباً 👋</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {currentUser?.fullName?.split(" ")[0] || "مستخدم"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            حسابك جاهز لاستلام الحوالات الدولية
          </p>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <span
              className="badge badge-success"
              style={{ fontSize: 11 }}
            >
              ✓ KYC موثّق
            </span>
            <span
              className="badge badge-primary"
              style={{ fontSize: 11 }}
            >
              حوالتي Demo
            </span>
          </div>
        </div>

        {/* Main action */}
        <div className="animate-fade-in-up" style={{ marginBottom: 20, animationDelay: "0.08s" }}>
          <button
            id="btn-receive-remittance"
            onClick={() => navigate("/check-remittance")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
              border: "none",
              borderRadius: 18,
              padding: "22px 24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.3s ease",
              boxShadow: "0 8px 30px rgba(108,99,255,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(108,99,255,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(108,99,255,0.3)";
            }}
          >
            {/* Glow effect */}
            <div
              style={{
                position: "absolute",
                top: -30, right: -30,
                width: 100, height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ArrowDownCircle size={28} color="white" />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 3 }}>
                استلام حوالة
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                تحقق من حوالتك واستلمها بسهولة
              </div>
            </div>
            <div style={{ marginRight: "auto", color: "rgba(255,255,255,0.6)", fontSize: 20 }}>
              ←
            </div>
          </button>
        </div>

        {/* Demo hints */}
        <div
          className="animate-fade-in-up glass-card"
          style={{ padding: 16, marginBottom: 20, animationDelay: "0.12s" }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
            💡 أرقام حوالات تجريبية للعرض:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {[
              { ref: "1234567890", label: "متاحة — Western Union", color: "var(--success)" },
              { ref: "9876543210", label: "متاحة — MoneyGram", color: "var(--success)" },
              { ref: "SARF-2024-001", label: "متاحة — Sarie Exchange", color: "var(--success)" },
              { ref: "ALREADY-RECEIVED", label: "مستلمة مسبقاً", color: "var(--warning)" },
            ].map((h) => (
              <div key={h.ref} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: h.color, fontWeight: 700, direction: "ltr", fontFamily: "monospace" }}>
                  {h.ref}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{h.label}</span>
              </div>
            ))}
          </div>

          {/* Reset Demo button */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <button
              id="btn-reset-demo"
              onClick={resetDemoData}
              disabled={resetDone}
              style={{
                width: "100%",
                background: resetDone
                  ? "rgba(107,203,119,0.12)"
                  : "rgba(255,107,107,0.08)",
                border: `1px solid ${resetDone ? "rgba(107,203,119,0.3)" : "rgba(255,107,107,0.25)"}`,
                borderRadius: 10,
                padding: "8px 14px",
                cursor: resetDone ? "default" : "pointer",
                color: resetDone ? "var(--success)" : "var(--danger)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Tajawal, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.3s ease",
              }}
            >
              {resetDone ? (
                <> ✓ تم الإعادة — الأرقام جاهزة للاستخدام مجدداً</>
              ) : (
                <>
                  <RotateCcw size={13} />
                  إعادة ضبط الديمو (تفعيل الأرقام مجدداً)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent transactions */}
        {recentTxns.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>آخر العمليات</h3>
              <span
                onClick={() => navigate("/history")}
                style={{ fontSize: 12, color: "var(--primary-light)", cursor: "pointer", fontWeight: 600 }}
              >
                عرض الكل
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentTxns.map((txn) => (
                <div
                  key={txn.id}
                  className="glass"
                  style={{ borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(107,203,119,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Clock size={16} color="var(--success)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{txn.referenceNumber}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {formatDate(txn.confirmedAt).split("،")[0]}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                      +{formatAmount(txn.netAmount)}
                    </div>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>مكتملة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
