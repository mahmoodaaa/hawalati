// Manual local-demo check. Each run creates one fictional backend test account.
// Run with Spring Boot's demo profile: node tests/live-auth-smoke.mjs
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const { apiRequest, setSession, getSession } = await import('../src/services/apiClient.js');
const post = (path, body) => apiRequest(`/api/auth/${path}`, { auth: false, method: 'POST', body });
const username = `sprint5.${Date.now()}`;
const password = `Demo-${randomUUID()}`;
const form = {
  fullName: 'مستخدم اختبار سبرنت خمسة', fullNameEn: 'Sprint Five Test User',
  nationalId: `99${randomInt(10000000, 99999999)}`, dateOfBirth: '1995-06-15',
  placeOfBirth: 'Amman', address: 'Amman', phone: `079${randomInt(1000000, 9999999)}`,
  documentType: 'national_id', username, password,
};

try {
  const pending = await post('register', form);
  assert.equal(pending.user.username, username);
  assert.equal(pending.accessToken, undefined);
  assert.equal(getSession(), null);
  console.log(`Created fictional backend test account: ${username}`);
  await assert.rejects(post('verify-otp', { username, code: '000000', purpose: 'REGISTER' }));
  await post('resend-otp', { username, password, purpose: 'REGISTER' });
  const registered = await post('verify-otp', { username, code: '123456', purpose: 'REGISTER' });
  assert.ok(registered.accessToken && registered.refreshToken);
  setSession(registered);
  let profile = await apiRequest('/api/user/profile');
  assert.equal(profile.username, username);
  assert.equal(profile.kycStatus, 'PENDING');
  console.log('PASS Register → wrong OTP rejected → resend → REGISTER OTP → authenticated profile');

  // A rejected access token triggers the same refresh path as an expired JWT.
  setSession({ accessToken: 'expired-test-token', refreshToken: getSession().refreshToken });
  profile = await apiRequest('/api/user/profile');
  assert.equal(profile.username, username);
  assert.notEqual(getSession().refreshToken, registered.refreshToken);
  console.log('PASS 401 → refresh rotation → retried profile');

  const restored = await import('../src/services/apiClient.js?restored');
  assert.equal((await restored.apiRequest('/api/user/profile')).username, username);
  console.log('PASS new client restores tokens and validates profile');

  let refreshToken = getSession().refreshToken;
  await post('logout', { refreshToken });
  setSession(null);
  await assert.rejects(post('refresh', { refreshToken }));
  console.log('PASS logout revokes refresh token');

  const loginPending = await post('login', { username, password });
  assert.equal(loginPending.accessToken, undefined);
  await post('resend-otp', { username, password, purpose: 'LOGIN' });
  const loggedIn = await post('verify-otp', { username, code: '123456', purpose: 'LOGIN' });
  setSession(loggedIn);
  assert.equal((await apiRequest('/api/user/profile')).username, username);
  refreshToken = getSession().refreshToken;
  await post('logout', { refreshToken });
  setSession(null);
  console.log('PASS Login → resend → LOGIN OTP → authenticated profile → logout');
} finally {
  const refreshToken = getSession()?.refreshToken;
  if (refreshToken) await post('logout', { refreshToken }).catch(() => {});
  setSession(null);
}
