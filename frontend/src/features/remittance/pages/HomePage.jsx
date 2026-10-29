
import { useNavigate } from "react-router-dom";
import { ArrowDownCircle } from "lucide-react";
import Header from "../../../components/layout/Header";
import BottomNav from "../../../components/layout/BottomNav";
import { useAuth } from "../../../context/AuthContext";
import useRemittanceHistory from "../hooks/useRemittanceHistory";
import TransactionCard from "../components/TransactionCard";


export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { transactions, loading, error, reload } = useRemittanceHistory();
  const kycVerified = ["VERIFIED", "DEMO_VERIFIED"].includes(currentUser?.kycStatus);

  const recentTxns = transactions.slice(0, 3);

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
            {kycVerified ? "حسابك جاهز لاستلام الحوالات الدولية" : "أكمل التحقق من هويتك لتتمكن من استلام الحوالات"}
          </p>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <span
              className={`badge ${kycVerified ? "badge-success" : "badge-warning"}`}
              style={{ fontSize: 11 }}
            >
              {kycVerified ? "✓ KYC موثّق" : currentUser?.kycStatus === "REJECTED" ? "KYC يحتاج مراجعة" : "KYC بانتظار الإكمال"}
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
            onClick={() => navigate(kycVerified ? "/check-remittance" : "/kyc")}
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
                {kycVerified ? "استلام حوالة" : "إكمال التحقق من الهوية"}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                {kycVerified ? "تحقق من حوالتك واستلمها بسهولة" : "ارفع وثيقتك وأكمل KYC قبل استلام حوالتك"}
              </div>
            </div>
            <div style={{ marginRight: "auto", color: "rgba(255,255,255,0.6)", fontSize: 20 }}>
              ←
            </div>
          </button>
        </div>

        <section className="animate-fade-in-up" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>آخر العمليات</h3>
            <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", color: "var(--primary-light)", cursor: "pointer", fontSize: 13 }}>عرض السجل كاملًا</button>
          </div>
          {loading ? <p role="status" className="glass-card" style={{ padding: 20 }}>جارٍ تحميل آخر العمليات…</p>
            : error ? <div role="alert" className="glass-card" style={{ padding: 20 }}><p style={{ color: "var(--danger)" }}>{error}</p>
              <button className="btn-secondary" onClick={reload} style={{ marginTop: 12 }}>إعادة المحاولة</button></div>
              : recentTxns.length === 0 ? <p className="glass-card" style={{ padding: 20, color: "var(--text-secondary)", fontSize: 14 }}>لا توجد عمليات مكتملة حتى الآن.</p>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{recentTxns.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} compact />)}</div>}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
