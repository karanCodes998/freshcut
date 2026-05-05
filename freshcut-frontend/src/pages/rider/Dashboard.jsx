import { useState, useEffect, useRef } from 'react';
import { goOnline, goOffline, getAvailableOrders, getActiveDelivery, acceptOrder, pickupOrder, deliverOrder } from '../../api/rider';
import { useWebSocket, triggerNotification } from '../../hooks/useWebSocket';
import { useJsApiLoader, GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api';

const MAP_CONTAINER_STYLE = { width: '100%', height: '300px' };
const LIBRARIES = ['places'];

export default function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [alert, setAlert] = useState(null);
  const [earnings, setEarnings] = useState({ today: 0, total: 0, deliveries: 0 });
  const [directions, setDirections] = useState(null);
  const { subscribe, connected } = useWebSocket();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const fetchOrders = async () => {
    try {
      const [availableRes, activeRes] = await Promise.all([
        getAvailableOrders(),
        getActiveDelivery()
      ]);
      setOrders(availableRes.data);
      if (activeRes.data) {
        setActiveDelivery(activeRes.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOnline) fetchOrders();
  }, [isOnline]);

  useEffect(() => {
    if (connected && isOnline) {
      const sub = subscribe('/topic/riders', (order) => {
        if (order.status === 'READY') {
          setAlert(order);
          fetchOrders();
          triggerNotification('New Delivery Request!', `Pickup at ${order.shopName}`);
        }
      });
      return () => sub?.unsubscribe();
    }
  }, [connected, isOnline]);

  const toggleOnline = async () => {
    try {
      if (isOnline) await goOffline();
      else await goOnline();
      setIsOnline(!isOnline);
    } catch (err) { console.error(err); }
  };

  const handleAccept = async (orderId) => {
    try {
      await acceptOrder(orderId);
      // Use the order from the list, or fall back to the alert object itself
      const orderFromList = orders.find(o => o.id === orderId);
      const activeOrder = orderFromList || alert;
      
      setActiveDelivery(activeOrder);
      setOrders([]);
      setAlert(null);
    } catch (err) { 
      const msg = err.response?.data?.error || 'Failed to accept';
      alert(msg); 
      setAlert(null); // Clear the alert if it's already taken or invalid
      fetchOrders();
    }
  };

  const handlePickup = async () => {
    const prevDelivery = { ...activeDelivery };
    setActiveDelivery(prev => ({ ...prev, status: 'PICKED_UP' }));
    try {
      await pickupOrder(activeDelivery.id);
    } catch (_) { 
      setActiveDelivery(prevDelivery);
      alert('Failed to update status');
    }
  };

  const handleDeliver = async () => {
    const id = activeDelivery.id;
    const fee = parseFloat(activeDelivery.deliveryFee) || 40;
    
    // Optimistic UI updates
    const prevDelivery = { ...activeDelivery };
    setActiveDelivery(null);
    setEarnings(prev => ({ ...prev, today: prev.today + fee, total: prev.total + fee, deliveries: prev.deliveries + 1 }));
    
    try {
      await deliverOrder(id);
      fetchOrders();
    } catch (_) {
      // Rollback
      setActiveDelivery(prevDelivery);
      setEarnings(prev => ({ ...prev, today: prev.today - fee, total: prev.total - fee, deliveries: prev.deliveries - 1 }));
      alert('Failed to deliver order');
    }
  };

  // Fetch directions when active delivery changes or map loads
  useEffect(() => {
    if (isLoaded && activeDelivery && activeDelivery.latitude && activeDelivery.shopLat && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: parseFloat(activeDelivery.shopLat), lng: parseFloat(activeDelivery.shopLng) },
          destination: { lat: parseFloat(activeDelivery.latitude), lng: parseFloat(activeDelivery.longitude) },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    } else if (!activeDelivery) {
      setDirections(null);
    }
  }, [isLoaded, activeDelivery?.id, activeDelivery?.latitude]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Alert popup */}
      {alert && !activeDelivery && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full animate-slide-up">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2 animate-bounce">🛵</div>
              <h2 className="font-black text-xl text-gray-800">New Delivery Request!</h2>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm pb-2">
                <span className="text-gray-500">Pickup</span>
                <div className="text-right">
                  <div className="font-bold text-gray-800">{alert.shopName}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{alert.shopAddress}</div>
                  <a href={`tel:${alert.shopPhone}`} className="text-orange-600 font-black tracking-wide bg-white px-2 py-0.5 rounded border border-orange-200 block mt-1">
                    📞 {alert.shopPhone}
                  </a>
                </div>
              </div>
              <div className="flex justify-between text-sm pb-2 border-t border-blue-100 pt-2">
                <span className="text-gray-500">Drop-off</span>
                <div className="text-right">
                  <div className="font-bold text-gray-800 text-sm">{alert.deliveryAddress}</div>
                </div>
              </div>
              <div className="flex justify-between text-sm pb-2">
                <span className="text-gray-500">Customer</span>
                <div className="text-right">
                  <div className="font-bold text-gray-800">{alert.contactName || alert.customerName}</div>
                  <a href={`tel:${alert.contactPhone || alert.customerPhone}`} className="text-blue-600 font-black tracking-wide bg-white px-2 py-0.5 rounded border border-blue-200 block mt-1">
                    📞 {alert.contactPhone || alert.customerPhone}
                  </a>
                </div>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-blue-100">
                <span className="text-gray-500">Your Earnings</span>
                <span className="font-black text-green-600 text-lg">₹{alert.deliveryFee || 20}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAlert(null)} className="py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">
                Ignore
              </button>
              <button onClick={() => handleAccept(alert.id)} className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-lg shadow-blue-200">
                Accept 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-black">Rider Dashboard</h1>
              <p className="text-blue-200 text-sm mt-0.5">Manage your deliveries</p>
            </div>
            <button
              onClick={toggleOnline}
              className={`relative px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
                isOnline ? 'bg-green-400 shadow-green-300' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isOnline ? (
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span> ONLINE
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-gray-400 rounded-full"></span> OFFLINE
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Today's Earnings", value: `₹${earnings.today}`, emoji: "💰" },
              { label: "Total Earned", value: `₹${earnings.total}`, emoji: "📈" },
              { label: "Deliveries", value: earnings.deliveries, emoji: "📦" },
            ].map(s => (
              <div key={s.label} className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                <div className="font-black text-lg">{s.emoji} {s.value}</div>
                <div className="text-xs text-blue-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Active Delivery */}
        {activeDelivery && (
          <div className="bg-white rounded-2xl shadow-md border-2 border-blue-200 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-black text-blue-700">Active Delivery</span>
            </div>

            {/* Route */}
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">🏪</div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-semibold">PICKUP FROM</div>
                  <div className="font-black text-gray-900 text-lg leading-snug">{activeDelivery.shopName}</div>
                  <div className="text-sm text-gray-600 mt-1">{activeDelivery.shopAddress}</div>
                  <div className="flex gap-2 mt-3">
                    <a href={`tel:${activeDelivery.shopPhone}`} className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 font-black text-sm shadow-sm active:scale-95 transition-all">
                      📞 Call Shop
                    </a>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.shopLat},${activeDelivery.shopLng}&travelmode=driving&dir_action=navigate`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 font-black text-sm shadow-sm active:scale-95 transition-all"
                    >
                      🚀 Navigate to Shop
                    </a>
                  </div>
                </div>
              </div>
              <div className="ml-4 w-0.5 h-6 bg-dashed bg-gray-200"></div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">📍</div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold mb-1">DROP-OFF AT</div>
                  <div className="font-black text-gray-900 text-lg leading-snug">{activeDelivery.deliveryAddress}</div>
                </div>
              </div>
              <div className="ml-4 w-0.5 h-6 bg-dashed bg-gray-200"></div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">👤</div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-semibold mb-1">CUSTOMER</div>
                  <div className="font-bold text-gray-800">{activeDelivery.contactName || activeDelivery.customerName}</div>
                  <div className="flex gap-2 mt-2">
                    <a href={`tel:${activeDelivery.contactPhone || activeDelivery.customerPhone}`} className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 font-black text-sm shadow-sm active:scale-95 transition-all">
                      📞 Call
                    </a>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.latitude},${activeDelivery.longitude}&travelmode=driving&dir_action=navigate`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 font-black text-sm shadow-sm active:scale-95 transition-all"
                    >
                      🚀 Navigate
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Delivery Map */}
            {isLoaded && activeDelivery.latitude && activeDelivery.shopLat && (
              <div className="mb-5 rounded-2xl overflow-hidden border-2 border-blue-100 shadow-inner h-[300px] relative">
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  zoom={14}
                  center={{ lat: parseFloat(activeDelivery.shopLat), lng: parseFloat(activeDelivery.shopLng) }}
                >
                  {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
                  <Marker position={{ lat: activeDelivery.shopLat, lng: activeDelivery.shopLng }} label="🏪" title="Shop" />
                  <Marker position={{ lat: activeDelivery.latitude, lng: activeDelivery.longitude }} label="📍" title="Customer" />
                </GoogleMap>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-blue-200 text-[10px] font-black text-blue-700 shadow-sm">
                  ROUTE MAP 🗺️
                </div>
              </div>
            )}

            <div className="flex items-center justify-between bg-green-50 rounded-xl p-3 mb-5">
              <span className="text-gray-600 font-medium">Your Earnings</span>
              <span className="font-black text-green-600 text-xl">₹{activeDelivery.deliveryFee || 40}</span>
            </div>

            {activeDelivery.status !== 'PICKED_UP' ? (
              <button onClick={handlePickup} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-200">
                ✅ Picked Up from Shop
              </button>
            ) : (
              <button onClick={handleDeliver} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-green-200">
                🎉 Mark Delivered
              </button>
            )}
          </div>
        )}

        {/* Offline state */}
        {!isOnline && !activeDelivery && (
          <div className="text-center py-20">
            <div className="text-7xl mb-5">🛵</div>
            <h2 className="text-xl font-black text-gray-700">You're Offline</h2>
            <p className="text-gray-400 mt-2 mb-8">Go online to receive delivery requests</p>
            <button onClick={toggleOnline} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all">
              Go Online Now 🚀
            </button>
          </div>
        )}

        {/* Available orders */}
        {isOnline && !activeDelivery && (
          <>
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">⏳</div>
                <h3 className="font-bold text-gray-600">Waiting for orders...</h3>
                <p className="text-gray-400 text-sm mt-1">You'll get a notification when an order is ready</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-black text-gray-800 text-lg">Available Deliveries ({orders.length})</h2>
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                    <div className="flex justify-between mb-3">
                      <div>
                        <div className="font-black text-gray-800">Order #{order.id}</div>
                        <div className="text-gray-500 text-sm">Pickup: {order.shopName}</div>
                        <div className="text-gray-800 font-bold text-sm mt-1 max-w-[200px]">📍 {order.deliveryAddress}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-green-600 text-xl">₹{order.deliveryFee || 20}</div>
                        <div className="text-gray-400 text-xs">earnings</div>
                      </div>
                    </div>
                    <button onClick={() => handleAccept(order.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all shadow-md shadow-blue-200">
                      Accept Delivery 🚀
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
