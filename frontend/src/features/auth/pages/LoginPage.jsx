import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginUser } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPendingOtp } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await loginUser(username.trim(), password);
      setPendingOtp({ username: result.user?.username || username.trim(), password,
        purpose: "LOGIN", phone: result.user?.phone, from: location.state?.from || "/home" });
      setPassword("");
      navigate("/otp");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bg-animated"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        {/* Logo */}
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: 22,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 8px 30px rgba(108,99,255,0.35)",
              fontSize: 32,
            }}
          >
            👋
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>أهلاً بعودتك!</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            أدخل بياناتك لتسجيل الدخول وإدارة حوالاتك
          </p>
        </div>

        {/* Form */}
        <form
          className="glass-card animate-fade-in-up"
          onSubmit={handleLogin}
          style={{ padding: 24, animationDelay: "0.08s" }}
        >
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>🪪</span> اسم المستخدم
            </label>
            <input
              id="input-username"
              className="input-field"
              placeholder="مثال: ahmad.demo"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              autoComplete="username"
              dir="ltr"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔒</span> كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="input-password"
                className="input-field"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                dir="ltr"
                style={{ paddingLeft: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", padding: 4,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(255,107,107,0.1)",
                border: "1px solid rgba(255,107,107,0.3)",
                borderRadius: 10, padding: "10px 14px",
                color: "var(--danger)", fontSize: 13,
                marginBottom: 16, textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Demo hint */}
          <div
            style={{
              background: "rgba(255,217,61,0.07)",
              border: "1px solid rgba(255,217,61,0.2)",
              borderRadius: 10, padding: "8px 14px",
              marginBottom: 16,
              fontSize: 12, color: "var(--warning)",
              display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            <span style={{ fontWeight: 700 }}>💡 استخدم حسابًا مسجلًا على الباك، أو أنشئ حسابًا جديدًا.</span>
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="animate-spin" style={{ width: 18, height: 18, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} />
                جارٍ التحقق...
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <LogIn size={16} />
                تسجيل الدخول ←
              </span>
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-secondary)" }}>
          ليس لديك حساب؟{" "}
          <span
            onClick={() => navigate("/register")}
            style={{ color: "var(--primary-light)", cursor: "pointer", fontWeight: 600 }}
          >
            إنشاء حساب جديد
          </span>
        </p>
      </div>
    </div>
  );
}
