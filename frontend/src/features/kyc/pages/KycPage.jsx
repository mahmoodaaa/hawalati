import { t, getLocale } from '../../../i18n/translate.js';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, FileText } from "lucide-react";
import Header from "../../../components/layout/Header";
import { submitKyc, getDocument, uploadDocument, validateDocument, DOCUMENT_TYPES } from "../../../services/userService";
import { useAuth } from "../../../context/AuthContext";

const KYC_STEPS = [
  { icon: <FileText size={20} />, title: "وثيقة الهوية", desc: "ملف JPEG أو PNG أو PDF محفوظ على الخادم", kind: "document" },
  { icon: <Shield size={20} />, title: "مراجعة البيانات", desc: "نتيجة التحقق من الهوية", kind: "kyc" },
];
const isVerified = (status) => ["VERIFIED", "DEMO_VERIFIED"].includes(status);

export default function KycPage() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const [status, setStatus] = useState(isVerified(currentUser?.kycStatus) ? "done" : "idle");
  const [error, setError] = useState("");
  const [document, setDocument] = useState(null);
  const [documentType, setDocumentType] = useState(currentUser?.documentType || "national_id");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadNotice, setUploadNotice] = useState("");
  const fileInput = useRef(null);
  const inFlight = useRef(false);
  const busy = status === "uploading" || status === "verifying";
  const completed = status === "done" && !!document && !metadataLoading && !metadataError;
  const needsReplacement = !!document && document.documentType !== documentType;

  useEffect(() => {
    let active = true;
    // Skip the discarded StrictMode effect; ignore responses after leaving the page.
    Promise.resolve().then(async () => {
      if (!active) return;
      setMetadataLoading(true);
      setMetadataError("");
      try {
        const metadata = await getDocument();
        if (active) setDocument(metadata);
      } catch (error) {
        if (!active) return;
        if (error.status === 404) setDocument(null);
        else setMetadataError(error.message);
      } finally {
        if (active) setMetadataLoading(false);
      }
    });
    return () => { active = false; };
  }, [currentUser?.id, reloadKey]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const validationError = validateDocument(selected);
    setFileError(validationError);
    setError("");
    setUploadNotice("");
    setFile(validationError ? null : selected);
    setStatus("idle");
    if (validationError) event.target.value = "";
  }

  async function handleSubmitKyc() {
    if (inFlight.current || metadataLoading || metadataError || fileError) return;
    if (!file && (!document || needsReplacement)) {
      setError("اختر ملف الوثيقة المطلوب رفعه أولًا.");
      return;
    }
    const validationError = file ? validateDocument(file) : "";
    if (validationError) { setFileError(validationError); return; }
    inFlight.current = true;
    setError("");
    let uploaded = false;
    try {
      if (file) {
        setStatus("uploading");
        const metadata = await uploadDocument(file, documentType);
        uploaded = true;
        if (!metadata?.id) throw new Error("لم يُرجع الخادم بيانات الوثيقة. أعد تحميل الصفحة للتأكد من الرفع.");
        setDocument(metadata);
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        setUploadNotice("تم رفع الوثيقة وحفظها على الخادم بنجاح.");
        await refreshUser();
      }
      setStatus("verifying");
      const result = await submitKyc();
      if (!isVerified(result?.status)) throw new Error(result?.message || "لم تكتمل عملية التحقق.");
      const profile = await refreshUser();
      if (!isVerified(profile.kycStatus)) throw new Error("لم تكتمل عملية التحقق. يمكنك إعادة المحاولة بالوثيقة المحفوظة.");
      setStatus("done");
    } catch (error) {
      setError(error.message);
      // Replacing a document can reset KYC even when the subsequent request fails.
      if (uploaded) await refreshUser().catch(() => {});
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="bg-animated" style={{ minHeight: "100vh" }}>
      <Header title={t("التحقق من الهوية")} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, rgba(108,99,255,0.25), rgba(0,212,170,0.15))",
            border: "2px solid rgba(108,99,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 36 }}>🛡️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{t("التحقق من الهوية (KYC)")}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{t("لضمان سلامة المعاملات وحمايتك،")}<br />{t("ارفع وثيقتك لإكمال التحقق من الهوية.")} </p>
        </div>

        

        <div className="glass-card animate-fade-in-up" style={{ padding: 20, marginBottom: 20 }} aria-busy={busy || metadataLoading}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{t("رفع وثيقة الهوية")}</h3>
          <label className="form-label" htmlFor="kyc-document-type">{t("نوع الوثيقة")}</label>
          <select id="kyc-document-type" className="input-field" value={documentType} disabled={busy || metadataLoading}
            style={{ colorScheme: "dark", marginBottom: 14 }}
            onChange={(event) => { setDocumentType(event.target.value); setStatus("idle"); setError(""); }}>
            {DOCUMENT_TYPES.map((type) => <option key={type.id} value={type.id}>{t(type.label)}</option>)}
          </select>
          <label className="form-label" htmlFor="kyc-document-file">{document ? t("استبدال الوثيقة (اختياري)") : t("اختيار ملف الوثيقة")}</label>
          <input ref={fileInput} id="kyc-document-file" className="input-field" type="file"
            accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" disabled={busy || metadataLoading}
            onChange={handleFileChange} aria-describedby="kyc-file-help kyc-file-error" />
          <p id="kyc-file-help" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{t("JPEG / PNG / PDF — بحد أقصى 5 ميغابايت. اختيار الملف وحده لا يرفعه.")}</p>
          {file && <p style={{ fontSize: 13, marginTop: 8 }}>{t("ملف محدد:")} {t(file.name)} ({(file.size / 1024).toFixed(1)} KB)</p>}
          {(file || fileError) && <button type="button" disabled={busy} style={{ marginTop: 8, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => { setFile(null); setFileError(""); setError(""); if (fileInput.current) fileInput.current.value = ""; }}>{t("إلغاء اختيار الملف")}{document ? t(" واستخدام الوثيقة المحفوظة") : ""}
          </button>}
          {fileError && <p id="kyc-file-error" role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{t(fileError)}</p>}
          {metadataLoading && <p role="status" style={{ marginTop: 12 }}>{t("جارٍ تحميل بيانات الوثيقة…")}</p>}
          {metadataError && <div role="alert" style={{ color: "var(--danger)", marginTop: 12 }}>
            <p>{t("تعذر تحميل بيانات الوثيقة:")} {t(metadataError)}</p>
            <button type="button" className="btn-primary" style={{ marginTop: 10 }} onClick={() => setReloadKey((value) => value + 1)}>{t("إعادة تحميل بيانات الوثيقة")}</button>
          </div>}
          {!metadataLoading && !metadataError && (document ? (
            <div style={{ background: "rgba(0,212,170,0.08)", padding: 12, borderRadius: 10, marginTop: 14 }}>
              <p style={{ color: "var(--accent)", fontWeight: 700 }}>{t("وثيقة محفوظة على الخادم ✓")}</p>
              <p style={{ fontSize: 12, marginTop: 5 }}>{t("النوع:")} {t(DOCUMENT_TYPES.find((type) => type.id === document.documentType)?.label || document.documentType)}</p>
              <p style={{ fontSize: 12 }}>{t("صيغة الملف:")} {document.contentType}{t("— الحجم:")} {(document.fileSize / 1024).toFixed(1)} KB</p>
              {document.uploadedAt && <p style={{ fontSize: 12 }}>{t("تاريخ الرفع:")} {new Date(document.uploadedAt).toLocaleString(getLocale())}</p>}
            </div>
          ) : <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>{t("لا توجد وثيقة مرفوعة بعد. اختر ملفًا للمتابعة.")}</p>)}
          {needsReplacement && <p style={{ fontSize: 12, marginTop: 8 }}>{t("تغيير نوع الوثيقة يتطلب رفع ملف جديد.")}</p>}
          {uploadNotice && <p role="status" style={{ color: "var(--accent)", marginTop: 12 }}>{t(uploadNotice)}</p>}
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 20, marginBottom: 20, animationDelay: "0.1s" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14 }}>{t("خطوات التحقق")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {KYC_STEPS.map((step) => {
              const done = step.kind === "document" ? !!document : step.kind === "kyc" && completed;
              return (
                <div key={step.kind} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                  background: done ? "rgba(0,212,170,0.06)" : "rgba(255,255,255,0.03)", borderRadius: 12,
                  border: `1px solid ${done ? "rgba(0,212,170,0.2)" : "var(--border)"}`, transition: "all 0.5s ease" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: done ? "rgba(0,212,170,0.15)" : "rgba(108,99,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: done ? "var(--accent)" : "var(--primary-light)", flexShrink: 0 }}>
                    {done ? <CheckCircle size={20} /> : step.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t(step.title)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(step.desc)}</div>
                  </div>
                  <span className={`badge ${done ? "badge-success" : "badge-warning"}`} style={{ fontSize: 11 }}>
                    {done ? t("✓ تم") : t("بانتظار الإكمال")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 16 }}>{t(error)}</p>}
        {!completed && <button id="btn-submit-kyc" className="btn-primary animate-fade-in-up" onClick={handleSubmitKyc}
          disabled={busy || metadataLoading || !!metadataError || !!fileError || (!file && (!document || needsReplacement))}>
          {status === "uploading" ? t("جارٍ رفع الوثيقة…") : status === "verifying" ? t("جارٍ التحقق وتحديث الملف الشخصي…") : file ? t("رفع الوثيقة وإرسال طلب التحقق →") : document ? t("إرسال طلب التحقق بالوثيقة المحفوظة →") : t("اختر وثيقة للمتابعة")}
        </button>}
        {busy && <p role="status" style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", marginTop: 12 }}>{t("يرجى الانتظار حتى ينتهي الطلب.")}</p>}

        {completed && <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="glass-card" style={{ padding: 24, textAlign: "center", border: "1px solid rgba(107,203,119,0.3)" }}>
            <CheckCircle size={40} color="var(--success)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{t("تم التحقق بنجاح! ✅")}</h3>
            <p style={{ color: "var(--accent)", fontWeight: 700 }}>{t(currentUser?.kycStatus)}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("اكتمل التحقق من الخادم ويمكنك المتابعة.")}</p>
          </div>
          <button id="btn-kyc-continue" className="btn-accent" onClick={() => navigate("/home", { replace: true })}>{t("الانتقال إلى الصفحة الرئيسية 🏠")}</button>
        </div>}
      </div>
    </div>
  );
}
