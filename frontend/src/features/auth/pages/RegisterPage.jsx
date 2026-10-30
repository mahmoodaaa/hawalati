import { t } from '../../../i18n/translate.js';
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Header from "../../../components/layout/Header";
import { validateRequired, validateNationalId, validatePhone, validateNameEn } from "../../../utils/formatters";
import { JORDANIAN_CITIES } from "../../../data/providers";
import { sendPhoneOtp } from "../../../services/authService";
import { validateDocument } from "../../../services/userService";
import { useAuth } from "../../../context/AuthContext";
import RegistrationSteps from "../components/RegistrationSteps";

const DOC_TYPES = [
  { id: "national_id", label: "الهوية الوطنية", icon: "🪪" },
  { id: "passport", label: "جواز السفر", icon: "📕" },
  { id: "license", label: "رخصة القيادة", icon: "🚗" },
];
const EMPTY_FORM = { fullName: "", fullNameEn: "", nationalId: "", dateOfBirth: "", placeOfBirth: "", address: "", phone: "", documentType: "" };
function FieldErr({ msg }) {
  return msg ? <p role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(msg)}</p> : null;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registrationDraft, setRegistrationDraft, setPendingOtp } = useAuth();
  const { form = EMPTY_FORM, documentFile = null, step = 1 } = registrationDraft || {};
  const TOTAL = 4;
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  function update(key, value) {
    setRegistrationDraft((previous) => ({ ...previous, form: { ...(previous?.form || EMPTY_FORM), [key]: value },
      ...(key === "phone" ? { registrationToken: null, registrationExpiresAt: null, otpSentAt: null } : {}) }));
    setErrors((previous) => ({ ...previous, [key]: null, _global: null }));
  }
  function setStep(value) {
    setRegistrationDraft((previous) => ({ ...previous, form: previous?.form || EMPTY_FORM,
      step: typeof value === "function" ? value(previous?.step || 1) : value }));
  }
  function selectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateDocument(file);
    setErrors((previous) => ({ ...previous, documentFile: error, _global: null }));
    setRegistrationDraft((previous) => ({ ...previous, documentFile: error ? null : file }));
    if (error) event.target.value = "";
  }
  function errorsForStep(number) {
    if (number === 1) return {
      fullName: validateRequired(form.fullName, "الاسم بالعربي"), fullNameEn: validateNameEn(form.fullNameEn),
      nationalId: validateNationalId(form.nationalId), dateOfBirth: validateRequired(form.dateOfBirth, "تاريخ الميلاد") ||
        (new Date(form.dateOfBirth) >= new Date() ? "تاريخ الميلاد يجب أن يكون في الماضي" : null),
      placeOfBirth: validateRequired(form.placeOfBirth, "مكان الميلاد"), address: validateRequired(form.address, "مكان السكن"),
    };
    if (number === 2) return { phone: validatePhone(form.phone) };
    if (number === 3) return { documentType: form.documentType ? null : "اختر نوع الوثيقة", documentFile: validateDocument(documentFile) };
    return {};
  }
  function next() {
    const errors = errorsForStep(step);
    setErrors(errors);
    if (!Object.values(errors).some(Boolean)) setStep(step + 1);
  }
  async function handleSubmit() {
    if (inFlight.current) return;
    for (const number of [1, 2, 3]) {
      const errors = errorsForStep(number);
      if (Object.values(errors).some(Boolean)) { setErrors(errors); setStep(number); return; }
    }
    inFlight.current = true;
    setLoading(true);
    setErrors({});
    try {
      await sendPhoneOtp(form.phone);
      if (!active.current) return;
      setRegistrationDraft((previous) => ({ ...previous, registrationToken: null, registrationExpiresAt: null, otpSentAt: Date.now() }));
      setPendingOtp({ flow: "phone-registration", phone: form.phone });
      navigate("/otp", { state: { flow: "phone-registration" } });
    } catch (error) {
      if (active.current) setErrors({ ...error.fieldErrors, _global: error.message });
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }
  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title={t("إنشاء حساب جديد")} showBack backTo="/" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 40px" }}>

        <div className="animate-fade-in-up" style={{ marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>{t("إنشاء حساب جديد")}</h2>
          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>{t("أنشئ حسابك وابدأ باستلام الحوالات بسهولة")} </p>
          <RegistrationSteps current={step} />
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 22, animationDelay: "0.05s" }}>

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>{t("👤 المعلومات الشخصية")} </h3>

              <div>
                <label className="form-label">{t("الاسم الرباعي بالعربي")}</label>
                <input id="reg-fullname" className="input-field" placeholder={t("أحمد محمد خالد العمري")} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                <FieldErr msg={t(errors.fullName)} />
              </div>

              <div>
                <label className="form-label">Full Name in English</label>
                <input id="reg-fullname-en" className="input-field" placeholder="Ahmad Mohammed Al-Ahmad" value={form.fullNameEn} onChange={(e) => update("fullNameEn", e.target.value)} dir="ltr" />
                <FieldErr msg={t(errors.fullNameEn)} />
              </div>

              <div>
                <label className="form-label">{t("الرقم الوطني")}</label>
                <input id="reg-national-id" className="input-field" placeholder={t("10 أرقام")} value={form.nationalId} onChange={(e) => update("nationalId", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" dir="ltr" />
                <FieldErr msg={t(errors.nationalId)} />
              </div>

              <div>
                <label className="form-label">{t("تاريخ الميلاد")}</label>
                <input id="reg-dob" className="input-field" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)}
                  style={{ colorScheme: "dark" }}
                />
                <FieldErr msg={t(errors.dateOfBirth)} />
              </div>

              <div>
                <label className="form-label">{t("مكان الميلاد")}</label>
                <input id="reg-place-of-birth" className="input-field" placeholder={t("مثال: إربد")} value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} />
                <FieldErr msg={t(errors.placeOfBirth)} />
              </div>

              <div>
                <label className="form-label">{t("مكان السكن الحالي")}</label>
                <select id="reg-address" className="input-field" value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  style={{ colorScheme: "dark", backgroundColor: "rgba(21,22,39,0.95)", color: form.address ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  <option value="">{t("اختر المدينة")}</option>
                  {JORDANIAN_CITIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
                </select>
                <FieldErr msg={t(errors.address)} />
              </div>
            </div>
          )}

          {/* ── STEP 2: Phone ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>{t("📱 بيانات التواصل")} </h3>
              <div>
                <label className="form-label">{t("رقم الهاتف")}</label>
                <input id="reg-phone" className="input-field" placeholder="0791234567" value={form.phone}
                  onChange={(e) => update("phone", e.target.value)} inputMode="tel" dir="ltr" />
                <FieldErr msg={t(errors.phone)} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{t("سيُستخدم لإرسال رمز التحقق OTP")} </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Document Upload ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>{t("📄 تحميل وثيقة الهوية")} </h3>

              {/* Doc type selection */}
              <div>
                <label className="form-label">{t("نوع الوثيقة")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DOC_TYPES.map((d) => (
                    <button key={d.id} id={`doc-${d.id}`}
                      className={`selectable-card ${form.documentType === d.id ? "selected" : ""}`}
                      style={{ flex: 1, textAlign: "center", padding: "12px 8px", fontSize: 12, fontFamily: "Tajawal, sans-serif", cursor: "pointer" }}
                      onClick={() => update("documentType", d.id)}
                    >
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{d.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 11 }}>{t(d.label)}</div>
                    </button>
                  ))}
                </div>
                <FieldErr msg={t(errors.documentType)} />
              </div>

              <div>
                <label className="form-label" htmlFor="reg-document-file">{t("ملف الوثيقة")}</label>
                <input id="reg-document-file" className="input-field" type="file"
                  accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" onChange={selectFile} />
                <FieldErr msg={t(errors.documentFile)} />
                {documentFile && <p style={{ color: "var(--accent)", fontSize: 13, marginTop: 8 }}>{t("ملف محدد:")} {t(documentFile.name)} ({(documentFile.size / 1024).toFixed(1)} KB)
                </p>}
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{t("JPEG / PNG / PDF — حتى 5 ميغابايت. الملف لم يُرفع بعد.")}</p>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{t("اختَر الوثيقة الآن. سيتم رفعها وإكمال KYC التجريبي عند إنشاء الحساب بعد OTP وبيانات الدخول.")} </p>
            </div>
          )}
          {/* ── STEP 4: KYC + Review ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 6 }}>{t("🛡️ معاينة KYC ومراجعة البيانات")} </h3>
              {[
                [t("الاسم بالعربي"),  form.fullName],
                [t("الاسم بالإنجليزي"), form.fullNameEn],
                [t("الرقم الوطني"),   form.nationalId],
                [t("تاريخ الميلاد"),  form.dateOfBirth],
                [t("مكان الميلاد"),   form.placeOfBirth],
                [t("مكان السكن"),     form.address],
                [t("رقم الهاتف"),     form.phone],
                [t("نوع الوثيقة"),    t(DOC_TYPES.find((d) => d.id === form.documentType)?.label)],
                [t("الملف المحدد"), documentFile?.name],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t(k)}</span>
                  <span style={{ fontWeight: 600, direction: "ltr", maxWidth: "60%", textAlign: "end", wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
              
              {errors._global && (
                <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 14px", color: "var(--danger)", fontSize: 13, marginTop: 6 }}>
                  {t(errors._global)}
                </div>
              )}
            </div>
          )}
        </div>

        {step !== 4 && errors._global && <p role="alert" style={{ color: "var(--danger)", marginTop: 12 }}>{t(errors._global)}</p>}
        {/* Navigation buttons */}
        <div className="animate-fade-in-up" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, animationDelay: "0.1s" }}>
          {step < TOTAL ? (
            <button id="btn-next-step" className="btn-primary" onClick={next}>{t("التالي ←")} </button>
          ) : (
            <button id="btn-submit-register" className="btn-accent" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="animate-spin" style={{ width: 18, height: 18, border: "2px solid #0D0E1A", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} />{t("جارٍ إرسال رمز التحقق...")} </span>
              ) : t("إرسال رمز التحقق ←")}
            </button>
          )}

          {step > 1 && (
            <button className="btn-secondary" disabled={loading} onClick={() => setStep((s) => s - 1)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <ChevronLeft size={15} />{t("رجوع")} </button>
          )}
        </div>

        {step === 1 && (
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>{t("لديك حساب؟")}{" "}
            <span onClick={() => navigate("/login")} style={{ color: "var(--primary-light)", cursor: "pointer", fontWeight: 600 }}>{t("تسجيل الدخول")} </span>
          </p>
        )}
      </div>
    </div>
  );
}



