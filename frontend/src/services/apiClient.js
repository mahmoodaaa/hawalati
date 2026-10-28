const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:7171').replace(/\/$/, '');
const SESSION_KEY = 'hawalati_api_session';
const listeners = new Set();
let session = readSession();
let refreshPromise = null;
let generation = 0;

function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY));
    return value?.accessToken && value?.refreshToken ? value : null;
  } catch { return null; }
}

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
  }
}

export function getSession() { return session; }

export function setSession(value, rotated = false) {
  if (!rotated) generation++;
  session = value ? { accessToken: value.accessToken, refreshToken: value.refreshToken } : null;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* Keep an in-memory session if browser storage is disabled. */ }
  listeners.forEach((listener) => listener(session));
}

export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function send(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method, headers, signal,
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('تعذر الاتصال بالخادم. تأكد من تشغيل الباك وإعدادات الاتصال.');
  }
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { /* Non-JSON error response. */ }
  if (!response.ok) throw new ApiError(data?.message || data?.error || `فشل الطلب (${response.status})`, response.status, data?.fieldErrors);
  if (raw && data === undefined) throw new ApiError('استجابة الخادم غير صالحة.', response.status);
  return data;
}

export async function refreshSession() {
  if (!refreshPromise) {
    const previous = session;
    if (!previous) throw new ApiError('يرجى تسجيل الدخول مجددًا.', 401);
    refreshPromise = (async () => {
      try {
        const result = await send('/api/auth/refresh', { method: 'POST', body: { refreshToken: previous.refreshToken } });
        if (session !== previous) throw new ApiError('تغيّرت الجلسة. يرجى المحاولة مجددًا.', 401);
        if (!result?.accessToken || !result?.refreshToken) throw new ApiError('استجابة الجلسة غير صالحة.', 401);
        setSession(result, true);
        return result;
      } catch (error) {
        if (session === previous) setSession(null);
        throw error;
      }
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function waitForRefresh() {
  if (refreshPromise) await refreshPromise.catch(() => {});
}

export async function apiRequest(path, { auth = true, ...options } = {}) {
  const original = session;
  const startedGeneration = generation;
  if (auth && !original) throw new ApiError('يرجى تسجيل الدخول مجددًا.', 401);
  try {
    return await send(path, { ...options, token: auth ? original.accessToken : undefined });
  } catch (error) {
    if (!auth || error.status !== 401 || generation !== startedGeneration) throw error;
    if (session === original) await refreshSession();
    const retried = session;
    if (!retried || generation !== startedGeneration) throw error;
    try {
      return await send(path, { ...options, token: retried.accessToken });
    } catch (retryError) {
      if (retryError.status === 401 && session === retried) setSession(null);
      throw retryError;
    }
  }
}
