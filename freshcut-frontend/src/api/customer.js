import api from './axios';

export const getShops = () => api.get('/api/customer/shops');
export const getShopMenu = (id) => api.get(`/api/customer/shops/${id}/menu`);
export const placeOrder = (orderData) => api.post('/api/customer/orders', orderData);
export const getOrder = (id) => api.get(`/api/customer/orders/${id}`);
export const getOrderHistory = () => api.get('/api/customer/orders/history');
export const cancelOrder = (id) => api.put(`/api/customer/orders/${id}/cancel`);
