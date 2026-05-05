import api from './axios';

export const getLiveOrders = () => api.get('/api/admin/orders/live');
export const getAllOrders = () => api.get('/api/admin/orders/all');
export const getAllShops = () => api.get('/api/admin/shops');
export const toggleShop = (id) => api.put(`/api/admin/shops/${id}/toggle`);
export const deleteShop = (id) => api.delete(`/api/admin/shops/${id}`);
export const getAllUsers = () => api.get('/api/admin/users');
export const deleteUser = (id) => api.delete(`/api/admin/users/${id}`);
export const updateUserRole = (id, role) => api.put(`/api/admin/users/${id}/role`, { role });
export const deleteOrder = (id) => api.delete(`/api/admin/orders/${id}`);
