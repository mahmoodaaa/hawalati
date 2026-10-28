import { useNavigate } from "react-router-dom";
import { Clock, ArrowDownCircle, Inbox } from "lucide-react";
import Header from "../../../components/layout/Header";
import BottomNav from "../../../components/layout/BottomNav";
import { useAuth } from "../../../context/AuthContext";
import { getTransactions } from "../../../services/storageService";
import { formatAmount, formatDate } from "../../../utils/formatters";
import { EXCHANGE_PROVIDERS } from "../../../data/providers";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const transactions = currentUser ? getTransactions(currentUser.id) : [];

  return (
    <div className="bg-animated" style={{ minHeight: "100vh", paddingBottom: 80 }}>
      <Header title="سجل العمليات" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>

        <div className="animate-fade-in-up" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>سجل الحوالات</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            جميع العمليات التجريبية على هذا المتصفح
          </p>
        </div>

        {transactions.length === 0 ? (
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: 48, textAlign: "center", animationDelay: "0.05s" }}
          >
            <Inbox size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }}>
              لا توجد عمليات بعد
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              ابدأ باستلام أول حوالة تجريبية
            </p>
            <button
              id="btn-history-receive"
              className="btn-primary"
              onClick={() => navigate("/check-remittance")}
              style={{ marginTop: 20 }}
            >
              استلام حوالة
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {transactions.map((txn, idx) => {
              const provider = EXCHANGE_PROVIDERS.find((p) => p.id === txn.provider);
              return (
                <div
                  key={txn.id}
                  className="glass-card animate-fade-in-up"
                  style={{
                    padding: 18,
                    animationDelay: `${idx * 0.05}s`,
                    border: "1px solid rgba(108,99,255,0.12)",
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: "rgba(107,203,119,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ArrowDownCircle size={20} color="var(--success)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{txn.senderName}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{txn.senderCountry}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontWeight: 800, fontSize: 16, color: "var(--success)" }}>
                        +{formatAmount(txn.netAmount)}
                      </p>
                      <span className="badge badge-success" style={{ fontSize: 10 }}>مكتملة</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {[
                      ["رقم المرجع", txn.referenceNumber],
                      ["شركة التحويل", provider?.name || txn.provider],
                      [
                        "وجهة الاستلام",
                        txn.destination?.type === "bank"
                          ? `بنك — ${txn.destination.bankName || ""}`
                          : `محفظة — ${txn.destination?.walletName || ""}`,
                      ],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--text-muted)" }}>{k}</span>
                        <span style={{ fontWeight: 600, direction: "ltr" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Timestamp */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 10,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    <Clock size={11} />
                    {formatDate(txn.confirmedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
