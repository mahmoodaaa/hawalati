import { apiRequest } from './apiClient.js';

export function getProfile() { return apiRequest('/api/user/profile'); }
export function submitKyc() { return apiRequest('/api/user/kyc', { method: 'POST' }); }
export function getDocument() { return apiRequest('/api/user/document'); }

export function updateProfile(fields) {
  const allowed = ['fullName', 'fullNameEn', 'dateOfBirth', 'placeOfBirth', 'address', 'phone', 'username'];
  return apiRequest('/api/user/profile', {
    method: 'PUT', body: Object.fromEntries(allowed.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])),
  });
}

export const DOCUMENT_TYPES = [
  { id: 'national_id', label: 'الهوية الوطنية' },
  { id: 'passport', label: 'جواز السفر' },
  { id: 'license', label: 'رخصة القيادة' },
];

export function validateDocument(file) {
  if (!file || file.size === 0) return 'اختر ملف وثيقة غير فارغ أولًا.';
  if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
    return 'نوع الملف غير مدعوم. اختر JPEG أو PNG أو PDF.';
  }
  if (file.size > 5 * 1024 * 1024) return 'حجم الملف يجب ألا يتجاوز 5 ميغابايت.';
  return '';
}

export async function uploadDocument(file, documentType) {
  const error = validateDocument(file);
  if (error) throw new Error(error);
  if (!DOCUMENT_TYPES.some((type) => type.id === documentType)) throw new Error('اختر نوع وثيقة صالحًا.');
  const body = new FormData();
  body.append('file', file);
  body.append('documentType', documentType);
  return apiRequest('/api/user/document', { method: 'PUT', body });
}
