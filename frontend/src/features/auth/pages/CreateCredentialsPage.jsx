import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import Header from "../../../components/layout/Header";
import { useAuth } from "../../../context/AuthContext";
import { completeRegistration, sendPhoneOtp } from "../../../services/authService";
import { validatePassword, validateUsername } from "../../../utils/formatters";
import RegistrationRestart from "../components/RegistrationRestart";
import RegistrationSteps from "../components/RegistrationSteps";

export default function CreateCredentialsPage() {
  const navigate = useNavigate();
  const { registrationDraft, setRegistrationDraft, setPendingOtp, login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [now, setNow] = useState(Date.now);
  const inFlight = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const tokenExpired = !registrationDraft?.registrationToken || !registrationDraft?.registrationExpiresAt
    || now >= registrationDraft.registrationExpiresAt;
  useEffect(() => {
    const remaining = (registrationDraft?.registrationExpiresAt || 0) - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining + 10);
    return () => clearTimeout(timer);
  }, [registrationDraft?.registrationExpiresAt]);

  function update(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: null, _global: null }));
  }

  async function reverifyPhone() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSendingOtp(true);
    setErrors({});
    try {
      await sendPhoneOtp(registrationDraft.form.phone);
      if (!active.current) return;
      setRegistrationDraft((previous) => ({ ...previous, registrationToken: null, registrationExpiresAt: null, otpSentAt: Date.now() }));
      setPendingOtp({ flow: "phone-registration", phone: registrationDraft.form.phone });
      navigate("/otp", { replace: true, state: { flow: "phone-registration" } });
    } catch (error) {
      if (active.current) setErrors({ _global: error.message });
    } finally {
      inFlight.current = false;
      if (active.current) setSendingOtp(false);
    }
  }

  async function handleComplete(event) {
    event.preventDefault();
    if (inFlight.current) return;
    if (tokenExpired || Date.now() >= registrationDraft.registrationExpiresAt) {
      setNow(Date.now());
      setErrors({ _global: "انتهى تصريح التسجيل. أعد تأكيد رقم الهاتف للمتابعة؛ بياناتك والوثيقة ما زالت محفوظة مؤقتًا." }); return;
    }
    const validation = {
      username: validateUsername(form.username) || (form.username.trim().length > 50 ? "اسم المستخدم يجب ألا يتجاوز 50 حرفًا" : null),
      password: validatePassword(form.password),
      confirmPassword: !form.confirmPassword ? "تأكيد كلمة المرور مطلوب" : form.password !== form.confirmPassword ? "كلمتا المرور غير متطابقتين" : null,
    };
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const result = await completeRegistration(registrationDraft.registrationToken,
        { ...registrationDraft.form, username: form.username.trim(), password: form.password }, registrationDraft.documentFile);
      if (!active.current) return;
      // This trusted completion response already contains the server profile.
      // Avoid repeating a completed registration if a separate profile GET fails.
      await login(result, { useResponseUser: true });
      setForm({ username: "", password: "", confirmPassword: "" });
      navigate("/home", { replace: true });
    } catch (error) {
      if (!active.current) return;
      const fields = Object.fromEntries(Object.entries(error.fieldErrors || {}).map(([key, message]) => [key.replace(/^registration\./, ""), message]));
      setErrors({ ...fields, _global: [error.message, ...new Set(Object.values(fields))].filter(Boolean).join(" ") });
      if ([401, 403].includes(error.status)) {
        setRegistrationDraft((previous) => ({ ...previous, registrationToken: null, registrationExpiresAt: null }));
      }
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }

  if (isAuthenticated) return <Navigate to="/home" replace />;
  if (!registrationDraft?.documentFile || !registrationDraft?.form?.phone) return <RegistrationRestart />;

  return <div className="bg-animated" style={{ minHeight: "100vh" }}>
    <Header title="إنشاء بيانات الدخول" />
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>
      <RegistrationSteps current={6} />
      <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, var(--primary), var(--accent))",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><LockKeyhole size={30} color="white" /></div>
        <h2 style={{ fontSize: 23, fontWeight: 800, marginBottom: 8 }}>إنشاء بيانات الدخول</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>تم تأكيد هاتفك. اختر اسم المستخدم وكلمة المرور لإكمال إنشاء الحساب ورفع الوثيقة.</p>
      </div>
      <form onSubmit={handleComplete} className="glass-card animate-fade-in-up" style={{ padding: 24 }}>
        <fieldset disabled={loading || sendingOtp} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <label htmlFor="create-username" className="form-label">اسم المستخدم</label>
          <input id="create-username" className="input-field" autoComplete="username" dir="ltr" maxLength={50}
            value={form.username} onChange={(event) => update("username", event.target.value)} />
          {errors.username && <p role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{errors.username}</p>}
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>4–50 حرفًا: أحرف إنجليزية وأرقام ومسافات ونقطة وشرطة سفلية.</p>
          {[{ key: "password", label: "كلمة المرور" }, { key: "confirmPassword", label: "تأكيد كلمة المرور" }].map(({ key, label }) => <div key={key} style={{ marginTop: 18 }}>
            <label htmlFor={`create-${key}`} className="form-label">{label}</label>
            <div style={{ position: "relative" }}>
              <input id={`create-${key}`} className="input-field" type={showPassword ? "text" : "password"} autoComplete="new-password" dir="ltr"
                style={{ paddingLeft: 44 }} value={form[key]} onChange={(event) => update(key, event.target.value)} />
              <button type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword((value) => !value)}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors[key] && <p role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{errors[key]}</p>}
          </div>)}
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>كلمة المرور 6 أحرف على الأقل.</p>
          {tokenExpired && <div role="status" style={{ color: "var(--warning)", marginTop: 18, lineHeight: 1.8 }}>
            تصريح التسجيل غير متاح أو منتهي الصلاحية. أعد تأكيد الهاتف، ثم أكمل بيانات الدخول.
            <button type="button" className="btn-secondary" onClick={reverifyPhone} style={{ marginTop: 10 }}>
              {sendingOtp ? "جارٍ إرسال الرمز…" : "إرسال رمز جديد وتأكيد الهاتف"}
            </button>
          </div>}
          {errors._global && <p role="alert" style={{ color: "var(--danger)", marginTop: 16, lineHeight: 1.8 }}>{errors._global}</p>}
          <p style={{ background: "rgba(255,217,61,0.08)", color: "var(--warning)", padding: 12, borderRadius: 10, fontSize: 12, marginTop: 18, lineHeight: 1.8 }}>
            عند إنشاء الحساب، تُرسل المعلومات والوثيقة للخادم لإكمال KYC التجريبي. لم يتم حفظ الحساب أو التحقق من الهوية بعد.
          </p>
          <button id="btn-complete-registration" className="btn-primary" type="submit" disabled={tokenExpired || loading || sendingOtp} style={{ marginTop: 20 }}>
            {loading ? "جارٍ إنشاء الحساب ورفع الوثيقة…" : "إنشاء الحساب والمتابعة إلى الرئيسية"}
          </button>
          <button type="button" className="btn-secondary" style={{ marginTop: 10 }} onClick={() => navigate("/register")}>رجوع لمراجعة البيانات</button>
        </fieldset>
      </form>
      <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16, textAlign: "center", lineHeight: 1.8 }}>إذا انقطع الاتصال بعد الإرسال وكان الحساب قد أُنشئ، يمكنك <Link to="/login" style={{ color: "var(--primary-light)" }}>تسجيل الدخول</Link> ببياناتك.</p>
    </div>
  </div>;
}
