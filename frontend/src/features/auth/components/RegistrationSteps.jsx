import { t } from '../../../i18n/translate.js';
const LABELS = ["المعلومات", "الهاتف", "الوثيقة", "المراجعة", "OTP", "بيانات الدخول"];

export default function RegistrationSteps({ current }) {
  return <div aria-label={t(`الخطوة ${current} من 6`)} style={{ marginBottom: 24 }}>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
      {LABELS.map((label, index) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div title={t(label)} aria-current={current === index + 1 ? "step" : undefined}
          style={{ width: 28, height: 28 }} className={`step-dot ${index + 1 === current ? "active" : index + 1 < current ? "completed" : "pending"}`}>
          {index + 1 < current ? "✓" : index + 1}
        </div>
        {index < LABELS.length - 1 && <div style={{ width: 8, height: 2, background: index + 1 < current ? "var(--accent)" : "var(--border)" }} />}
      </div>)}
    </div>
    <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, marginTop: 10 }}>{t(LABELS[current - 1])}</p>
  </div>;
}
