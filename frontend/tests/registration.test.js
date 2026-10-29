import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const { getSession, setSession } = await import('../src/services/apiClient.js');
const { sendPhoneOtp, verifyPhoneOtp, completeRegistration, loginUser, verifyOtp, resendOtp } = await import('../src/services/authService.js');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const phone = '0795551234';
const registration = {
  fullName: 'Demo Test User', fullNameEn: 'Demo Test User', nationalId: '9912345689', dateOfBirth: '1998-05-12',
  placeOfBirth: 'Amman', address: 'Amman', phone, documentType: 'national_id', username: 'demo.user', password: 'Demo@12345',
};
const file = () => new File(['document'], 'identity.png', { type: 'image/png' });

beforeEach(() => { storage.clear(); setSession(null); });

test('phone OTP send submits only the phone, without credentials or access authorization', async () => {
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/auth/phone-otp/send'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { phone });
    assert.equal(options.headers.Authorization, undefined);
    return json({ message: 'Demo OTP ready' });
  };
  await sendPhoneOtp(phone);
  assert.equal(getSession(), null);
});

test('phone OTP verification returns a registration-only token without creating a session', async () => {
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/auth/phone-otp/verify'));
    assert.deepEqual(JSON.parse(options.body), { phone, code: '123456' });
    assert.equal(options.headers.Authorization, undefined);
    return json({ registrationToken: 'temporary-registration-token', tokenType: 'Registration', expiresIn: 900 });
  };
  assert.equal((await verifyPhoneOtp(phone, '123456')).registrationToken, 'temporary-registration-token');
  assert.equal(getSession(), null);
  assert.equal(storage.size, 0);
});

test('complete registration sends application/json data part and the original File with browser multipart boundary', async () => {
  const selected = file();
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/auth/registration/complete'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers['Content-Type'], undefined);
    assert.ok(options.body instanceof FormData);
    assert.deepEqual([...options.body.keys()], ['data', 'file']);
    const data = options.body.get('data');
    assert.equal(data.type, 'application/json');
    assert.deepEqual(JSON.parse(await data.text()), { registrationToken: 'registration-jwt', registration });
    assert.equal(options.body.get('file'), selected);
    return json({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'user', enabled: true, documentUploaded: true, kycStatus: 'DEMO_VERIFIED' } }, 201);
  };
  const result = await completeRegistration('registration-jwt', { ...registration, confirmPassword: 'never-send-confirmation', step: 6 }, selected);
  assert.equal(result.user.kycStatus, 'DEMO_VERIFIED');
  // AuthContext establishes the normal session only after this response.
  assert.equal(getSession(), null);
  assert.equal(storage.size, 0);
});

test('phone-first sequence uses only the three new endpoints and performs no separate document/KYC call', async () => {
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(new URL(url).pathname);
    if (url.endsWith('/send')) return json({ message: 'ready' });
    if (url.endsWith('/verify')) return json({ registrationToken: 'verified-phone-token', expiresIn: 900 });
    return json({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'user', kycStatus: 'DEMO_VERIFIED' } }, 201);
  };
  await sendPhoneOtp(phone);
  const verified = await verifyPhoneOtp(phone, '123456');
  await completeRegistration(verified.registrationToken, registration, file());
  assert.deepEqual(requests, ['/api/auth/phone-otp/send', '/api/auth/phone-otp/verify', '/api/auth/registration/complete']);
});

test('missing registration token and invalid file fail before any registration request', async () => {
  globalThis.fetch = async () => { assert.fail('Should not send invalid registration'); };
  await assert.rejects(completeRegistration('', registration, file()));
  await assert.rejects(completeRegistration('registration-token', registration, undefined));
  await assert.rejects(completeRegistration('registration-token', registration, new File(['bad'], 'bad.exe', { type: 'application/octet-stream' })));
});

test('incorrect phone OTP and registered phone errors remain unauthenticated', async () => {
  globalThis.fetch = async () => json({ message: 'Wrong OTP' }, 400);
  await assert.rejects(verifyPhoneOtp(phone, '000000'), { status: 400, message: 'Wrong OTP' });
  globalThis.fetch = async () => json({ message: 'Phone already registered' }, 409);
  await assert.rejects(sendPhoneOtp(phone), { status: 409 });
  assert.equal(getSession(), null);
});

test('an expired registration token surfaces 401 without attempting access-token refresh', async () => {
  const requests = [];
  globalThis.fetch = async (url) => { requests.push(url); return json({ message: 'Registration permit expired' }, 401); };
  await assert.rejects(completeRegistration('expired-registration-token', registration, file()), { status: 401, message: 'Registration permit expired' });
  assert.equal(requests.length, 1);
  assert.equal(getSession(), null);
});

test('validation errors from complete registration remain available for field feedback', async () => {
  globalThis.fetch = async () => json({ message: 'Validation failed', fieldErrors: { 'registration.username': 'Username taken' } }, 400);
  await assert.rejects(completeRegistration('registration-token', registration, file()), (error) => error.fieldErrors['registration.username'] === 'Username taken');
});

test('existing LOGIN credentials, LOGIN OTP verification and resend preserve their original API contracts', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ path: new URL(url).pathname, body: JSON.parse(options.body) });
    assert.equal(options.headers.Authorization, undefined);
    return url.endsWith('/verify-otp') ? json({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'existing' } }) : json({ user: { username: 'existing' } });
  };
  await loginUser('existing', 'password');
  await resendOtp('existing', 'password');
  assert.equal((await verifyOtp('existing', '123456')).user.id, 'existing');
  assert.deepEqual(requests, [
    { path: '/api/auth/login', body: { username: 'existing', password: 'password' } },
    { path: '/api/auth/resend-otp', body: { username: 'existing', password: 'password', purpose: 'LOGIN' } },
    { path: '/api/auth/verify-otp', body: { username: 'existing', code: '123456', purpose: 'LOGIN' } },
  ]);
});
