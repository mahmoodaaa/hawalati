import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const { getSession, setSession } = await import('../src/services/apiClient.js');
const { lookupRemittance, receiveRemittance, getRemittanceHistory } = await import('../src/services/remittanceService.js');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const id = '56dfb135-cfe5-4c53-8441-b63acf3e1d19';
const remittance = { id, referenceNumber: '1234567890', provider: 'western_union', amount: 200, currency: 'USD', amountJOD: 141.8, status: 'AVAILABLE' };
const bank = { type: 'bank', details: { bankId: 'arab_bank', bankName: 'UI-only name', iban: `JO94CBJO${'0'.repeat(22)}`, accountName: 'Test Receiver' } };
const wallet = { type: 'wallet', details: { walletId: 'zain_cash', walletName: 'UI-only name', walletPhone: '0791234567' } };
const transaction = { id, referenceNumber: '1234567890', amount: 200, currency: 'USD', amountJOD: 141.8,
  fee: 2.75, netAmount: 139.05, destination: { type: 'bank', bankName: 'Server Bank', iban: '****0000' },
  status: 'DEMO_COMPLETED', confirmedAt: '2026-10-29T12:00:00Z' };

beforeEach(() => {
  storage.clear();
  setSession({ accessToken: 'access', refreshToken: 'refresh' });
  // Stale browser-only data must not affect real backend results.
  storage.set('hawalati_received', '["1234567890"]');
  storage.set('hawalati_transactions', '[{"id":"fake-local-transaction"}]');
});

test('lookup sends the reference/provider and numeric JOD amount with JWT, ignoring stale local flags', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/remittances/lookup');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer access');
    assert.deepEqual(JSON.parse(options.body), { referenceNumber: '1234567890', providerId: 'western_union', approxAmount: 141.8 });
    return json({ status: 'AVAILABLE', remittance });
  };
  const result = await lookupRemittance({ referenceNumber: ' 1234567890 ', providerId: 'western_union', approxAmount: '141.80' });
  assert.equal(result.remittance.id, id);
});

test('lookup preserves all business statuses and the server expectedProvider', async () => {
  for (const response of [{ status: 'NOT_FOUND' }, { status: 'ALREADY_RECEIVED', remittance },
    { status: 'PROVIDER_MISMATCH', expectedProvider: 'moneygram' }]) {
    globalThis.fetch = async () => json(response);
    assert.deepEqual(await lookupRemittance({ referenceNumber: 'ref', providerId: 'western_union', approxAmount: 100 }), response);
  }
});

test('invalid lookup amounts and incomplete AVAILABLE responses cannot become a usable remittance', async () => {
  globalThis.fetch = async () => { assert.fail('No request for an invalid amount'); };
  for (const amount of ['', 'abc', '1.2.3', Infinity, 0, -10, 0.001]) {
    await assert.rejects(lookupRemittance({ referenceNumber: 'ref', providerId: 'western_union', approxAmount: amount }));
  }
  for (const response of [{ status: 'AVAILABLE', remittance: { referenceNumber: 'ref' } }, { status: 'UNKNOWN' }]) {
    globalThis.fetch = async () => json(response);
    await assert.rejects(lookupRemittance({ referenceNumber: 'ref', providerId: 'western_union', approxAmount: 100 }));
  }
});

test('bank receive submits the lookup UUID and agreement; server receipt amounts remain authoritative', async () => {
  let requests = 0;
  const before = [...storage.entries()];
  globalThis.fetch = async (url, options) => {
    requests++;
    assert.ok(url.endsWith('/api/remittances/receive'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer access');
    assert.deepEqual(JSON.parse(options.body), { remittanceId: id, agreed: true, destination: {
      type: 'bank', details: { bankId: 'arab_bank', iban: bank.details.iban, accountName: 'Test Receiver' },
    } });
    return json(transaction);
  };
  assert.deepEqual(await receiveRemittance({ remittanceId: id, destination: bank, agreed: true }), transaction);
  assert.equal(requests, 1);
  assert.deepEqual([...storage.entries()], before);
});

test('wallet receive sends the selected wallet ID and phone in nested details', async () => {
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { remittanceId: id, agreed: true, destination: {
      type: 'wallet', details: { walletId: 'zain_cash', walletPhone: '0791234567' },
    } });
    return json({ ...transaction, destination: { type: 'wallet', walletName: 'Server Wallet', walletPhone: '****4567' } });
  };
  assert.equal((await receiveRemittance({ remittanceId: id, destination: wallet, agreed: true })).destination.walletPhone, '****4567');
});

test('a reference number cannot replace the UUID, and receive requires explicit agreement', async () => {
  globalThis.fetch = async () => { assert.fail('No receive request expected'); };
  await assert.rejects(receiveRemittance({ remittanceId: '1234567890', destination: bank, agreed: true }));
  for (const agreed of [undefined, false, 'true']) await assert.rejects(receiveRemittance({ remittanceId: id, destination: bank, agreed }));
  await assert.rejects(receiveRemittance({ remittanceId: id, destination: { type: 'cash', details: {} }, agreed: true }));
});

test('Alawneh Pay and Dinarak are sent using the same IDs supported by the backend', async () => {
  for (const walletId of ['alawneh_pay', 'dinarak']) {
    globalThis.fetch = async (_url, options) => {
      assert.equal(JSON.parse(options.body).destination.details.walletId, walletId);
      return json({ ...transaction, destination: { type: 'wallet', walletId, walletPhone: '****4567' } });
    };
    const result = await receiveRemittance({ remittanceId: id, agreed: true,
      destination: { type: 'wallet', details: { walletId, walletPhone: '0791234567' } } });
    assert.equal(result.destination.walletId, walletId);
  }
});

test('duplicate, validation and KYC errors propagate without producing a local success or mutating history', async () => {
  const before = [...storage.entries()];
  for (const status of [409, 400, 403]) {
    globalThis.fetch = async () => json({ message: `Backend rejection ${status}` }, status);
    await assert.rejects(receiveRemittance({ remittanceId: id, destination: bank, agreed: true }), { status, message: `Backend rejection ${status}` });
  }
  assert.deepEqual([...storage.entries()], before);
});

test('history retrieves backend transactions without a user ID or browser history fallback', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/remittances/history');
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, 'Bearer access');
    return json([transaction]);
  };
  assert.deepEqual(await getRemittanceHistory(), [transaction]);
  globalThis.fetch = async () => json([]);
  assert.deepEqual(await getRemittanceHistory(), []);
});

test('history failures surface as errors rather than an empty or fabricated history', async () => {
  globalThis.fetch = async () => json({ message: 'Unavailable' }, 503);
  await assert.rejects(getRemittanceHistory(), { status: 503 });
  globalThis.fetch = async () => json({ transactions: [] });
  await assert.rejects(getRemittanceHistory());
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(getRemittanceHistory(), { status: 0 });
});

test('expired access JWT uses the existing refresh rotation before retrying an authenticated receipt', async () => {
  let attempts = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/api/auth/refresh')) return json({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    attempts++;
    if (options.headers.Authorization === 'Bearer access') return json({}, 401);
    assert.equal(options.headers.Authorization, 'Bearer new-access');
    assert.equal(JSON.parse(options.body).remittanceId, id);
    return json(transaction);
  };
  assert.equal((await receiveRemittance({ remittanceId: id, destination: bank, agreed: true })).id, id);
  assert.equal(attempts, 2); // One unauthorized request, one authorized retry.
  assert.equal(getSession().refreshToken, 'new-refresh');
});
