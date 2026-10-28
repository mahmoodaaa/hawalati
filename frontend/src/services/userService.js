import { apiRequest } from './apiClient';
export function getProfile() { return apiRequest('/api/user/profile'); }
export function submitKyc() { return apiRequest('/api/user/kyc', { method: 'POST' }); }
