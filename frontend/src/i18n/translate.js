import { english } from './messages.js';

const STORAGE_KEY = 'hawalati_language';
function readLanguage() {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar'; }
  catch { return 'ar'; }
}
let language = readLanguage();
export function getLanguage() { return language; }
export function getLocale() { return language === 'en' ? 'en-GB' : 'ar-JO'; }
export function setLanguagePreference(next) {
  if (!['ar', 'en'].includes(next)) return;
  language = next;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, next); } catch { /* Keep the preference in memory. */ }
}

const statusArabic = { VERIFIED: 'موثّق', DEMO_VERIFIED: 'موثّق', PENDING: 'بانتظار التحقق', REJECTED: 'بحاجة لمراجعة', DEMO_COMPLETED: 'مكتملة', AVAILABLE: 'متاحة', ALREADY_RECEIVED: 'مستلمة مسبقًا' };
const statusEnglish = { VERIFIED: 'Verified', DEMO_VERIFIED: 'Verified', PENDING: 'Verification pending', REJECTED: 'Needs review', DEMO_COMPLETED: 'Completed', AVAILABLE: 'Available', ALREADY_RECEIVED: 'Already received' };
const replacements = Object.entries(english).filter(([source]) => /[\u0600-\u06ff]/.test(source)).sort((a, b) => b[0].length - a[0].length);

// Translate display strings only. User information and API payloads stay unchanged.
export function t(value) {
  if (typeof value !== 'string') return value;
  if (language === 'ar') return statusArabic[value] || value;
  if (statusEnglish[value]) return statusEnglish[value];
  if (english[value]) return english[value];
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (english[normalized]) return english[normalized];
  if (!/[\u0600-\u06ff]/.test(value)) return value;
  // Handles composed labels and server validation messages without translating
  // usernames, document contents, reference numbers or other payload values.
  let result = value;
  for (const [source, translated] of replacements) result = result.replaceAll(source, translated);
  return result;
}
