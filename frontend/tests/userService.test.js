import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const { setSession } = await import('../src/services/apiClient.js');
const { getProfile, updateProfile, getDocument, uploadDocument, validateDocument, submitKyc } = await import('../src/services/userService.js');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const document = { id: 'document-id', documentType: 'passport', contentType: 'application/pdf', fileSize: 4, uploadedAt: '2026-10-29T10:00:00Z' };
const pdf = () => new File(['test'], 'identity.pdf', { type: 'application/pdf' });

beforeEach(() => { setSession({ accessToken: 'access', refreshToken: 'refresh' }); });

test('accepts JPEG, PNG and PDF, including the exact 5 MB limit', () => {
  for (const type of ['image/jpeg', 'image/png', 'application/pdf']) {
    assert.equal(validateDocument(new File(['test'], 'identity', { type })), '');
  }
  assert.equal(validateDocument(new File([new Uint8Array(5 * 1024 * 1024)], 'identity.pdf', { type: 'application/pdf' })), '');
});

test('rejects missing, empty, unsupported and oversized files before any request', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({}); };
  const invalid = [undefined, new File([], 'empty.pdf', { type: 'application/pdf' }),
    new File(['bad'], 'identity.gif', { type: 'image/gif' }),
    new File(['bad'], 'identity.pdf', { type: '' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' })];
  for (const file of invalid) {
    assert.ok(validateDocument(file));
    await assert.rejects(uploadDocument(file, 'national_id'));
  }
  assert.equal(calls, 0);
});

test('rejects unsupported document types before sending the file', async () => {
  globalThis.fetch = async () => { assert.fail('No request expected'); };
  await assert.rejects(uploadDocument(pdf(), 'unknown'));
});

test('uploads both multipart keys with JWT and leaves Content-Type to the browser', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:7171/api/user/document');
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers.Authorization, 'Bearer access');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.ok(options.body instanceof FormData);
    assert.deepEqual([...options.body.keys()], ['file', 'documentType']);
    assert.equal(options.body.get('documentType'), 'passport');
    assert.equal(options.body.get('file').name, 'identity.pdf');
    assert.equal(await options.body.get('file').text(), 'test');
    return json(document);
  };
  assert.deepEqual(await uploadDocument(pdf(), 'passport'), document);
});

test('gets existing metadata via an authenticated GET after reopening the page', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:7171/api/user/document');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer access');
    return json(document);
  };
  assert.deepEqual(await getDocument(), document);
});

test('distinguishes a missing document from authorization and server failures', async () => {
  globalThis.fetch = async () => json({ message: 'لا توجد وثيقة مرفوعة' }, 404);
  await assert.rejects(getDocument(), { status: 404 });
  globalThis.fetch = async () => json({ message: 'Unavailable' }, 503);
  await assert.rejects(getDocument(), { status: 503, message: 'Unavailable' });
});

test('an expired JWT refreshes and retries the actual multipart file and type', async () => {
  const requests = [];
  let uploadedBody;
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    if (url.endsWith('/api/auth/refresh')) return json({ accessToken: 'rotated', refreshToken: 'rotated-refresh' });
    if (options.headers.Authorization === 'Bearer access') {
      uploadedBody = options.body;
      return json({}, 401);
    }
    assert.equal(options.headers.Authorization, 'Bearer rotated');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.body, uploadedBody);
    assert.equal(options.body.get('documentType'), 'license');
    assert.equal(await options.body.get('file').text(), 'test');
    return json({ ...document, documentType: 'license' });
  };
  assert.equal((await uploadDocument(pdf(), 'license')).documentType, 'license');
  assert.equal(requests.length, 3);
});

test('upload errors preserve the backend message and never trigger KYC implicitly', async () => {
  const paths = [];
  globalThis.fetch = async (url) => { paths.push(url); return json({ message: 'Invalid document bytes' }, 400); };
  await assert.rejects(uploadDocument(pdf(), 'passport'), { status: 400, message: 'Invalid document bytes' });
  assert.equal(paths.length, 1);
  assert.ok(paths[0].endsWith('/api/user/document'));
});

test('KYC returns only the server result and propagates rejection', async () => {
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/user/kyc'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer access');
    return json({ status: 'DEMO_VERIFIED', demo: true });
  };
  assert.equal((await submitKyc()).status, 'DEMO_VERIFIED');
  globalThis.fetch = async () => json({ message: 'يرجى رفع وثيقة الهوية أولاً' }, 400);
  await assert.rejects(submitKyc(), { status: 400, message: 'يرجى رفع وثيقة الهوية أولاً' });
});

test('profile is retrieved from the authenticated backend and update excludes protected fields', async () => {
  const profile = { id: 'server-user', username: 'test.user', kycStatus: 'PENDING', documentUploaded: true };
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/user/profile'));
    assert.equal(options.headers.Authorization, 'Bearer access');
    if (options.method === 'PUT') {
      assert.deepEqual(JSON.parse(options.body), { fullName: 'Demo User', username: 'test.user' });
    }
    return json(profile);
  };
  assert.deepEqual(await getProfile(), profile);
  assert.deepEqual(await updateProfile({ fullName: 'Demo User', username: 'test.user', nationalId: 'protected', password: 'protected', id: 'forged', kycStatus: 'DEMO_VERIFIED' }), profile);
});
