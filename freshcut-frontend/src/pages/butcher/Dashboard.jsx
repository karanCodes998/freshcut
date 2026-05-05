import { useState, useEffect, useRef } from 'react';
import { getShop, createShop, getItems, addItem, deleteItem, toggleAvailability, uploadImage, getOrders, acceptOrder, rejectOrder, prepareOrder, readyOrder, updateShop } from '../../api/butcher';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket, triggerNotification } from '../../hooks/useWebSocket';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

const LIBRARIES = ['places'];
const MAP_OPTIONS = { disableDefaultUI: true };

export default function ButcherDashboard() {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();
  const [shop, setShop] = useState(null);
  const [hasShop, setHasShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('orders');
  const [shopForm, setShopForm] = useState({ shopName: '', address: '', area: '', latitude: 19.0760, longitude: 72.8777 });
  const [newItem, setNewItem] = useState({ name: '', description: '', pricePerKg: '' });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragOverId, setDragOverId] = useState(null);

  const fetchAll = async () => {
    try {
      const shopRes = await getShop();
      setShop(shopRes.data);
      setShopForm({
        shopName: shopRes.data.shopName,
        address: shopRes.data.address,
        area: shopRes.data.area,
        latitude: shopRes.data.latitude || 19.0760,
        longitude: shopRes.data.longitude || 72.8777
      });
      setHasShop(true);
      const [ordersRes, itemsRes] = await Promise.all([getOrders(), getItems()]);
      setOrders(ordersRes.data);
      setItems(itemsRes.data);
    } catch (e) {
      if (e.response?.status === 404) {
        setHasShop(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (connected && shop) {
      const sub = subscribe(`/topic/butcher/${shop.id}`, (order) => {
        setNewAlert(order);
        setOrders(prev => [order, ...prev]);
        triggerNotification('New Order Arrived!', `Order #${order.id} from ${order.contactName || order.customerName}`);
      });
      return () => sub?.unsubscribe();
    }
  }, [connected, shop]);

  const handleCreateShop = async (e) => {
    e.preventDefault();
    try {
      // Strip internal Autocomplete object and any non-serialisable values
      const { _autocomplete, ...payload } = shopForm;
      const cleanPayload = {
        shopName: payload.shopName,
        address: payload.address,
        area: payload.area,
        latitude: parseFloat(payload.latitude) || 19.0760,
        longitude: parseFloat(payload.longitude) || 72.8777,
      };
      await createShop(cleanPayload);
      await fetchAll();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to register shop';
      alert('❌ Registration failed: ' + msg);
      console.error('Shop registration error:', err.response?.data || err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await addItem({ ...newItem, pricePerKg: parseFloat(newItem.pricePerKg) });
      setNewItem({ name: '', description: '', pricePerKg: '' });
      const res = await getItems();
      setItems(res.data);
    } catch (err) { alert('Failed to add item'); }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setShopForm(prev => ({ ...prev, latitude, longitude }));
        // Reverse geocode if Google Maps is loaded
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === "OK" && results[0]) {
              setShopForm(prev => ({
                ...prev,
                address: results[0].formatted_address,
                latitude,
                longitude
              }));
            }
          });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert(
            "📍 Location access was denied.\n\n" +
            "This happens on local Wi-Fi (http://) because browsers require HTTPS for GPS.\n\n" +
            "👉 Please pin your shop location manually on the map below."
          );
        } else {
          alert("Could not get location: " + error.message);
        }
      },
      { timeout: 10000 }
    );
  };

  const handleImageUpload = async (itemId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    setUploadingId(itemId);
    setUploadProgress(prev => ({ ...prev, [itemId]: 0 }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      await uploadImage(itemId, formData);
      setUploadProgress(prev => ({ ...prev, [itemId]: 100 }));
      const res = await getItems();
      setItems(res.data);
    } catch (err) {
      alert('Image upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingId(null);
      setTimeout(() => setUploadProgress(prev => { const n = {...prev}; delete n[itemId]; return n; }), 1500);
    }
  };

  const handleOrderAction = async (id, action) => {
    // Optimistic Update
    let newStatus = '';
    if (action === 'accept') newStatus = 'ACCEPTED';
    else if (action === 'reject') newStatus = 'CANCELLED';
    else if (action === 'prepare') newStatus = 'PREPARING';
    else if (action === 'ready') newStatus = 'READY';

    const previousOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

    try {
      if (action === 'accept') await acceptOrder(id);
      else if (action === 'reject') await rejectOrder(id);
      else if (action === 'prepare') await prepareOrder(id);
      else if (action === 'ready') await readyOrder(id);
      
      // Async fetch to sync up
      getOrders().then(res => setOrders(res.data)).catch(() => {});
    } catch (err) { 
      // Revert if failed
      alert('Action failed'); 
      setOrders(previousOrders);
    }
  };

  const statusColor = {
    PLACED: 'bg-yellow-100 text-yellow-700',
    ACCEPTED: 'bg-blue-100 text-blue-700',
    PREPARING: 'bg-indigo-100 text-indigo-700',
    READY: 'bg-green-100 text-green-700',
    PICKED_UP: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-5xl animate-bounce mb-4">🏪</div><p className="text-gray-500">Loading your dashboard...</p></div>
    </div>
  );

  // No shop yet — onboarding
  if (!hasShop) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-black text-gray-800">Register Your Shop</h1>
          <p className="text-gray-500 mt-2">Set up your butcher shop to start receiving orders</p>
        </div>
        <form onSubmit={handleCreateShop} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Name *</label>
            <input required value={shopForm.shopName} onChange={e => setShopForm({ ...shopForm, shopName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" placeholder="e.g. Ali Fresh Meat" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Area / Locality *</label>
            <input required value={shopForm.area} onChange={e => setShopForm({ ...shopForm, area: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" placeholder="e.g. Bandra West" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-700">Full Address & Location *</label>
              <button 
                type="button"
                onClick={handleCurrentLocation}
                className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200 hover:bg-green-100 transition-all flex items-center gap-1"
              >
                🎯 USE CURRENT LOCATION
              </button>
            </div>
            {isLoaded ? (
              <Autocomplete
                onLoad={auto => setShopForm(prev => ({ ...prev, _autocomplete: auto }))}
                onPlaceChanged={() => {
                  const place = shopForm._autocomplete.getPlace();
                  if (place.geometry) {
                    setShopForm(prev => ({
                      ...prev,
                      address: place.formatted_address || place.name,
                      latitude: place.geometry.location.lat(),
                      longitude: place.geometry.location.lng()
                    }));
                  }
                }}
              >
                <input
                  type="text"
                  required
                  value={shopForm.address}
                  onChange={e => setShopForm({ ...shopForm, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                  placeholder="Search your shop location..."
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                required
                value={shopForm.address}
                onChange={e => setShopForm({ ...shopForm, address: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                placeholder="Loading Maps..."
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Pin Shop Location on Map *</label>
            <div className="h-64 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner relative">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: shopForm.latitude, lng: shopForm.longitude }}
                  zoom={15}
                  onClick={(e) => setShopForm(prev => ({ ...prev, latitude: e.latLng.lat(), longitude: e.latLng.lng() }))}
                  options={MAP_OPTIONS}
                >
                  <Marker position={{ lat: shopForm.latitude, lng: shopForm.longitude }} draggable onDragEnd={(e) => setShopForm(prev => ({ ...prev, latitude: e.latLng.lat(), longitude: e.latLng.lng() }))} />
                </GoogleMap>
              ) : <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Maps...</div>}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-green-200 text-[10px] font-black text-green-700 shadow-sm">
                CLICK TO PIN 📍
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Accurate location helps customers see correct delivery fees.</p>
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-4 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-200">
            🚀 Register Shop
          </button>
        </form>
      </div>
    </div>
  );

  const liveOrders = orders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status));
  const pastOrders = orders.filter(o => ['READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(o.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* New Order Alert */}
      {newAlert && (
        <div className="fixed top-20 right-4 z-50 bg-green-500 text-white rounded-2xl p-4 shadow-2xl shadow-green-300 animate-slide-up max-w-xs">
          <div className="flex items-center gap-2 font-black mb-1">🔔 New Order!</div>
          <div className="text-sm opacity-90">Order #{newAlert.id} • ₹{newAlert.totalAmount}</div>
          <button onClick={() => setNewAlert(null)} className="mt-2 text-xs underline opacity-80">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-black">{shop?.shopName}</h1>
          <p className="opacity-80 text-sm mt-1">📍 {shop?.area} • {shop?.isActive ? '🟢 Open' : '🔴 Closed'}</p>
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[
              { label: "Live Orders", value: liveOrders.length, emoji: "🔔" },
              { label: "Total Orders", value: orders.length, emoji: "📦" },
              { label: "Menu Items", value: items.length, emoji: "🍖" },
            ].map(s => (
              <div key={s.label} className="bg-white/20 rounded-2xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-black">{s.emoji} {s.value}</div>
                <div className="text-xs opacity-75 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 py-2">
          {[
            { key: 'orders', label: `📋 Orders ${liveOrders.length > 0 ? `(${liveOrders.length} new)` : ''}` },
            { key: 'menu', label: '🍖 Menu Manager' },
            { key: 'settings', label: '⚙️ Shop Settings' },
            { key: 'history', label: '📜 History' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.key ? 'bg-green-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {liveOrders.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-bold text-gray-600">No pending orders</h3>
                <p className="text-gray-400 text-sm mt-1">New orders will appear here instantly</p>
              </div>
            )}
            {liveOrders.map(order => (
              <div key={order.id} className={`bg-white rounded-2xl shadow-sm border-l-4 ${order.status === 'PLACED' ? 'border-yellow-400' : 'border-blue-400'} p-5 animate-slide-up`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-gray-900 text-lg">Order #{order.id}</h2>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor[order.status]}`}>{order.status}</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">👤 {order.customerName} • 📞 {order.customerPhone}</p>
                    <p className="text-gray-400 text-xs mt-0.5">📍 {order.deliveryAddress}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-green-600">₹{order.totalAmount}</div>
                    <div className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-gray-700">• {item.quantityGrams}g {item.name}</span>
                      <span className="font-semibold text-gray-600">₹{item.price}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  {order.status === 'PLACED' && (
                    <>
                      <button onClick={() => handleOrderAction(order.id, 'accept')}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-all text-base shadow-lg shadow-green-200">
                        ✅ Accept
                      </button>
                      <button onClick={() => handleOrderAction(order.id, 'reject')}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-3 rounded-xl transition-all text-base border-2 border-red-200">
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {order.status === 'ACCEPTED' && (
                    <button onClick={() => handleOrderAction(order.id, 'prepare')}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-indigo-200">
                      🔪 Start Preparing
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button onClick={() => handleOrderAction(order.id, 'ready')}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-200">
                      🟢 Mark as Ready for Pickup
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MENU TAB */}
        {tab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Item Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-32">
                <h2 className="font-black text-gray-800 text-lg mb-4">➕ Add New Item</h2>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ITEM NAME *</label>
                    <input required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="e.g. Chicken Breast" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">DESCRIPTION</label>
                    <textarea rows="2" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" placeholder="Fresh skinless chicken breast..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">PRICE PER KG (₹) *</label>
                    <input required type="number" min="1" value={newItem.pricePerKg} onChange={e => setNewItem({ ...newItem, pricePerKg: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="e.g. 350" />
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all">
                    Add to Menu
                  </button>
                </form>
              </div>
            </div>

            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {items.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <div className="text-5xl mb-3">🍖</div>
                  <h3 className="font-bold text-gray-600">No items yet</h3>
                  <p className="text-gray-400 text-sm mt-1">Add your first meat item to get started</p>
                </div>
              ) : (
                items.map(item => {
                  const isUploading = uploadingId === item.id;
                  const isDragOver = dragOverId === item.id;
                  const progress = uploadProgress[item.id];
                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-start gap-4 p-4">
                        {/* Image area — click or drag to upload */}
                        <label
                          htmlFor={`img-${item.id}`}
                          onDragOver={e => { e.preventDefault(); setDragOverId(item.id); }}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={e => { e.preventDefault(); setDragOverId(null); handleImageUpload(item.id, e.dataTransfer.files[0]); }}
                          className={`relative w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden cursor-pointer group transition-all border-2 ${
                            isDragOver ? 'border-green-400 scale-105' : 'border-dashed border-gray-200 hover:border-green-400'
                          } bg-orange-50`}
                        >
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <span className="text-3xl">🥩</span>
                                <span className="text-[10px] font-bold mt-1">No Image</span>
                              </div>
                          }
                          {/* Hover overlay */}
                          <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                            isUploading ? 'opacity-100' : ''
                          }`}>
                            {isUploading
                              ? <div className="text-white text-xs font-bold animate-pulse">⏳ Uploading...</div>
                              : <>
                                  <span className="text-white text-xl">📷</span>
                                  <span className="text-white text-[10px] font-bold mt-1">{item.imageUrl ? 'Change' : 'Upload'}</span>
                                </>
                            }
                          </div>
                          <input
                            id={`img-${item.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { if (e.target.files[0]) handleImageUpload(item.id, e.target.files[0]); e.target.value = ''; }}
                          />
                        </label>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-base">{item.name}</div>
                          <div className="text-gray-500 text-sm mt-0.5 line-clamp-2">{item.description}</div>
                          <div className="font-bold text-orange-600 mt-1">₹{item.pricePerKg}/kg</div>
                          <div className="text-gray-400 text-xs mt-1">📷 Click image or drag & drop to upload photo</div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button onClick={async () => { await toggleAvailability(item.id); const res = await getItems(); setItems(res.data); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              item.isAvailable ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            {item.isAvailable ? '🟢 Available' : '⚫ Hidden'}
                          </button>
                          <button onClick={async () => { await deleteItem(item.id); const res = await getItems(); setItems(res.data); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition-colors border border-red-100">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {/* Upload progress bar */}
                      {isUploading && (
                        <div className="px-4 pb-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Uploading to Cloudinary...</p>
                        </div>
                      )}
                      {progress === 100 && !isUploading && (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-green-600 font-bold">✅ Image uploaded successfully!</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
            <h2 className="text-2xl font-black text-gray-800 mb-6">⚙️ Shop Settings</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Remove internal _autocomplete object before sending to API
                const { _autocomplete, ...payload } = shopForm;
                await updateShop(payload);
                alert('Shop settings updated!');
                fetchAll();
              } catch (err) { alert('Update failed'); }
            }} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Shop Name</label>
                <input value={shopForm.shopName} onChange={e => setShopForm({ ...shopForm, shopName: e.target.value })}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Area</label>
                <input value={shopForm.area} onChange={e => setShopForm({ ...shopForm, area: e.target.value })}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-green-400" />
              </div>
              <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase">Full Address & Search</label>
                <button 
                  type="button"
                  onClick={handleCurrentLocation}
                  className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200 hover:bg-green-100 transition-all flex items-center gap-1"
                >
                  🎯 USE CURRENT LOCATION
                </button>
              </div>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={auto => setShopForm(prev => ({ ...prev, _autocomplete: auto }))}
                    onPlaceChanged={() => {
                      const place = shopForm._autocomplete.getPlace();
                      if (place.geometry) {
                        setShopForm(prev => ({
                          ...prev,
                          address: place.formatted_address || place.name,
                          latitude: place.geometry.location.lat(),
                          longitude: place.geometry.location.lng()
                        }));
                      }
                    }}
                  >
                    <input
                      type="text"
                      value={shopForm.address}
                      onChange={e => setShopForm({ ...shopForm, address: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-green-400"
                      placeholder="Search your shop location..."
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={shopForm.address}
                    onChange={e => setShopForm({ ...shopForm, address: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-green-400"
                    placeholder="Loading Maps..."
                  />
                )}
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-gray-500 uppercase">Update Map Location</label>
                <div className="h-64 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner relative">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: shopForm.latitude || 19.0760, lng: shopForm.longitude || 72.8777 }}
                      zoom={15}
                      onClick={(e) => setShopForm(prev => ({ ...prev, latitude: e.latLng.lat(), longitude: e.latLng.lng() }))}
                      options={MAP_OPTIONS}
                    >
                      <Marker position={{ lat: shopForm.latitude || 19.0760, lng: shopForm.longitude || 72.8777 }} draggable 
                        onDragEnd={(e) => setShopForm(prev => ({ ...prev, latitude: e.latLng.lat(), longitude: e.latLng.lng() }))} />
                    </GoogleMap>
                  ) : <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading Maps...</div>}
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-4 rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all">
                💾 Save Changes
              </button>
            </form>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="space-y-3">
            {pastOrders.length === 0 && <div className="text-center py-16 text-gray-400">No order history yet</div>}
            {pastOrders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="font-bold text-gray-800">Order #{order.id} <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${statusColor[order.status]}`}>{order.status}</span></div>
                  <div className="text-gray-500 text-sm mt-0.5">👤 {order.customerName} • {new Date(order.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right font-black text-gray-800">₹{order.totalAmount}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
