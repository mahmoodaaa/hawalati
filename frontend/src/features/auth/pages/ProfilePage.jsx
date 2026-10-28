import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Save, X, CheckCircle, Eye, EyeOff } from "lucide-react";
import Header from "../../../components/layout/Header";
import BottomNav from "../../../components/layout/BottomNav";
import { useAuth } from "../../../context/AuthContext";
import { updateUserProfile } from "../../../services/authService";
import {
  validatePhone,
  validateUsername,
  validatePassword,
  validateNameEn,
  validateRequired,
} from "../../../utils/formatters";
import { JORDANIAN_CITIES } from "../../../data/providers";

const DOC_LABELS = {
  national_id: "🪪 الهوية الوطنية",
  passport:    "📕 جواز السفر",
  license:     "🚗 رخصة القيادة",
};

function InfoRow({ label, value, locked }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 14px",
        background: locked ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
        borderRadius: 10,
        marginBottom: 6,
        border: `1px solid ${locked ? "rgba(255,255,255,0.04)" : "var(--border)"}`,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, direction: "ltr", color: locked ? "var(--text-muted)" : "var(--text-primary)" }}>
        {value || "—"} {locked && "🔒"}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    fullName:    currentUser?.fullName    || "",
    fullNameEn:  currentUser?.fullNameEn  || "",
    phone:       currentUser?.phone       || "",
    placeOfBirth:currentUser?.placeOfBirth|| "",
    address:     currentUser?.address     || "",
    username:    currentUser?.username    || "",
    password:    "",
    dateOfBirth: currentUser?.dateOfBirth || "",
  });
  const [errors, setErrors] = useState({});

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function validate() {
    const errs = {};
    errs.fullName    = validateRequired(form.fullName, "الاسم بالعربي");
    errs.fullNameEn  = validateNameEn(form.fullNameEn);
    errs.phone       = validatePhone(form.phone);
    errs.placeOfBirth = validateRequired(form.placeOfBirth, "مكان الميلاد");
    errs.address     = validateRequired(form.address, "مكان السكن");
    errs.username    = validateUsername(form.username);
    if (form.password) errs.password = validatePassword(form.password);
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  }

  async function handleSave() {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const updates = { ...form };
      if (!updates.password) delete updates.password; // don't overwrite if empty
      await updateUserProfile(currentUser.id, updates);
      await refreshUser();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setErrors({ ...error.fieldErrors, _global: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="bg-animated" style={{ minHeight: "100vh", paddingBottom: 80 }}>
      <Header title="الملف الشخصي" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px" }}>

        {/* Avatar card */}
        <div
          className="animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,170,0.12))",
            border: "1px solid rgba(108,99,255,0.25)",
            borderRadius: 20, padding: 20, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 16,
          }}
        >
          <div
            style={{
              width: 60, height: 60, borderRadius: 18,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 800, color: "white", flexShrink: 0,
            }}
          >
            {currentUser.fullName?.charAt(0) || "؟"}
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>{currentUser.fullName}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", direction: "ltr" }}>@{currentUser.username || "—"}</p>
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <span className="badge badge-success" style={{ fontSize: 10 }}>✓ KYC موثّق</span>
              <span className="badge badge-primary" style={{ fontSize: 10 }}>حوالتي Demo</span>
            </div>
          </div>
        </div>

        {errors._global && <p role="alert" style={{ color: "var(--danger)" }}>{errors._global}</p>}
        {/* Saved notice */}
        {saved && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(107,203,119,0.1)", border: "1px solid rgba(107,203,119,0.3)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 14,
              color: "var(--success)", fontSize: 13,
            }}
          >
            <CheckCircle size={16} />
            تم حفظ التغييرات بنجاح ✅
          </div>
        )}

        {/* Edit toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>بياناتي الشخصية</h3>
          {!editing ? (
            <button
              id="btn-edit-profile"
              onClick={() => setEditing(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.25)",
                borderRadius: 10, padding: "6px 14px", cursor: "pointer",
                color: "var(--primary-light)", fontSize: 13, fontWeight: 600,
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              <Edit2 size={13} /> تعديل
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                id="btn-cancel-edit"
                onClick={() => { setEditing(false); setErrors({}); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "6px 12px", cursor: "pointer",
                  color: "var(--text-secondary)", fontSize: 13,
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                <X size={13} /> إلغاء
              </button>
              <button
                id="btn-save-profile"
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "var(--accent)", border: "none",
                  borderRadius: 10, padding: "6px 14px", cursor: "pointer",
                  color: "#0D0E1A", fontSize: 13, fontWeight: 700,
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {saving ? "..." : <><Save size={13} /> حفظ</>}
              </button>
            </div>
          )}
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 16, animationDelay: "0.05s" }}>

          {/* Locked fields */}
          <InfoRow label="الرقم الوطني 🔒" value={currentUser.nationalId} locked />
          <InfoRow label="تاريخ الميلاد" value={currentUser.dateOfBirth} locked />

          {!editing ? (
            <>
              <InfoRow label="الاسم بالعربي"    value={currentUser.fullName} />
              <InfoRow label="الاسم بالإنجليزي" value={currentUser.fullNameEn} />
              <InfoRow label="مكان الميلاد"     value={currentUser.placeOfBirth} />
              <InfoRow label="مكان السكن"        value={currentUser.address} />
              <InfoRow label="رقم الهاتف"        value={currentUser.phone} />
              <InfoRow label="اسم المستخدم"     value={currentUser.username} />
              <InfoRow label="نوع الوثيقة"      value={DOC_LABELS[currentUser.documentType] || "—"} />
              <InfoRow label="كلمة المرور"       value="••••••" />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              {[
                { key: "fullName",     label: "الاسم بالعربي",     dir: "rtl" },
                { key: "fullNameEn",   label: "الاسم بالإنجليزي",  dir: "ltr" },
                { key: "placeOfBirth", label: "مكان الميلاد",      dir: "rtl" },
                { key: "phone",        label: "رقم الهاتف",        dir: "ltr" },
                { key: "username",     label: "اسم المستخدم",      dir: "ltr" },
              ].map(({ key, label, dir }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input className="input-field" value={form[key]} dir={dir}
                    onChange={(e) => update(key, e.target.value)} />
                  {errors[key] && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors[key]}</p>}
                </div>
              ))}

              {/* Address select */}
              <div>
                <label className="form-label">مكان السكن</label>
                <select className="input-field" value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  style={{ colorScheme: "dark", backgroundColor: "rgba(21,22,39,0.95)" }}
                >
                  <option value="">اختر المدينة</option>
                  {JORDANIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.address && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.address}</p>}
              </div>

              {/* Password change */}
              <div>
                <label className="form-label">كلمة المرور الجديدة (اختياري)</label>
                <div style={{ position: "relative" }}>
                  <input className="input-field" type={showPass ? "text" : "password"}
                    placeholder="اتركه فارغاً للإبقاء على الحالي"
                    value={form.password} onChange={(e) => update("password", e.target.value)}
                    dir="ltr" style={{ paddingLeft: 44 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
              </div>

              {/* Demo verification notice */}
              <div
                style={{
                  background: "rgba(0,212,170,0.07)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  borderRadius: 12, padding: "12px 14px", fontSize: 12,
                  color: "var(--accent)", marginTop: 4,
                }}
              >
                ✉️ بعد الحفظ، في النظام الحقيقي سيُرسَل رمز تحقق للتأكيد.
                <br />
                <span style={{ color: "var(--text-muted)" }}>(في النسخة التجريبية يُحفظ مباشرة)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
