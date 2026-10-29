import { validateDocument, DOCUMENT_TYPES } from './userService.js';
import { apiRequest, getSession, setSession, waitForRefresh } from './apiClient.js';

const post = (path, body) => apiRequest(`/api/auth/${path}`, { method: 'POST', body, auth: false });

export function loginUser(username, password) { return post('login', { username, password }); }
export function verifyOtp(username, code) { return post('verify-otp', { username, code, purpose: 'LOGIN' }); }
export function resendOtp(username, password) { return post('resend-otp', { username, password, purpose: 'LOGIN' }); }
export { refreshSession } from './apiClient.js';

export async function logout() {
  await waitForRefresh();
  const token = getSession()?.refreshToken;
  setSession(null);
  if (token) await post('logout', { refreshToken: token });
}

export { getProfile as getCurrentUser, submitKyc } from './userService.js';
export function updateUserProfile(_userId, fields) {
  if (fields.password) return Promise.reject(new Error('تغيير كلمة المرور يحتاج شاشة تغيير كلمة المرور المخصصة.'));
  const allowed = ['fullName', 'fullNameEn', 'dateOfBirth', 'placeOfBirth', 'address', 'phone', 'username'];
  return apiRequest('/api/user/profile', { method: 'PUT', body: Object.fromEntries(allowed.map((key) => [key, fields[key]])) });
}


// Phone-first registration is public until completion; its token is not an access JWT.
export function sendPhoneOtp(phone) { return post('phone-otp/send', { phone }); }
export function verifyPhoneOtp(phone, code) { return post('phone-otp/verify', { phone, code }); }

export async function completeRegistration(registrationToken, registration, file) {
  if (!registrationToken) throw new Error('يرجى تأكيد رقم الهاتف أولًا.');
  const fileError = validateDocument(file);
  if (fileError) throw new Error(fileError);
  if (!DOCUMENT_TYPES.some((type) => type.id === registration.documentType)) throw new Error('اختر نوع الوثيقة.');
  const fields = ['fullName', 'fullNameEn', 'nationalId', 'dateOfBirth', 'placeOfBirth', 'address', 'phone', 'documentType', 'username', 'password'];
  const payload = { registrationToken, registration: Object.fromEntries(fields.map((key) => [key, registration[key]])) };
  const body = new FormData();
  body.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
  body.append('file', file);
  return apiRequest('/api/auth/registration/complete', { method: 'POST', body, auth: false });
}
