import api from './axios';

export const register = (data) => api.post('/api/auth/register', data);
export const login = (data) => api.post('/api/auth/login', data);
export const requestPasswordReset = (data) => api.post('/api/auth/forgot-password/request', data);
export const resetPassword = (data) => api.post('/api/auth/forgot-password/reset', data);
