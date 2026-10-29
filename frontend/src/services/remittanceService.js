import { apiRequest } from './apiClient.js';

// Review estimate only. The receipt/history always use the server's fee and net.
export const DEMO_SERVICE_FEE_JOD = 1.50;
export const isRemittanceId = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function lookupRemittance({ referenceNumber, providerId, approxAmount }) {
  const amount = Number(approxAmount);
  if (!referenceNumber?.trim() || !providerId || !Number.isFinite(amount) || amount < 0.01) {
    throw new Error('أدخل رقم الحوالة والجهة ومبلغًا صحيحًا بالدينار الأردني.');
  }
  const result = await apiRequest('/api/remittances/lookup', {
    method: 'POST', body: { referenceNumber: referenceNumber.trim(), providerId, approxAmount: amount },
  });
  if (!['AVAILABLE', 'NOT_FOUND', 'ALREADY_RECEIVED', 'PROVIDER_MISMATCH'].includes(result?.status)
    || (result.status === 'AVAILABLE' && !isRemittanceId(result.remittance?.id))) {
    throw new Error('استجابة البحث غير مكتملة. أعد المحاولة.');
  }
  return result;
}

export async function receiveRemittance({ remittanceId, destination, agreed }) {
  if (!isRemittanceId(remittanceId)) throw new Error('أعد البحث عن الحوالة للحصول على بياناتها من الخادم.');
  if (agreed !== true) throw new Error('يرجى الموافقة على تفاصيل العملية قبل التأكيد.');
  const details = destination?.details;
  if (!details || !['bank', 'wallet'].includes(destination.type)) throw new Error('اختر وجهة استلام صالحة.');
  const fields = destination.type === 'bank' ? ['bankId', 'iban', 'accountName'] : ['walletId', 'walletPhone'];
  const payload = {
    remittanceId, agreed: true,
    destination: { type: destination.type, details: Object.fromEntries(fields.map((key) => [key, details[key]])) },
  };
  return apiRequest('/api/remittances/receive', { method: 'POST', body: payload });
}

export async function getRemittanceHistory() {
  const result = await apiRequest('/api/remittances/history');
  if (!Array.isArray(result)) throw new Error('تعذر قراءة سجل العمليات من الخادم.');
  return result;
}
