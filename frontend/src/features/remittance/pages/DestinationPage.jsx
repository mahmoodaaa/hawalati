import { t } from '../../../i18n/translate.js';
import { isRemittanceId } from "../../../services/remittanceService";
import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Building2, Smartphone } from "lucide-react";
import Header from "../../../components/layout/Header";
import { BANKS, WALLETS } from "../../../data/providers";
import { validateRequired, validateIban, validatePhone } from "../../../utils/formatters";

function BankForm({ data, onChange, errors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
      <div>
        <label className="form-label">{t("البنك")}</label>
        <select
          id="bank-select"
          className="input-field"
          value={data.bankId || ""}
          onChange={(e) => onChange({ ...data, bankId: e.target.value, bankName: BANKS.find(b => b.id === e.target.value)?.name || "" })}
          style={{ colorScheme: "dark" }}
        >
          <option value="">{t("اختر البنك")}</option>
          {BANKS.map((b) => (
            <option key={b.id} value={b.id}>{t(b.name)}</option>
          ))}
        </select>
        {errors?.bankId && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.bankId)}</p>}
      </div>

      <div>
        <label className="form-label">{t("رقم IBAN")}</label>
        <input
          id="bank-iban"
          className="input-field"
          placeholder="JO94CBJO0010000000012345678901"
          value={data.iban || ""}
          onChange={(e) => onChange({ ...data, iban: e.target.value.toUpperCase().replace(/\s/g, "") })}
          dir="ltr"
          style={{ fontFamily: "monospace", letterSpacing: 1 }}
        />
        {errors?.iban && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.iban)}</p>}
      </div>

      <div>
        <label className="form-label">{t("اسم صاحب الحساب")}</label>
        <input
          id="bank-account-name"
          className="input-field"
          placeholder={t("كما هو في البنك")}
          value={data.accountName || ""}
          onChange={(e) => onChange({ ...data, accountName: e.target.value })}
        />
        {errors?.accountName && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.accountName)}</p>}
      </div>
    </div>
  );
}

function WalletForm({ data, onChange, errors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
      <div>
        <label className="form-label">{t("المحفظة الإلكترونية")}</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WALLETS.map((w) => (
            <button
              key={w.id}
              id={`wallet-${w.id}`}
              type="button"
              aria-pressed={data.walletId === w.id}
              className={`selectable-card ${data.walletId === w.id ? "selected" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "Tajawal, sans-serif",
                cursor: "pointer",
                textAlign: "start",
              }}
              onClick={() => onChange({ ...data, walletId: w.id, walletName: w.name })}
            >
              <span aria-hidden="true" style={{ width: 64, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: w.logo ? "#fff" : "transparent", borderRadius: 8, padding: w.logo ? 6 : 0 }}>
                {w.logo ? <img src={w.logo} alt="" width={52} height={36} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 24 }}>{w.icon}</span>}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t(w.name)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t(w.nameEn)}</div>
              </div>
              {data.walletId === w.id && (
                <span style={{ marginInlineStart: "auto", color: "var(--primary-light)", fontSize: 18 }}>✓</span>
              )}
            </button>
          ))}
        </div>
        {errors?.walletId && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.walletId)}</p>}
      </div>

      <div>
        <label className="form-label">{t("رقم الهاتف المرتبط بالمحفظة")}</label>
        <input
          id="wallet-phone"
          className="input-field"
          placeholder="0791234567"
          value={data.walletPhone || ""}
          onChange={(e) => onChange({ ...data, walletPhone: e.target.value })}
          inputMode="tel"
          dir="ltr"
        />
        {errors?.walletPhone && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.walletPhone)}</p>}
      </div>
    </div>
  );
}

export default function DestinationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { remittance, query, destination: previousDestination } = location.state || {};

  const [destType, setDestType] = useState(previousDestination?.type || ""); // bank | wallet
  const [bankData, setBankData] = useState(previousDestination?.type === "bank" ? previousDestination.details : {});
  const [walletData, setWalletData] = useState(previousDestination?.type === "wallet" ? previousDestination.details : {});
  const [errors, setErrors] = useState({});

  if (!isRemittanceId(remittance?.id) || remittance?.status !== "AVAILABLE") return <Navigate to="/check-remittance" replace />;

  function validate() {
    const errs = {};
    if (!destType) {
      errs.destType = "اختر وجهة الاستلام";
      setErrors(errs);
      return false;
    }
    if (destType === "bank") {
      errs.bankId = validateRequired(bankData.bankId, "البنك");
      errs.iban = validateIban(bankData.iban) || (!/^JO[0-9A-Z]{28}$/.test((bankData.iban || "").replace(/\s/g, "").toUpperCase()) ? "أدخل IBAN أردنيًا من 30 خانة" : null);
      errs.accountName = validateRequired(bankData.accountName, "اسم صاحب الحساب") || (bankData.accountName?.trim().length > 120 ? "اسم صاحب الحساب يجب ألا يتجاوز 120 حرفًا" : null);
    } else {
      errs.walletId = validateRequired(walletData.walletId, "المحفظة");
      errs.walletPhone = validatePhone(walletData.walletPhone);
    }
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  }

  function handleContinue() {
    if (!validate()) return;
    const destination = {
      type: destType,
      details: destType === "bank" ? { ...bankData, iban: bankData.iban.replace(/\s/g, "").toUpperCase(), accountName: bankData.accountName.trim() } : { ...walletData, walletPhone: walletData.walletPhone.replace(/[\s-]/g, "") },
    };
    navigate("/review", { state: { remittance, query, destination } });
  }

  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title={t("وجهة الاستلام")} showBack backTo="/remittance-result" backState={{ result: { status: "AVAILABLE", remittance }, query }} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div className="animate-fade-in-up" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{t("أين تريد استلام المبلغ؟")}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("اختر الحساب البنكي أو محفظتك الإلكترونية")} </p>
        </div>

        {/* Destination type */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 20, animationDelay: "0.05s" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: errors.destType ? 6 : 0 }}>
            {[
              { type: "bank", icon: <Building2 size={22} />, label: t("حساب بنكي"), sub: "IBAN" },
              { type: "wallet", icon: <Smartphone size={22} />, label: t("محفظة إلكترونية"), sub: t("زين كاش، أورنج...") },
            ].map((opt) => (
              <button
                key={opt.type}
                id={`dest-type-${opt.type}`}
                className={`selectable-card ${destType === opt.type ? "selected" : ""}`}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "18px 10px",
                  fontFamily: "Tajawal, sans-serif",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setDestType(opt.type);
                  setErrors({});
                }}
              >
                <div style={{ color: destType === opt.type ? "var(--primary-light)" : "var(--text-secondary)" }}>
                  {opt.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t(opt.label)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.sub}</div>
              </button>
            ))}
          </div>
          {errors.destType && (
            <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 5 }}>{t(errors.destType)}</p>
          )}

          {/* Conditional form */}
          {destType === "bank" && (
            <BankForm data={bankData} onChange={setBankData} errors={errors} />
          )}
          {destType === "wallet" && (
            <WalletForm data={walletData} onChange={setWalletData} errors={errors} />
          )}
        </div>

        <button
          id="btn-continue-to-review"
          className="btn-primary animate-fade-in-up"
          onClick={handleContinue}
          style={{ marginTop: 16, animationDelay: "0.1s" }}
        >{t("مراجعة التفاصيل ←")} </button>
      </div>
    </div>
  );
}

