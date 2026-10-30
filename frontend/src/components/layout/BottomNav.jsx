import { t } from '../../i18n/translate.js';
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Clock, User } from "lucide-react";

const TABS = [
  { path: "/home",    icon: Home,  label: "الرئيسية" },
  { path: "/history", icon: Clock, label: "السجل"    },
  { path: "/profile", icon: User,  label: "ملفي"     },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(13,14,26,0.97)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(108,99,255,0.18)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: 64,
        zIndex: 100,
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            id={`nav-${label}`}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
              color: active ? "var(--primary-light)" : "var(--text-muted)",
              transition: "color 0.2s",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 32,
                borderRadius: 10,
                background: active ? "rgba(108,99,255,0.15)" : "transparent",
                transition: "background 0.25s",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {active && (
                <span
                  style={{
                    position: "absolute",
                    bottom: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--primary-light)",
                  }}
                />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{t(label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
