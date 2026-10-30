import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { english } from '../src/i18n/messages.js';
import { getLanguage, getLocale, setLanguagePreference, t } from '../src/i18n/translate.js';
import { validateDateOfBirth, formatDate } from '../src/utils/formatters.js';
import { WALLETS } from '../src/data/providers.js';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
beforeEach(() => { storage.clear(); setLanguagePreference('ar'); });

test('language preference persists without changing authentication or registration data', () => {
  storage.set('hawalati_api_session', 'existing-session');
  setLanguagePreference('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(getLocale(), 'en-GB');
  assert.equal(storage.get('hawalati_language'), 'en');
  assert.equal(storage.get('hawalati_api_session'), 'existing-session');
  assert.deepEqual([...storage.keys()].sort(), ['hawalati_api_session', 'hawalati_language']);
  setLanguagePreference('ar');
  assert.equal(getLocale(), 'ar-JO');
  assert.equal(t('اسم المستخدم'), 'اسم المستخدم');
});

test('all English UI translations are present and contain no untranslated Arabic', () => {
  setLanguagePreference('en');
  for (const [source, translation] of Object.entries(english)) {
    assert.ok(translation.trim(), source);
    assert.equal(t(source), translation, source);
    assert.ok(!/[\u0600-\u06ff]/.test(translation), source);
  }
});

test('server errors, required-field messages and statuses follow the display language', () => {
  setLanguagePreference('en');
  assert.equal(t('رمز التحقق غير صحيح'), 'The verification code is incorrect');
  assert.equal(t('رقم الحوالة مطلوب'), 'Transfer reference is required');
  assert.equal(t('DEMO_VERIFIED'), 'Verified');
  setLanguagePreference('ar');
  assert.equal(t('DEMO_VERIFIED'), 'موثّق');
});

test('translation does not mutate values, objects, reference IDs, or unsupported language preferences', () => {
  setLanguagePreference('en');
  const value = { username: 'test.user', phone: '0791234567' };
  assert.equal(t(value), value);
  assert.equal(t(141.8), 141.8);
  assert.equal(t('ALW-2024-001'), 'ALW-2024-001');
  assert.equal(t(undefined), undefined);
  setLanguagePreference('unsupported');
  assert.equal(getLanguage(), 'en');
});

test('transaction dates follow the selected locale', () => {
  setLanguagePreference('en');
  const formatted = formatDate('2026-10-30T12:00:00');
  assert.match(formatted, /October/);
  assert.ok(!/[\u0600-\u06ff]/.test(formatted));
  setLanguagePreference('ar');
  assert.notEqual(formatDate('2026-10-30T12:00:00'), formatted);
});

test('date-of-birth editing accepts valid past dates and rejects empty, invalid, today and future dates', () => {
  const today = new Date(2026, 9, 30);
  assert.equal(validateDateOfBirth('2000-02-29', today), null);
  for (const value of ['', '2025-02-29', 'invalid', '2026-10-30', '2027-01-01']) assert.ok(validateDateOfBirth(value, today), value);
});

test('Alawneh Pay and Dinarak retain stable API IDs while their display labels translate', () => {
  setLanguagePreference('en');
  for (const [id, name] of [['alawneh_pay', 'Alawneh Pay'], ['dinarak', 'Dinarak']]) {
    const wallet = WALLETS.find((item) => item.id === id);
    assert.equal(t(wallet.name), name);
    assert.equal(wallet.id, id);
  }
});
