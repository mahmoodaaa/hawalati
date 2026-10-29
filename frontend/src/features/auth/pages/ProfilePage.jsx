import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Save, X, CheckCircle } from "lucide-react";
import Header from "../../../components/layout/Header";
import BottomNav from "../../../components/layout/BottomNav";
import { useAuth } from "../../../context/AuthContext";
import { updateProfile } from "../../../services/userService";
import {
  validatePhone,
  validateUsername,
  validateNameEn,
  validateRequired,
} from "../../../utils/formatters";
import { JORDANIAN_CITIES } from "../../../data/providers";

const formFromUser = (user) => Object.fromEntries(["fullName", "fullNameEn", "phone", "placeOfBirth", "address", "username", "dateOfBirth"].map((key) => [key, user?.[key] || ""]));

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
  const { currentUser: authenticatedUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const currentUser = profile || authenticatedUser;
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const inFlight = useRef(false);
  const refreshProfile = useRef(refreshUser);
  useEffect(() => { refreshProfile.current = refreshUser; }, [refreshUser]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);


  const [form, setForm] = useState(() => formFromUser(authenticatedUser));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setProfileLoading(true);
      setProfileError("");
      try {
        const user = await refreshProfile.current();
        if (active) { setProfile(user); setForm(formFromUser(user)); }
      } catch (error) {
        if (active) setProfileError(error.message);
      } finally {
        if (active) setProfileLoading(false);
      }
    });
    return () => { active = false; };
  }, [authenticatedUser?.id, reloadKey]);
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

    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  }

  async function handleSave() {
    if (inFlight.current || !validate()) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await updateProfile(form);
      const fresh = await refreshUser();
      setProfile(fresh);
      setForm(formFromUser(fresh));
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setErrors({ ...error.fieldErrors, _global: error.message });
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  if (profileLoading || profileError) return <div className="bg-animated" style={{ minHeight: "100vh", paddingBottom: 80 }}>
    <Header title="الملف الشخصي" />
    <div className="glass-card" style={{ maxWidth: 440, margin: "24px auto", padding: 24 }}>
      {profileLoading ? <p role="status">جارٍ تحميل الملف الشخصي…</p> : <div role="alert"><p style={{ color: "var(--danger)" }}>{profileError}</p>
        <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setReloadKey((value) => value + 1)}>إعادة المحاولة</button></div>}
    </div><BottomNav />
  </div>;
  if (!currentUser) return null;
  const kycVerified = ["VERIFIED", "DEMO_VERIFIED"].includes(currentUser.kycStatus);
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
              <span className={`badge ${kycVerified ? "badge-success" : "badge-warning"}`} style={{ fontSize: 10 }}>{kycVerified ? "✓ KYC موثّق" : currentUser.kycStatus}</span>
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
              onClick={() => { setForm(formFromUser(currentUser)); setErrors({}); setSaved(false); setEditing(true); }}
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
                disabled={saving} onClick={() => { setForm(formFromUser(currentUser)); setEditing(false); setErrors({}); }}
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

              {/* Demo verification notice */}
              <div
                style={{
                  background: "rgba(0,212,170,0.07)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  borderRadius: 12, padding: "12px 14px", fontSize: 12,
                  color: "var(--accent)", marginTop: 4,
                }}
              >
                تُحفظ التغييرات في حسابك، وقد تعيد تغييرات بيانات الهوية حالة KYC إلى الانتظار.
                <br />
                <span style={{ color: "var(--text-muted)" }}>تغيير كلمة المرور عملية منفصلة عن تعديل الملف الشخصي.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 20px" }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <p style={{ fontSize: 14, marginBottom: 10 }}>وثيقة الهوية: {currentUser.documentUploaded ? "مرفوعة" : "لم تُرفع بعد"}</p>
          <button id="btn-profile-document" className="btn-secondary" onClick={() => navigate("/kyc")}>عرض الوثيقة أو استبدالها وإكمال التحقق</button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

