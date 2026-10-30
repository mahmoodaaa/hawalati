import { t } from '../../../i18n/translate.js';
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, DollarSign } from "lucide-react";
import Header from "../../../components/layout/Header";
import { lookupRemittance } from "../../../services/remittanceService";
import { validateRequired, validateAmount } from "../../../utils/formatters";
import { LOCAL_PROVIDERS, INTERNATIONAL_PROVIDERS } from "../../../data/providers";
import { EXCHANGE_PROVIDERS } from "../../../data/providers";

export default function CheckRemittancePage() {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState(""); // 'local' | 'international'
  const [providerId, setProviderId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [approxAmount, setApproxAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const inFlight = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const providers = sourceType === "local" ? LOCAL_PROVIDERS : INTERNATIONAL_PROVIDERS;
  const selectedProvider = EXCHANGE_PROVIDERS.find((p) => p.id === providerId);

  function validate() {
    const errs = {};
    if (!sourceType) errs.sourceType = "اختر نوع المصدر";
    if (!providerId) errs.providerId = "اختر الجهة المُرسِلة";
    errs.referenceNumber = validateRequired(referenceNumber, "رقم الحوالة");
    errs.approxAmount = validateAmount(approxAmount) || (!Number.isFinite(Number(approxAmount)) || Number(approxAmount) < 0.01 ? "أدخل مبلغًا صحيحًا بالدينار الأردني" : null);
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  }

  async function handleCheck() {
    if (inFlight.current || !validate()) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const query = { referenceNumber: referenceNumber.trim(), providerId, approxAmount: Number(approxAmount) };
      const result = await lookupRemittance(query);
      if (!active.current) return;
      navigate("/remittance-result", { state: { result, query } });
    } catch (error) {
      if (active.current) setErrors({ ...error.fieldErrors, _global: error.message });
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }
  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title={t("فحص الحوالة")} showBack backTo="/home" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div className="animate-fade-in-up" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{t("استلام حوالة")}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("أدخل بيانات الحوالة للتحقق منها")} </p>
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 24, animationDelay: "0.05s" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Source type */}
            <div>
              <label className="form-label">{t("نوع المصدر")}</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { value: "local", label: "🏦 Local Exchange" },
                  { value: "international", label: "🌐 International Network" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    id={`source-type-${opt.value}`}
                    className={`selectable-card ${sourceType === opt.value ? "selected" : ""}`}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "14px 10px",
                      fontSize: 13,
                      fontFamily: "Tajawal, sans-serif",
                      cursor: "pointer",
                      fontWeight: sourceType === opt.value ? 700 : 500,
                    }}
                    onClick={() => {
                      setSourceType(opt.value);
                      setProviderId("");
                      setErrors((e) => ({ ...e, sourceType: null, providerId: null }));
                    }}
                  >
                    {t(opt.label)}
                  </button>
                ))}
              </div>
              {errors.sourceType && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.sourceType)}</p>
              )}
            </div>

            {/* Provider selection */}
            {sourceType && (
              <div>
                <label className="form-label">
                  {sourceType === "local" ? "Exchange Company" : "Transfer Network"}
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      id={`provider-${p.id}`}
                      className={`selectable-card ${providerId === p.id ? "selected" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        fontFamily: "Tajawal, sans-serif",
                        cursor: "pointer",
                        textAlign: "start",
                      }}
                      onClick={() => {
                        setProviderId(p.id);
                        setErrors((e) => ({ ...e, providerId: null }));
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{p.logo}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t(p.nameEn)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t(p.nameAr) || ""}</div>
                      </div>
                      {providerId === p.id && (
                        <span style={{ marginInlineStart: "auto", color: "var(--primary-light)", fontSize: 18 }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {errors.providerId && (
                  <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.providerId)}</p>
                )}
              </div>
            )}

            {/* Reference number */}
            {providerId && (
              <>
                <div>
                  <label className="form-label">
                    {selectedProvider?.referenceLabel || t("رقم الحوالة")}
                  </label>
                  <input
                    id="input-reference-number"
                    className="input-field"
                    placeholder={selectedProvider?.referencePlaceholder || t("أدخل رقم الحوالة")}
                    value={referenceNumber}
                    onChange={(e) => {
                      setReferenceNumber(e.target.value);
                      setErrors((er) => ({ ...er, referenceNumber: null }));
                    }}
                    dir="ltr"
                  />
                  {errors.referenceNumber && (
                    <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.referenceNumber)}</p>
                  )}
                </div>

                <div>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <DollarSign size={14} style={{ color: "var(--primary-light)" }} />{t("المبلغ التقريبي (JOD)")} </label>
                  <input
                    id="input-approx-amount"
                    className="input-field"
                    placeholder={t("مثال: 200")}
                    value={approxAmount}
                    onChange={(e) => {
                      setApproxAmount(e.target.value.replace(/[^0-9.]/g, ""));
                      setErrors((er) => ({ ...er, approxAmount: null }));
                    }}
                    inputMode="decimal"
                    dir="ltr"
                  />
                  {errors.approxAmount && (
                    <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.approxAmount)}</p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{t("أدخل القيمة بالدينار الأردني JOD مهما كانت عملة الحوالة الأصلية")} </p>
                </div>
              </>
            )}
          </div>
        </div>

        {errors._global && <p role="alert" style={{ color: "var(--danger)", marginTop: 14 }}>{t(errors._global)}</p>}
        <button
          id="btn-check-remittance"
          className="btn-primary animate-fade-in-up"
          onClick={handleCheck}
          disabled={loading}
          style={{ marginTop: 16, animationDelay: "0.1s" }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span
                className="animate-spin"
                style={{ width: 18, height: 18, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }}
              />{t("جارٍ التحقق...")} </span>
          ) : (
            <>
              <Search size={16} style={{ display: "inline", marginInlineEnd: 6 }} />{t("التحقق من الحوالة")} </>
          )}
        </button>
      </div>
    </div>
  );
}

