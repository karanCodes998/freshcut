import api from './axios';

export const getShop = () => api.get('/api/butcher/shop');
export const createShop = (data) => api.post('/api/butcher/shop', data);
export const updateShop = (data) => api.put('/api/butcher/shop', data);
export const updateDeliveryFee = (data) => api.put('/api/butcher/shop/delivery-fee', data);
export const getItems = () => api.get('/api/butcher/items');
export const addItem = (data) => api.post('/api/butcher/items', data);
export const updateItem = (id, data) => api.put(`/api/butcher/items/${id}`, data);
export const deleteItem = (id) => api.delete(`/api/butcher/items/${id}`);
export const uploadImage = (id, formData) => api.post(`/api/butcher/items/${id}/image`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const toggleAvailability = (id) => api.put(`/api/butcher/items/${id}/toggle`);
export const getOrders = () => api.get('/api/butcher/orders');
export const acceptOrder = (id) => api.put(`/api/butcher/orders/${id}/accept`);
export const rejectOrder = (id) => api.put(`/api/butcher/orders/${id}/reject`);
export const prepareOrder = (id) => api.put(`/api/butcher/orders/${id}/prepare`);
export const readyOrder = (id) => api.put(`/api/butcher/orders/${id}/ready`);
