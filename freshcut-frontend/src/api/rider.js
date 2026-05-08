import api from './axios';

export const goOnline = () => api.put('/api/rider/status/online');
export const goOffline = () => api.put('/api/rider/status/offline');
export const getAvailableOrders = () => api.get('/api/rider/orders/available');
export const getActiveDelivery = () => api.get('/api/rider/orders/active');
export const acceptOrder = (id) => api.put(`/api/rider/orders/${id}/accept`);
export const pickupOrder = (id) => api.put(`/api/rider/orders/${id}/pickup`);
export const deliverOrder = (id) => api.put(`/api/rider/orders/${id}/deliver`);
export const getProfile = () => api.get('/api/rider/profile');
export const updateProfile = (data) => api.put('/api/rider/profile', data);
