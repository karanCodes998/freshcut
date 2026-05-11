import api from './axios';

export const getShops = (lat, lng) => {
    const params = lat && lng ? { params: { lat, lng } } : {};
    return api.get('/api/customer/shops', params);
};
export const getShopMenu = (id) => api.get(`/api/customer/shops/${id}/menu`);
export const placeOrder = (orderData) => api.post('/api/customer/orders', orderData);
export const getOrder = (id) => api.get(`/api/customer/orders/${id}`);
export const getOrderHistory = () => api.get('/api/customer/orders/history');
export const cancelOrder = (id) => api.put(`/api/customer/orders/${id}/cancel`);

// Address Management
export const getAddresses = () => api.get('/api/customer/addresses');
export const saveAddress = (addressData) => api.post('/api/customer/addresses', addressData);
export const deleteAddress = (id) => api.delete(`/api/customer/addresses/${id}`);
