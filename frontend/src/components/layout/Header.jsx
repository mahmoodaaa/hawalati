import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Wallet } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Header({ title, showBack = false, backTo = -1 }) {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      window.alert(`تم تسجيل الخروج محليًا، لكن تعذر تأكيد إلغاء الجلسة على الخادم: ${error.message}`);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <header
      style={{
        background: "rgba(13,14,26,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(108,99,255,0.15)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Back button */}
        <div style={{ width: 40 }}>
          {showBack && (
            <button
              onClick={() => navigate(backTo)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-secondary)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.color = "var(--primary-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Wallet size={18} color="white" />
          </div>
          <span
            style={{
              fontSize: title ? 17 : 20,
              fontWeight: 700,
              background: "linear-gradient(135deg, var(--primary-light), var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title || "حوالتي"}
          </span>
        </div>

        {/* Logout */}
        <div style={{ width: 40, display: "flex", justifyContent: "flex-end" }}>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              style={{
                background: "rgba(255,107,107,0.1)",
                border: "1px solid rgba(255,107,107,0.2)",
                borderRadius: 10,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--danger)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,107,107,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,107,107,0.1)";
              }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
