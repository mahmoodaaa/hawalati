import { getLocale } from '../i18n/translate.js';

// ── Formatters ────────────────────────────────────────

/**
 * Format amount with currency
 */
export function formatAmount(amount, currency = "JOD") {
  const num = parseFloat(amount) || 0;
  return `${num.toFixed(2)} ${currency}`;
}

/**
 * Format date to Arabic-friendly string
 */
export function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Mask middle digits of phone: 079*****123
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}*****${end}`;
}

/**
 * Mask IBAN: JO94****XXXX
 */
export function maskIban(iban) {
  if (!iban || iban.length < 8) return iban;
  return iban.slice(0, 4) + "****" + iban.slice(-4);
}

// ── Validators ────────────────────────────────────────

export function validateRequired(value, fieldName) {
  if (!value || !value.toString().trim()) {
    return `${fieldName} مطلوب`;
  }
  return null;
}

export function validateNationalId(id) {
  if (!id) return "الرقم الوطني مطلوب";
  const clean = id.replace(/\s/g, "");
  if (!/^\d{10}$/.test(clean)) return "الرقم الوطني يجب أن يتكون من 10 أرقام";
  return null;
}

export function validatePhone(phone) {
  if (!phone) return "رقم الهاتف مطلوب";
  const clean = phone.replace(/[\s-]/g, "");
  if (!/^(07\d{8}|009627\d{8}|\+9627\d{8})$/.test(clean)) {
    return "رقم الهاتف غير صالح (مثال: 0791234567)";
  }
  return null;
}

export function validateIban(iban) {
  if (!iban) return "رقم IBAN مطلوب";
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (clean.length < 15) return "رقم IBAN قصير جداً";
  return null;
}

export function validateAmount(amount) {
  const num = parseFloat(amount);
  if (!amount) return "المبلغ مطلوب";
  if (isNaN(num) || num <= 0) return "أدخل مبلغاً صحيحاً";
  return null;
}

export function validateUsername(username) {
  if (!username) return "اسم المستخدم مطلوب";
  const clean = username.trim();
  if (clean.length < 4) return "اسم المستخدم يجب أن يكون 4 أحرف على الأقل";
  if (!/^[a-zA-Z0-9_.\s]+$/.test(clean)) return "يُسمح بالأحرف الإنجليزية والأرقام والمسافة والنقطة فقط";
  return null;
}

export function validatePassword(password) {
  if (!password) return "كلمة المرور مطلوبة";
  if (password.length < 6) return "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
  return null;
}

export function validateDateOfBirth(value, today = new Date()) {
  if (!value) return "تاريخ الميلاد مطلوب";
  const date = new Date(`${value}T00:00:00Z`);
  const currentDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value >= currentDay) return "تاريخ الميلاد يجب أن يكون في الماضي";
  return null;
}

export function validateNameEn(name) {
  if (!name) return "الاسم بالإنجليزي مطلوب";
  if (!/^[a-zA-Z\s\-]+$/.test(name.trim())) return "الاسم يجب أن يكون بالأحرف الإنجليزية فقط";
  if (name.trim().split(/\s+/).length < 2) return "أدخل الاسم الرباعي (مثال: Ahmad Mohammed Al-Ahmad)";
  return null;
}
