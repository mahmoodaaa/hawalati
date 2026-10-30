import { t } from '../../../i18n/translate.js';
import { Link } from "react-router-dom";
import Header from "../../../components/layout/Header";

export default function RegistrationRestart() {
  return <div className="bg-animated" style={{ minHeight: "100vh" }}>
    <Header title={t("إكمال التسجيل")} />
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>
      <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
        <h2 style={{ fontSize: 22, marginBottom: 14 }}>{t("نحتاج بيانات التسجيل مجددًا")}</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 20 }}>{t("تُحفظ المعلومات والوثيقة مؤقتًا خلال التسجيل. بعد تحديث الصفحة أو مغادرة التسجيل، أعد إدخال بياناتك واختيار الوثيقة. لم يكتمل إنشاء الحساب بعد.")} </p>
        <Link to="/register" replace className="btn-primary">{t("بدء التسجيل مجددًا")}</Link>
        <Link to="/login" style={{ display: "block", marginTop: 16, color: "var(--primary-light)" }}>{t("لدي حساب — تسجيل الدخول")}</Link>
      </div>
    </div>
  </div>;
}
