import { t } from '../../../i18n/translate.js';
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { isRemittanceId } from "../../../services/remittanceService";
import { CheckCircle, XCircle, AlertTriangle, Shuffle } from "lucide-react";
import Header from "../../../components/layout/Header";
import { formatAmount } from "../../../utils/formatters";
import { EXCHANGE_PROVIDERS } from "../../../data/providers";

export default function RemittanceResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { result, query } = location.state || {};

  if (!result || (result.status === "AVAILABLE" && !isRemittanceId(result.remittance?.id))) return <Navigate to="/check-remittance" replace />;

  const provider = EXCHANGE_PROVIDERS.find((p) => p.id === query?.providerId);
  const { status, remittance } = result;

  // ── Available ──────────────────────────────────────────
  if (status === "AVAILABLE") {
    return (
      <div className="bg-animated" style={{ minHeight: "100vh" }}>
        <Header title={t("نتيجة التحقق")} showBack backTo="/check-remittance" />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          {/* Success header */}
          <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              className="animate-success-pop"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(107,203,119,0.15)",
                border: "2px solid var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle size={36} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--success)", marginBottom: 4 }}>{t("الحوالة متاحة! ✅")} </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("تم العثور على الحوالة وهي جاهزة للاستلام")} </p>
          </div>

          {/* Remittance details */}
          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: 20, marginBottom: 16, animationDelay: "0.05s" }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 14 }}>{t("تفاصيل الحوالة")} </p>

            {/* Amount highlight */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(107,203,119,0.1), rgba(0,212,170,0.08))",
                border: "1px solid rgba(107,203,119,0.25)",
                borderRadius: 14,
                padding: "16px 20px",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{t("مبلغ الحوالة")}</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: "var(--success)" }}>
                {formatAmount(remittance.amount, remittance.currency)}
              </p>
              {remittance.currency !== "JOD" && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  ≈ {formatAmount(remittance.amountJOD)}{t("(بعد التحويل)")} </p>
              )}
              {/* Compare with approx — show currency clearly */}
              {query?.approxAmount && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{t("المبلغ التقريبي الذي أدخلته:")}{" "}
                  <span style={{ fontWeight: 600 }}>
                    {formatAmount(query.approxAmount, "JOD")}
                  </span>
                </p>
              )}
            </div>

            {/* Details rows */}
            {[
              [t("رقم المرجع"), remittance.referenceNumber],
              [t("المُرسِل"), remittance.senderName],
              [t("البلد المُرسِل"), remittance.senderCountry],
              [t("شركة التحويل"), provider?.name || remittance.provider],
              [t("العملة"), remittance.currency],
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
                <span style={{ color: "var(--text-secondary)" }}>{t(k)}</span>
                <span style={{ fontWeight: 600, direction: "ltr" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            id="btn-proceed-to-destination"
            className="btn-accent animate-fade-in-up"
            onClick={() =>
              navigate("/destination", {
                state: { remittance, query },
              })
            }
            style={{ animationDelay: "0.1s" }}
          >{t("اختيار وجهة الاستلام ←")} </button>
          <button
            className="btn-secondary"
            onClick={() => navigate("/home")}
            style={{ marginTop: 10 }}
          >{t("إلغاء والعودة للرئيسية")} </button>
        </div>
      </div>
    );
  }

  // ── Already Received ───────────────────────────────────
  if (status === "ALREADY_RECEIVED") {
    return (
      <div className="bg-animated" style={{ minHeight: "100vh" }}>
        <Header title={t("نتيجة التحقق")} showBack backTo="/check-remittance" />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(255,217,61,0.12)",
                border: "2px solid var(--warning)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertTriangle size={36} color="var(--warning)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--warning)", marginBottom: 4 }}>{t("مستلمة مسبقاً")} </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("هذه الحوالة تمت معالجتها واستلامها من قبل.")} </p>
          </div>

          <div
            className="glass-card animate-fade-in-up"
            style={{ padding: 20, marginBottom: 16, animationDelay: "0.05s" }}
          >
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>{t("رقم الحوالة:")} <strong style={{ direction: "ltr", display: "inline-block" }}>{query?.referenceNumber}</strong>
                <br />{t("إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع جهة الإرسال.")} </p>
            </div>
          </div>

          <button className="btn-primary" onClick={() => navigate("/check-remittance")}>{t("التحقق من حوالة أخرى")} </button>
          <button className="btn-secondary" onClick={() => navigate("/home")} style={{ marginTop: 10 }}>{t("العودة للرئيسية")} </button>
        </div>
      </div>
    );
  }

  // ── Provider Mismatch ──────────────────────────────────
  if (status === "PROVIDER_MISMATCH") {
    const correctProvider = EXCHANGE_PROVIDERS.find((p) => p.id === result.expectedProvider);
    return (
      <div className="bg-animated" style={{ minHeight: "100vh" }}>
        <Header title={t("نتيجة التحقق")} showBack backTo="/check-remittance" />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
          <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(108,99,255,0.12)",
                border: "2px solid var(--primary-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Shuffle size={36} color="var(--primary-light)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-light)", marginBottom: 4 }}>{t("شركة التحويل غير مطابقة")} </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("رقم الحوالة موجود لكن تحت شركة مختلفة")} </p>
          </div>

          <div className="glass-card animate-fade-in-up" style={{ padding: 20, marginBottom: 16, animationDelay: "0.05s" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                padding: "12px 16px",
                background: "rgba(255,107,107,0.06)",
                border: "1px solid rgba(255,107,107,0.2)",
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("اخترت")}</p>
                <p style={{ fontWeight: 700, color: "var(--danger)" }}>{provider?.nameEn || query?.providerId}</p>
              </div>
              <div style={{ textAlign: "center", fontSize: 20 }}>↓</div>
              <div style={{
                padding: "12px 16px",
                background: "rgba(0,212,170,0.08)",
                border: "1px solid rgba(0,212,170,0.2)",
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("الشركة الصحيحة")}</p>
                <p style={{ fontWeight: 700, color: "var(--accent)" }}>
                  {correctProvider?.nameEn || result.expectedProvider}
                </p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>{t("ارجع وغيّر الشركة للمطابقة الصحيحة")} </p>
          </div>

          <button id="btn-go-back-mismatch" className="btn-primary" onClick={() => navigate("/check-remittance")}>{t("إعادة المحاولة باختيار الشركة الصحيحة")} </button>
          <button className="btn-secondary" onClick={() => navigate("/home")} style={{ marginTop: 10 }}>{t("العودة للرئيسية")} </button>
        </div>
      </div>
    );
  }

  // ── Not Found ──────────────────────────────────────────
  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title={t("نتيجة التحقق")} showBack backTo="/check-remittance" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(255,107,107,0.12)",
              border: "2px solid var(--danger)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <XCircle size={36} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--danger)", marginBottom: 4 }}>{t("لم يتم العثور على الحوالة")} </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("لا توجد حوالة بهذا الرقم في النظام حالياً.")} </p>
        </div>

        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: 20, marginBottom: 16, animationDelay: "0.05s" }}
        >
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, textAlign: "center" }}>{t("الرقم الذي أدخلته:")} <strong style={{ direction: "ltr", display: "inline-block" }}>{query?.referenceNumber}</strong>
          </p>
          <div
            style={{
              marginTop: 14, padding: 12,
              background: "rgba(255,107,107,0.06)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <strong>{t("أسباب محتملة:")}</strong>
            <ul style={{ paddingRight: 16, marginTop: 6, lineHeight: 1.8 }}>
              <li>{t("الرقم المرجعي غير صحيح")}</li>
              <li>{t("الحوالة لم تُرسَل بعد")}</li>
              <li>{t("خطأ في اختيار شركة التحويل")}</li><li>{t("المبلغ أو بيانات المستفيد غير متطابقة، أو انتهت صلاحية الحوالة")}</li>
            </ul>
          </div>
        </div>

        <button id="btn-try-again" className="btn-primary" onClick={() => navigate("/check-remittance")}>{t("إعادة المحاولة")} </button>
        <button className="btn-secondary" onClick={() => navigate("/home")} style={{ marginTop: 10 }}>{t("العودة للرئيسية")} </button>
      </div>
    </div>
  );
}

