import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requireKyc = false }) {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireKyc && !["VERIFIED", "DEMO_VERIFIED"].includes(currentUser?.kycStatus)) {
    return <Navigate to="/kyc" replace />;
  }

  return children;
}
