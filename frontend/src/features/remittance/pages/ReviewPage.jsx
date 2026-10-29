import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import Header from "../../../components/layout/Header";
import { receiveRemittance, DEMO_SERVICE_FEE_JOD, isRemittanceId } from "../../../services/remittanceService";

import { formatAmount, maskIban, maskPhone } from "../../../utils/formatters";
import { EXCHANGE_PROVIDERS } from "../../../data/providers";

function Row({ label, value, highlight = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 14px",
        background: highlight ? "rgba(0,212,170,0.06)" : "rgba(255,255,255,0.02)",
        borderRadius: 10,
        marginBottom: 6,
        border: `1px solid ${highlight ? "rgba(0,212,170,0.2)" : "var(--border)"}`,
      }}
    >
      <span style={{ fontSize: 13, color: highlight ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: highlight ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: highlight ? "var(--accent)" : "var(--text-primary)", direction: "ltr", overflowWrap: "anywhere", maxWidth: "65%", textAlign: "left" }}>
        {value}
      </span>
    </div>
  );
}

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { remittance, query, destination } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const inFlight = useRef(false);
  const completed = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  if (!isRemittanceId(remittance?.id) || remittance?.status !== "AVAILABLE" || !destination?.details || !["bank", "wallet"].includes(destination.type)) return <Navigate to="/check-remittance" replace />;

  const provider = EXCHANGE_PROVIDERS.find((p) => p.id === query?.providerId);
  const fee = DEMO_SERVICE_FEE_JOD;
  const net = remittance.amountJOD - fee;

  // Destination display
  const destDisplay =
    destination.type === "bank"
      ? `${destination.details.bankName} — ${maskIban(destination.details.iban || "")}`
      : `${destination.details.walletName} — ${maskPhone(destination.details.walletPhone || "")}`;

  async function handleConfirm() {
    if (!agreed || inFlight.current || completed.current || conflict) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const transaction = await receiveRemittance({ remittanceId: remittance.id, destination, agreed });
      if (!transaction?.id) throw new Error("تعذر قراءة نتيجة العملية. راجع السجل قبل إعادة المحاولة.");
      completed.current = true;
      if (active.current) navigate("/success", { state: { transaction }, replace: true });
    } catch (error) {
      if (!active.current) return;
      if (error.status === 409) { completed.current = true; setConflict(true); }
      const message = error.status === 409 ? "تم استلام هذه الحوالة مسبقًا. راجع سجل العمليات." : error.message;
      setError(error.status === 0 ? `${message} قد يكون الطلب وصل؛ راجع السجل قبل إعادة المحاولة.` : message);
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }
  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title="مراجعة وتأكيد" showBack backTo="/destination" backState={{ remittance, query, destination }} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div className="animate-fade-in-up" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>مراجعة التفاصيل</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            تحقق من كافة البيانات قبل تأكيد العملية
          </p>
        </div>

        {/* Demo notice */}
        <div
          className="animate-fade-in-up"
          style={{
            background: "rgba(255,217,61,0.08)",
            border: "1px solid rgba(255,217,61,0.2)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--warning)",
            marginBottom: 16,
            animationDelay: "0.03s",
          }}
        >
          ⚠️ هذه معاملة تجريبية للعرض فقط — لا تُنفَّذ تحويلات مالية حقيقية
        </div>

        {/* Remittance section */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 18, marginBottom: 14, animationDelay: "0.05s" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-light)", marginBottom: 12, letterSpacing: 0.5 }}>
            📦 تفاصيل الحوالة
          </p>
          <Row label="رقم المرجع" value={remittance.referenceNumber} />
          <Row label="المُرسِل" value={remittance.senderName} />
          <Row label="البلد" value={remittance.senderCountry} />
          <Row label="شركة التحويل" value={provider?.nameEn || remittance.provider} />
          <Row label="مبلغ الحوالة" value={formatAmount(remittance.amount, remittance.currency)} />
        </div>

        {/* Financial section */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 18, marginBottom: 14, animationDelay: "0.08s" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-light)", marginBottom: 12 }}>
            💰 تقدير الحساب المالي — القيم النهائية يحددها الخادم
          </p>
          <Row label="المبلغ بالدينار" value={formatAmount(remittance.amountJOD)} />
          <Row label="رسوم الخدمة التقديرية" value={formatAmount(fee)} />
          <Row label="المبلغ الصافي التقديري" value={formatAmount(net)} highlight />
        </div>

        {/* Destination section */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 18, marginBottom: 20, animationDelay: "0.1s" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-light)", marginBottom: 12 }}>
            🏦 وجهة الاستلام
          </p>
          <Row
            label={destination.type === "bank" ? "الحساب البنكي" : "المحفظة"}
            value={destDisplay}
          />
          {destination.type === "bank" && destination.details.accountName && (
            <Row label="اسم صاحب الحساب" value={destination.details.accountName} />
          )}
        </div>

        {/* Agree checkbox */}
        <label
          className="animate-fade-in-up"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            marginBottom: 16,
            animationDelay: "0.12s",
            padding: "14px 16px",
            background: agreed ? "rgba(108,99,255,0.06)" : "rgba(255,255,255,0.02)",
            borderRadius: 12,
            border: `1px solid ${agreed ? "rgba(108,99,255,0.25)" : "var(--border)"}`,
            transition: "all 0.3s ease",
          }}
        >
          <input
            id="agree-checkbox"
            type="checkbox"
            checked={agreed} disabled={loading || conflict}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2, accentColor: "var(--primary)", width: 16, height: 16, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            أقرّ بأن البيانات أعلاه صحيحة وأوافق على إتمام العملية.{" "}
            <span style={{ color: "var(--text-muted)" }}>
              (هذا العرض تجريبي ولا يُمثّل تحويلاً مالياً حقيقياً)
            </span>
          </span>
        </label>

        {error && <div role="alert" style={{ padding: 14, borderRadius: 12, background: "rgba(255,107,107,0.08)", color: "var(--danger)", marginBottom: 16 }}>
          <p>{error}</p>
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => navigate("/history")}>عرض سجل العمليات</button>
        </div>}
        {/* Confirm / Reject */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            id="btn-confirm-transaction"
            className="btn-accent"
            onClick={handleConfirm}
            disabled={!agreed || loading || conflict}
            style={{ opacity: !agreed ? 0.5 : 1, transition: "opacity 0.3s" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="animate-spin" style={{ width: 18, height: 18, border: "2px solid #0D0E1A", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} />
                جارٍ تأكيد العملية...
              </span>
            ) : (
              <>
                <CheckCircle size={16} style={{ display: "inline", marginLeft: 6 }} />
                تأكيد وإتمام العملية
              </>
            )}
          </button>

          <button
            id="btn-reject-transaction" disabled={loading}
            className="btn-secondary"
            onClick={() => navigate("/home")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <AlertCircle size={15} />
            إلغاء والعودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

