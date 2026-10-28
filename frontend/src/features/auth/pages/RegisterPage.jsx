import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import Header from "../../../components/layout/Header";
import {
  validateRequired,
  validateNationalId,
  validatePhone,
  validateUsername,
  validatePassword,
  validateNameEn,
} from "../../../utils/formatters";
import { JORDANIAN_CITIES } from "../../../data/providers";
import { registerUser } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";

const DOC_TYPES = [
  { id: "national_id", label: "الهوية الوطنية", icon: "🪪" },
  { id: "passport",    label: "جواز السفر",      icon: "📕" },
  { id: "license",     label: "رخصة القيادة",    icon: "🚗" },
];

// ── Step indicator ────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => {
        const num = i + 1;
        const state = num === current ? "active" : num < current ? "completed" : "pending";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className={`step-dot ${state}`}>
              {state === "completed" ? "✓" : num}
            </div>
            {i < total - 1 && (
              <div style={{ width: 28, height: 2, background: num < current ? "var(--accent)" : "var(--border)", borderRadius: 2 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared error display ──────────────────────────────
function FieldErr({ msg }) {
  if (!msg) return null;
  return <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{msg}</p>;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setPendingOtp } = useAuth();
  const [step, setStep] = useState(1);
  const TOTAL = 5;

  const [form, setForm] = useState({
    // Step 1 — personal
    fullName: "", fullNameEn: "", nationalId: "", dateOfBirth: "", placeOfBirth: "", address: "",
    // Step 2 — contact
    phone: "",
    // Step 3 — document
    documentType: "", documentUploaded: false,
    // Step 4 — credentials
    username: "", password: "", confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  // ── Validate per step ─────────────────────────────
  function validateStep() {
    let errs = {};
    if (step === 1) {
      errs.fullName    = validateRequired(form.fullName, "الاسم الرباعي بالعربي");
      errs.fullNameEn  = validateNameEn(form.fullNameEn);
      errs.nationalId  = validateNationalId(form.nationalId);
      errs.dateOfBirth = validateRequired(form.dateOfBirth, "تاريخ الميلاد");
      errs.placeOfBirth = validateRequired(form.placeOfBirth, "مكان الميلاد");
      errs.address     = validateRequired(form.address, "مكان السكن");
    }
    if (step === 2) {
      errs.phone = validatePhone(form.phone);
    }
    if (step === 3) {
      if (!form.documentType)    errs.documentType    = "اختر نوع الوثيقة";

    }
    if (step === 4) {
      errs.username = validateUsername(form.username);
      errs.password = validatePassword(form.password);
      if (!form.confirmPassword)        errs.confirmPassword = "تأكيد كلمة المرور مطلوب";
      else if (form.password !== form.confirmPassword) errs.confirmPassword = "كلمتا المرور غير متطابقتين";
    }
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await registerUser(form);
      setPendingOtp({ username: result.user?.username || form.username, password: form.password,
        purpose: "REGISTER", phone: result.user?.phone || form.phone, from: "/home" });
      setForm((previous) => ({ ...previous, password: "", confirmPassword: "" }));
      navigate("/otp");
    } catch (error) {
      setErrors({ ...error.fieldErrors, _global: error.message });
      const fields = Object.keys(error.fieldErrors || {});
      if (fields.some((field) => ["fullName", "fullNameEn", "nationalId", "dateOfBirth", "placeOfBirth", "address"].includes(field))) setStep(1);
      else if (fields.includes("phone")) setStep(2);
      else if (fields.includes("documentType")) setStep(3);
      else if (fields.length) setStep(4);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title="إنشاء حساب جديد" showBack backTo="/" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 40px" }}>

        <div className="animate-fade-in-up" style={{ marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>إنشاء حساب جديد</h2>
          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
            أنشئ حسابك وابدأ باستلام الحوالات بسهولة
          </p>
          <StepBar current={step} total={TOTAL} />
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 22, animationDelay: "0.05s" }}>

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>
                👤 المعلومات الشخصية
              </h3>

              <div>
                <label className="form-label">الاسم الرباعي بالعربي</label>
                <input id="reg-fullname" className="input-field" placeholder="أحمد محمد خالد العمري" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                <FieldErr msg={errors.fullName} />
              </div>

              <div>
                <label className="form-label">Full Name in English</label>
                <input id="reg-fullname-en" className="input-field" placeholder="Ahmad Mohammed Al-Ahmad" value={form.fullNameEn} onChange={(e) => update("fullNameEn", e.target.value)} dir="ltr" />
                <FieldErr msg={errors.fullNameEn} />
              </div>

              <div>
                <label className="form-label">الرقم الوطني</label>
                <input id="reg-national-id" className="input-field" placeholder="10 أرقام" value={form.nationalId} onChange={(e) => update("nationalId", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" dir="ltr" />
                <FieldErr msg={errors.nationalId} />
              </div>

              <div>
                <label className="form-label">تاريخ الميلاد</label>
                <input id="reg-dob" className="input-field" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)}
                  style={{ colorScheme: "dark" }}
                />
                <FieldErr msg={errors.dateOfBirth} />
              </div>

              <div>
                <label className="form-label">مكان الميلاد</label>
                <input id="reg-place-of-birth" className="input-field" placeholder="مثال: إربد" value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} />
                <FieldErr msg={errors.placeOfBirth} />
              </div>

              <div>
                <label className="form-label">مكان السكن الحالي</label>
                <select id="reg-address" className="input-field" value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  style={{ colorScheme: "dark", backgroundColor: "rgba(21,22,39,0.95)", color: form.address ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  <option value="">اختر المدينة</option>
                  {JORDANIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <FieldErr msg={errors.address} />
              </div>
            </div>
          )}

          {/* ── STEP 2: Phone ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>
                📱 بيانات التواصل
              </h3>
              <div>
                <label className="form-label">رقم الهاتف</label>
                <input id="reg-phone" className="input-field" placeholder="0791234567" value={form.phone}
                  onChange={(e) => update("phone", e.target.value)} inputMode="tel" dir="ltr" />
                <FieldErr msg={errors.phone} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  سيُستخدم لإرسال رمز التحقق OTP
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Document Upload ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>
                📄 تحميل وثيقة الهوية
              </h3>

              {/* Doc type selection */}
              <div>
                <label className="form-label">نوع الوثيقة</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DOC_TYPES.map((d) => (
                    <button key={d.id} id={`doc-${d.id}`}
                      className={`selectable-card ${form.documentType === d.id ? "selected" : ""}`}
                      style={{ flex: 1, textAlign: "center", padding: "12px 8px", fontSize: 12, fontFamily: "Tajawal, sans-serif", cursor: "pointer" }}
                      onClick={() => { update("documentType", d.id); update("documentUploaded", false); }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{d.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 11 }}>{d.label}</div>
                    </button>
                  ))}
                </div>
                <FieldErr msg={errors.documentType} />
              </div>

              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                رفع الوثيقة الفعلي يتم بعد تأكيد رمز OTP وتسجيل الدخول. ربط الرفع هو المرحلة التالية من Sprint 5.
              </p>
            </div>
          )}
          {/* ── STEP 4: Username + Password ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 2 }}>
                🔐 إنشاء بيانات الدخول
              </h3>

              {errors._global && (
                <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 14px", color: "var(--danger)", fontSize: 13 }}>
                  {errors._global}
                </div>
              )}

              <div>
                <label className="form-label">اسم المستخدم (Username)</label>
                <input id="reg-username" className="input-field" placeholder="مثال: ahmad.2024"
                  value={form.username} onChange={(e) => update("username", e.target.value.toLowerCase())} dir="ltr" autoComplete="username" />
                <FieldErr msg={errors.username} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  أحرف إنجليزية وأرقام ونقطة وشرطة سفلية فقط
                </p>
              </div>

              <div>
                <label className="form-label">كلمة المرور</label>
                <div style={{ position: "relative" }}>
                  <input id="reg-password" className="input-field" type={showPass ? "text" : "password"}
                    placeholder="6 أحرف على الأقل" value={form.password}
                    onChange={(e) => update("password", e.target.value)} dir="ltr" style={{ paddingLeft: 44 }} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldErr msg={errors.password} />
              </div>

              <div>
                <label className="form-label">تأكيد كلمة المرور</label>
                <div style={{ position: "relative" }}>
                  <input id="reg-confirm-password" className="input-field" type={showConfirm ? "text" : "password"}
                    placeholder="أعد إدخال كلمة المرور" value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)} dir="ltr" style={{ paddingLeft: 44 }} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldErr msg={errors.confirmPassword} />
              </div>
            </div>
          )}

          {/* ── STEP 5: Review ── */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-light)", marginBottom: 6 }}>
                ✅ مراجعة البيانات
              </h3>
              {[
                ["الاسم بالعربي",  form.fullName],
                ["الاسم بالإنجليزي", form.fullNameEn],
                ["الرقم الوطني",   form.nationalId],
                ["تاريخ الميلاد",  form.dateOfBirth],
                ["مكان الميلاد",   form.placeOfBirth],
                ["مكان السكن",     form.address],
                ["رقم الهاتف",     form.phone],
                ["نوع الوثيقة",    DOC_TYPES.find((d) => d.id === form.documentType)?.label],
                ["اسم المستخدم",   form.username],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                  <span style={{ fontWeight: 600, direction: "ltr", maxWidth: "60%", textAlign: "left", wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
              {errors._global && (
                <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 14px", color: "var(--danger)", fontSize: 13, marginTop: 6 }}>
                  {errors._global}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="animate-fade-in-up" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, animationDelay: "0.1s" }}>
          {step < TOTAL ? (
            <button id="btn-next-step" className="btn-primary" onClick={next}>
              التالي ←
            </button>
          ) : (
            <button id="btn-submit-register" className="btn-accent" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="animate-spin" style={{ width: 18, height: 18, border: "2px solid #0D0E1A", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} />
                  جارٍ إنشاء الحساب...
                </span>
              ) : "إرسال رمز التحقق ←"}
            </button>
          )}

          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep((s) => s - 1)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <ChevronLeft size={15} /> رجوع
            </button>
          )}
        </div>

        {step === 1 && (
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
            لديك حساب؟{" "}
            <span onClick={() => navigate("/login")} style={{ color: "var(--primary-light)", cursor: "pointer", fontWeight: 600 }}>
              تسجيل الدخول
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

