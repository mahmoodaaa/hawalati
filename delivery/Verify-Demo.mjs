// Maintainer integration check; never included in the business-owner ZIP.
// Only run against a disposable Compose project, on localhost:5175 or :5176.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
const base = args.base;
if (!['http://localhost:5175', 'http://localhost:5176'].includes(base)) throw new Error('Explicit disposable localhost test port 5175/5176 required.');
const phase = args.phase || 'initial';
const statePath = args.state || 'frontend/.publish-prep/delivery-account.json';
let session;
async function api(path, { method = 'GET', body, status = 200, auth = true } = {}) {
  const headers = {};
  if (session && auth) headers.Authorization = `Bearer ${session.accessToken}`;
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const response = await fetch(base + path, { method, headers, body, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, `${method} ${path} HTTP status`);
  return response.json();
}
const post = (path, body, options = {}) => api(path, { method: 'POST', body, ...options });
const png = await readFile(new URL('DEMO_DOCUMENT.png', import.meta.url));
async function login(account) {
  await post('/api/auth/login', { username: account.username, password: account.password }, { auth: false });
  await post('/api/auth/resend-otp', { username: account.username, password: account.password, purpose: 'LOGIN' }, { auth: false });
  session = await post('/api/auth/verify-otp', { username: account.username, code: '123456', purpose: 'LOGIN' }, { auth: false });
  assert.ok(session.accessToken && session.refreshToken);
}
async function lookup(referenceNumber, providerId, approxAmount) {
  return post('/api/remittances/lookup', { referenceNumber, providerId, approxAmount });
}
if (phase === 'initial') {
  for (const route of ['/', '/history', '/profile', '/kyc']) {
    const response = await fetch(base + route); assert.equal(response.status, 200); assert.match(await response.text(), /id="root"/);
  }
  for (const asset of ['orange.svg', 'zain-cash.svg', 'umniah.png']) assert.equal((await fetch(`${base}/images/wallets/${asset}`)).status, 200);
  assert.ok((await api('/v3/api-docs')).openapi);
  await api('/api/user/profile', { status: 401 });
  console.log('PASS: Nginx UI, deep routes, local logos, API proxy and authenticated boundaries.');
  const account = { username: 'delivery.demo', password: 'Demo-' + randomBytes(16).toString('hex'), phone: '0795551234' };
  await post('/api/auth/phone-otp/send', { phone: account.phone }, { auth: false });
  await post('/api/auth/phone-otp/verify', { phone: account.phone, code: '000000' }, { auth: false, status: 400 });
  const verified = await post('/api/auth/phone-otp/verify', { phone: account.phone, code: '123456' }, { auth: false });
  assert.ok(verified.registrationToken);
  const registration = { ...account, fullName: 'مستخدم حوالتي التجريبي', fullNameEn: 'Hawalati Demo User', nationalId: '9912345678',
    dateOfBirth: '1995-06-15', placeOfBirth: 'Amman', address: 'Amman', documentType: 'national_id' };
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify({ registrationToken: verified.registrationToken, registration })], { type: 'application/json' }));
  form.append('file', new File([png], 'DEMO_DOCUMENT.png', { type: 'image/png' }));
  session = await post('/api/auth/registration/complete', form, { auth: false, status: 201 });
  assert.ok(session.accessToken && session.refreshToken);
  let profile = await api('/api/user/profile');
  assert.equal(profile.nationalId, '9912345678'); assert.equal(profile.kycStatus, 'DEMO_VERIFIED'); assert.equal(profile.enabled, true);
  assert.equal((await api('/api/user/document')).contentType, 'image/png');
  const token = session.refreshToken;
  session = await post('/api/auth/refresh', { refreshToken: token }, { auth: false }); assert.notEqual(session.refreshToken, token);
  await post('/api/auth/logout', { refreshToken: session.refreshToken }, { auth: false }); session = null;
  await login(account);
  console.log('PASS: Phone OTP, multipart registration, document persistence, Demo KYC, refresh rotation, logout and LOGIN OTP.');
  await api('/api/user/profile', { method: 'PUT', body: { fullName: registration.fullName, fullNameEn: registration.fullNameEn,
    placeOfBirth: 'Amman', phone: account.phone, username: account.username, dateOfBirth: '1990-04-17', address: 'Demo Address' } });
  profile = await api('/api/user/profile'); assert.equal(profile.dateOfBirth, '1990-04-17');
  const replacement = new FormData(); replacement.append('file', new File([png], 'REPLACEMENT.png', { type: 'image/png' })); replacement.append('documentType', 'passport');
  const document = await api('/api/user/document', { method: 'PUT', body: replacement });
  assert.equal(document.documentType, 'passport');
  await post('/api/user/kyc'); assert.equal((await api('/api/user/profile')).kycStatus, 'DEMO_VERIFIED');
  assert.equal((await lookup('missing', 'western_union', 141.8)).status, 'NOT_FOUND');
  assert.equal((await lookup('1234567890', 'moneygram', 141.8)).status, 'PROVIDER_MISMATCH');
  assert.equal((await lookup('ALREADY-RECEIVED', 'western_union', 212.7)).status, 'ALREADY_RECEIVED');
  assert.equal((await lookup('1234567890', 'western_union', 1)).status, 'NOT_FOUND');
  const destinations = [
    ['1234567890', 'western_union', 141.8, { type: 'bank', details: { bankId: 'arab_bank', iban: 'JO94CBJO0000000000000000000000', accountName: 'Demo Owner' } }],
    ['ALW-2024-001', 'alawneh_exchange', 400, { type: 'wallet', details: { walletId: 'alawneh_pay', walletPhone: '0791234567' } }],
    ['ZAM-2024-001', 'zamzam_exchange', 250, { type: 'wallet', details: { walletId: 'dinarak', walletPhone: '0791234567' } }],
  ];
  const transactions = [];
  for (const [reference, provider, amount, destination] of destinations) {
    const result = await lookup(reference, provider, amount); assert.equal(result.status, 'AVAILABLE');
    const body = { remittanceId: result.remittance.id, agreed: true, destination };
    const transaction = await post('/api/remittances/receive', body);
    assert.equal(Number(transaction.fee), 1.5); assert.equal(Number(transaction.netAmount), amount - 1.5);
    assert.equal(transaction.status, 'DEMO_COMPLETED');
    assert.match(transaction.destination.iban || transaction.destination.walletPhone, /\*/);
    await post('/api/remittances/receive', body, { status: 409 });
    transactions.push(transaction.id);
  }
  assert.equal((await api('/api/remittances/history')).length, 3);
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify({ account, transactions, documentId: document.id }));
  console.log('PASS: Profile/DOB, document replacement and KYC, all lookup statuses, bank + Alawneh Pay + Dinarak receive, duplicates and real PostgreSQL history.');
} else if (phase === 'persisted') {
  const state = JSON.parse(await readFile(statePath, 'utf8')); await login(state.account);
  assert.equal((await api('/api/user/profile')).dateOfBirth, '1990-04-17');
  assert.equal((await api('/api/user/document')).id, state.documentId);
  assert.deepEqual((await api('/api/remittances/history')).map(tx => tx.id).sort(), state.transactions.sort());
  assert.equal((await lookup('1234567890', 'western_union', 141.8)).status, 'ALREADY_RECEIVED');
  console.log('PASS: Account, edited profile, document metadata, receipt history and consumed remittance survive Stop/Start.');
} else if (phase === 'reset') {
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  await post('/api/auth/phone-otp/send', { phone: state.account.phone }, { auth: false });
  console.log('PASS: Deliberate disposable-project reset permits the former demo phone to register again.');
} else throw new Error('Unknown test phase');
