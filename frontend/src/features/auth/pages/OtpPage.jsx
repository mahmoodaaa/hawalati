import { t } from '../../../i18n/translate.js';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import Header from "../../../components/layout/Header";
import RegistrationRestart from "../components/RegistrationRestart";
import RegistrationSteps from "../components/RegistrationSteps";
import OtpInput from "../../../components/ui/OtpInput";
import { verifyOtp, resendOtp, verifyPhoneOtp, sendPhoneOtp } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";
import { maskPhone } from "../../../utils/formatters";

export default function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, pendingOtp, isAuthenticated, registrationDraft, setRegistrationDraft } = useAuth();
  const registrationFlow = location.state?.flow === "phone-registration" || pendingOtp?.flow === "phone-registration";
  const missingRegistration = registrationFlow && !registrationDraft?.documentFile;
  const inFlight = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const phone = registrationFlow ? registrationDraft?.form?.phone : pendingOtp?.phone;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(() => registrationFlow ? Math.max(0, Math.ceil((60000 - (Date.now() - (registrationDraft?.otpSentAt || 0))) / 1000)) : 60);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Guard: if no user state, go back
  useEffect(() => {
    if (!registrationFlow && !pendingOtp && !isAuthenticated) navigate("/login", { replace: true });
  }, [registrationFlow, pendingOtp, isAuthenticated, navigate]);

  async function handleVerify() {
    if (inFlight.current || (registrationFlow ? missingRegistration : !pendingOtp)) return;
    if (otp.length < 6) {
      setError("أدخل الرمز المكون من 6 أرقام");
      return;
    }
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      if (registrationFlow) {
        const result = await verifyPhoneOtp(phone, otp);
        if (!active.current) return;
        if (!result?.registrationToken || !(result.expiresIn > 0)) throw new Error("لم يُرجع الخادم تصريح تسجيل صالحًا. أعد إرسال الرمز.");
        setRegistrationDraft((previous) => ({ ...previous, registrationToken: result.registrationToken,
          registrationExpiresAt: Date.now() + result.expiresIn * 1000 }));
        navigate("/create-credentials", { replace: true });
      } else {
        const result = await verifyOtp(pendingOtp.username, otp);
        if (!active.current) return;
        const user = await login(result);
        const destination = pendingOtp.from?.startsWith("/") && !pendingOtp.from.startsWith("//") ? pendingOtp.from : "/home";
        navigate(["VERIFIED", "DEMO_VERIFIED"].includes(user.kycStatus) ? destination : "/kyc", { replace: true });
      }
    } catch (error) {
      if (active.current) setError(error.message);
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }

  async function handleResend() {
    if (inFlight.current || countdown > 0 || (registrationFlow ? missingRegistration : !pendingOtp)) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      if (registrationFlow) {
        await sendPhoneOtp(phone);
        if (!active.current) return;
        setRegistrationDraft((previous) => ({ ...previous, registrationToken: null, registrationExpiresAt: null, otpSentAt: Date.now() }));
      } else {
        await resendOtp(pendingOtp.username, pendingOtp.password);
      }
      setCountdown(60);
      setOtp("");
    } catch (error) {
      if (active.current) setError(error.message);
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }

  if (missingRegistration) return <RegistrationRestart />;

  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header showBack backTo={registrationFlow ? "/register" : "/login"} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        {registrationFlow && <RegistrationSteps current={5} />}
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,170,0.15))",
              border: "1px solid rgba(108,99,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 32,
            }}
          >
            📱
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{t("التحقق برمز OTP")}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{t("أدخل الرمز المرسل إلى رقمك")} </p>
          {phone && (
            <p
              style={{
                marginTop: 6,
                fontSize: 15,
                fontWeight: 700,
                color: "var(--primary-light)",
                direction: "ltr",
                letterSpacing: 1,
              }}
            >
              {maskPhone(phone)}
            </p>
          )}
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 28, animationDelay: "0.05s" }}>
          {/* Demo reminder */}
          <div
            style={{
              background: "rgba(0,212,170,0.08)",
              border: "1px solid rgba(0,212,170,0.25)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--accent)",
              textAlign: "center",
              marginBottom: 24,
            }}
          >{t("🎯 الرمز التجريبي:")} <strong style={{ fontSize: 18, letterSpacing: 3 }}>123456</strong>
          </div>

          <OtpInput value={otp} onChange={setOtp} />

          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: 13,
                textAlign: "center",
                marginTop: 14,
                padding: "8px 12px",
                background: "rgba(255,107,107,0.08)",
                borderRadius: 8,
              }}
            >
              {t(error)}
            </p>
          )}

          <button
            id="btn-verify-otp"
            className="btn-primary"
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            style={{ marginTop: 24 }}
          >
            {loading ? t("جارٍ التحقق...") : t("تأكيد الرمز →")}
          </button>

          {/* Resend */}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            {countdown > 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("إعادة الإرسال بعد")}{" "}
                <span style={{ color: "var(--primary-light)", fontWeight: 700 }}>{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary-light)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  margin: "0 auto",
                }}
              >
                <RefreshCw size={13} />{t("إعادة إرسال الرمز")} </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

