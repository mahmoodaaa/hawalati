import { apiRequest, getSession, setSession, waitForRefresh } from './apiClient';

const post = (path, body) => apiRequest(`/api/auth/${path}`, { method: 'POST', body, auth: false });

export function registerUser(form) {
  const fields = ['fullName', 'fullNameEn', 'nationalId', 'dateOfBirth', 'placeOfBirth', 'address', 'phone', 'documentType', 'username', 'password'];
  return post('register', Object.fromEntries(fields.map((key) => [key, form[key]])));
}
export function loginUser(username, password) { return post('login', { username, password }); }
export function verifyOtp(username, code, purpose) { return post('verify-otp', { username, code, purpose }); }
export function resendOtp(username, password, purpose) { return post('resend-otp', { username, password, purpose }); }
export { refreshSession } from './apiClient';

export async function logout() {
  await waitForRefresh();
  const token = getSession()?.refreshToken;
  setSession(null);
  if (token) await post('logout', { refreshToken: token });
}

export { getProfile as getCurrentUser, submitKyc } from './userService';
export function updateUserProfile(_userId, fields) {
  if (fields.password) return Promise.reject(new Error('تغيير كلمة المرور يحتاج شاشة تغيير كلمة المرور المخصصة.'));
  const allowed = ['fullName', 'fullNameEn', 'dateOfBirth', 'placeOfBirth', 'address', 'phone', 'username'];
  return apiRequest('/api/user/profile', { method: 'PUT', body: Object.fromEntries(allowed.map((key) => [key, fields[key]])) });
}
