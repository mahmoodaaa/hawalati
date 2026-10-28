import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Auth pages
import WelcomePage from "./features/auth/pages/WelcomePage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import LoginPage from "./features/auth/pages/LoginPage";
import OtpPage from "./features/auth/pages/OtpPage";

// KYC
import KycPage from "./features/kyc/pages/KycPage";

// Remittance pages
import HomePage from "./features/remittance/pages/HomePage";
import CheckRemittancePage from "./features/remittance/pages/CheckRemittancePage";
import RemittanceResultPage from "./features/remittance/pages/RemittanceResultPage";
import DestinationPage from "./features/remittance/pages/DestinationPage";
import ReviewPage from "./features/remittance/pages/ReviewPage";
import SuccessPage from "./features/remittance/pages/SuccessPage";
import HistoryPage from "./features/remittance/pages/HistoryPage";
import ProfilePage from "./features/auth/pages/ProfilePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/otp" element={<OtpPage />} />

          {/* Semi-protected: KYC (user logged in but needs KYC) */}
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KycPage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check-remittance"
            element={
              <ProtectedRoute requireKyc>
                <CheckRemittancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/remittance-result"
            element={
              <ProtectedRoute requireKyc>
                <RemittanceResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/destination"
            element={
              <ProtectedRoute requireKyc>
                <DestinationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute requireKyc>
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/success"
            element={
              <ProtectedRoute requireKyc>
                <SuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


