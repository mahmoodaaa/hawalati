import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const { apiRequest, setSession, getSession, refreshSession, subscribeSession, ApiError } = await import('../src/services/apiClient.js');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const initial = { accessToken: 'old-access', refreshToken: 'old-refresh' };

beforeEach(() => { storage.clear(); setSession(initial); });

test('persists tokens without passwords or profile data', () => {
  setSession({ ...initial, user: { nationalId: 'private', password: 'secret' } });
  assert.deepEqual(JSON.parse(storage.get('hawalati_api_session')), initial);
});

test('parallel 401 responses share one rotation and retry with the new token', async () => {
  let rotations = 0;
  let retries = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/api/auth/refresh')) {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'old-refresh' });
      return json({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    }
    if (options.headers.Authorization === 'Bearer old-access') return json({}, 401);
    assert.equal(options.headers.Authorization, 'Bearer new-access');
    retries++;
    return json({ ok: true });
  };
  const results = await Promise.all([apiRequest('/api/user/profile'), apiRequest('/api/remittances/history')]);
  assert.equal(rotations, 1);
  assert.equal(retries, 2);
  assert.ok(results.every((result) => result.ok));
});

test('a second 401 clears the session without a refresh loop', async () => {
  let requests = 0;
  globalThis.fetch = async (url) => {
    requests++;
    return url.endsWith('/api/auth/refresh') ? json({ accessToken: 'new', refreshToken: 'new-refresh' }) : json({}, 401);
  };
  await assert.rejects(apiRequest('/api/user/profile'), { status: 401 });
  assert.equal(requests, 3);
  assert.equal(getSession(), null);
});

test('rejected refresh clears tokens and notifies session observers', async () => {
  const changes = [];
  const unsubscribe = subscribeSession((value) => changes.push(value));
  globalThis.fetch = async () => json({ message: 'Expired' }, 401);
  await assert.rejects(refreshSession(), { message: 'Expired', status: 401 });
  assert.equal(getSession(), null);
  assert.equal(storage.has('hawalati_api_session'), false);
  assert.deepEqual(changes, [null]);
  unsubscribe();
});

test('logout during a refresh cannot restore the session', async () => {
  let complete;
  globalThis.fetch = () => new Promise((resolve) => { complete = resolve; });
  const refreshing = refreshSession();
  setSession(null);
  complete(json({ accessToken: 'late', refreshToken: 'late' }));
  await assert.rejects(refreshing, { status: 401 });
  assert.equal(getSession(), null);
});

test('validation exposes backend field errors and public auth never refreshes', async () => {
  let requests = 0;
  globalThis.fetch = async (_url, options) => {
    requests++;
    assert.equal(options.headers.Authorization, undefined);
    return json({ message: 'Invalid OTP', fieldErrors: { code: 'Invalid' } }, 401);
  };
  await assert.rejects(apiRequest('/api/auth/verify-otp', { auth: false, method: 'POST', body: {} }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Invalid OTP');
    assert.equal(error.fieldErrors.code, 'Invalid');
    return true;
  });
  assert.equal(requests, 1);
});

test('multipart keeps the browser-generated boundary', async () => {
  const body = new FormData();
  body.append('file', new Blob(['document']), 'identity.pdf');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body, body);
    assert.equal(options.headers['Content-Type'], undefined);
    return new Response(null, { status: 204 });
  };
  assert.equal(await apiRequest('/api/user/document', { method: 'PUT', body }), null);
});

test('network failures provide a controlled error', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(apiRequest('/api/user/profile'), (error) => error instanceof ApiError && error.status === 0);
});
