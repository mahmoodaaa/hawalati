import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { CheckCircle, Home, History, Copy } from "lucide-react";
import Header from "../../../components/layout/Header";
import { formatAmount, formatDate } from "../../../utils/formatters";

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transaction } = location.state || {};
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  if (!transaction?.id) return <Navigate to="/history" replace />;

  async function copyTxnId() {
    try {
      await navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("تعذر النسخ تلقائيًا. يمكنك تحديد رقم العملية ونسخه.");
    }
  }
  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title="تم بنجاح" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>

        {/* Success animation */}
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            className="animate-success-pop"
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,212,170,0.2) 0%, rgba(107,203,119,0.1) 100%)",
              border: "2px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 0 40px rgba(0,212,170,0.3)",
            }}
          >
            <CheckCircle size={48} color="var(--accent)" />
          </div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 900,
              marginBottom: 6,
              background: "linear-gradient(135deg, var(--accent), var(--success))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            تمت العملية بنجاح! 🎉
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            تم تأكيد طلب استلام حوالتك التجريبية
          </p>
        </div>

        {/* Transaction ID */}
        <div
          className="animate-fade-in-up glass-card"
          style={{
            padding: "16px 20px",
            marginBottom: 16,
            animationDelay: "0.08s",
            textAlign: "center",
            border: "1px solid rgba(0,212,170,0.2)",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>رقم العملية التجريبي</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "monospace",
                color: "var(--accent)",
                direction: "ltr",
                letterSpacing: 0.5,
                overflowWrap: "anywhere",
                minWidth: 0,
              }}
            >
              {transaction.id}
            </span>
            <button
              onClick={copyTxnId}
              title="نسخ"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: copied ? "var(--success)" : "var(--text-muted)",
                padding: 4,
                borderRadius: 6,
                transition: "color 0.2s",
              }}
            >
              {copied ? "✓" : <Copy size={14} />}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {formatDate(transaction.confirmedAt)}
          </p>
        </div>

        {/* Summary card */}
        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: 20, marginBottom: 20, animationDelay: "0.12s" }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 14 }}>
            ملخص العملية
          </p>

          {[
            ["رقم الحوالة", transaction.referenceNumber],
            ["المُرسِل", transaction.senderName],
            ["المبلغ الأصلي", formatAmount(transaction.amount, transaction.currency)],
            ["المبلغ بالدينار", formatAmount(transaction.amountJOD)],
            ["الحالة", transaction.status],
            ["المبلغ الصافي", formatAmount(transaction.netAmount)],
            [
              "وجهة الاستلام",
              transaction.destination?.type === "bank"
                ? `${transaction.destination.bankName || "بنك"}`
                : `${transaction.destination?.walletName || "محفظة"}`,
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}

          <p style={{ fontSize: 13, marginTop: 10 }} dir="ltr">{transaction.destination?.iban || transaction.destination?.walletPhone}</p>
          {copyError && <p role="alert" style={{ color: "var(--danger)", marginTop: 10 }}>{copyError}</p>}
          {/* Net amount highlight */}
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              background: "rgba(0,212,170,0.08)",
              border: "1px solid rgba(0,212,170,0.2)",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>المبلغ المُستلَم</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)" }}>
              {formatAmount(transaction.netAmount)}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              بعد خصم رسوم الخدمة ({formatAmount(transaction.fee)})
            </p>
          </div>
        </div>

        {/* Demo disclaimer */}
        <div
          className="animate-fade-in-up"
          style={{
            background: "rgba(255,217,61,0.06)",
            border: "1px solid rgba(255,217,61,0.15)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--warning)",
            marginBottom: 16,
            animationDelay: "0.15s",
            textAlign: "center",
          }}
        >
          ⚠️ هذه معاملة تجريبية للعرض فقط — لم يُحوَّل أي مبلغ مالي حقيقي
        </div>

        {/* Action buttons */}
        <div
          className="animate-fade-in-up"
          style={{ display: "flex", flexDirection: "column", gap: 10, animationDelay: "0.18s" }}
        >
          <button
            id="btn-receive-another"
            className="btn-accent"
            onClick={() => navigate("/check-remittance")}
          >
            استلام حوالة أخرى
          </button>
          <button
            id="btn-go-home"
            className="btn-secondary"
            onClick={() => navigate("/home")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Home size={15} />
            الصفحة الرئيسية
          </button>
          <button
            id="btn-view-history"
            onClick={() => navigate("/history")}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary-light)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: 8,
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            <History size={14} />
            عرض سجل العمليات
          </button>
        </div>
      </div>
    </div>
  );
}

