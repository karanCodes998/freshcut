import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder, cancelOrder } from '../../api/customer';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useJsApiLoader, GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api';

const MAP_CONTAINER_STYLE = { width: '100%', height: '240px' };
const LIBRARIES = ['places'];

const STEPS = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];

const STEP_INFO = {
  PLACED:    { icon: '📋', label: 'Order Placed',       desc: 'Your order has been sent to the shop' },
  ACCEPTED:  { icon: '✅', label: 'Order Accepted',     desc: 'Butcher confirmed your order' },
  PREPARING: { icon: '🔪', label: 'Preparing',          desc: 'Your meat is being cut & packed' },
  READY:     { icon: '📦', label: 'Ready for Pickup',   desc: 'Packed and waiting for rider' },
  PICKED_UP: { icon: '🛵', label: 'Out for Delivery',   desc: 'Rider is on the way to you' },
  DELIVERED: { icon: '🎉', label: 'Delivered',          desc: 'Enjoy your fresh meat!' },
  CANCELLED: { icon: '❌', label: 'Cancelled',          desc: 'This order was cancelled' },
};

export default function OrderTracking() {
  const { id } = useParams();
  const { subscribe, connected } = useWebSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flashUpdate, setFlashUpdate] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [directions, setDirections] = useState(null);
  const [map, setMap] = useState(null);

  const onLoad = (mapInstance) => setMap(mapInstance);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      const res = await cancelOrder(id);
      setOrder(res.data);
    } catch (err) {
      console.error("Cancel failed: ", err);
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    getOrder(id)
      .then(res => setOrder(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Subscribe to live order updates
  useEffect(() => {
    if (!connected) return;
    const sub = subscribe(`/topic/order/${id}`, (update) => {
      setOrder(prev => ({ ...prev, status: update.status }));
      setFlashUpdate(true);
      setTimeout(() => setFlashUpdate(false), 2000);
    });
    return () => sub?.unsubscribe();
  }, [connected, id]);

  // Fetch directions when map is loaded and order exists
  useEffect(() => {
    if (isLoaded && order && order.latitude && order.shopLat && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: parseFloat(order.shopLat), lng: parseFloat(order.shopLng) },
          destination: { lat: parseFloat(order.latitude), lng: parseFloat(order.longitude) },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [isLoaded, order?.id, order?.latitude]);

  // Auto-fit bounds when directions or order changes
  useEffect(() => {
    if (map && order && isLoaded && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: parseFloat(order.shopLat), lng: parseFloat(order.shopLng) });
      bounds.extend({ lat: parseFloat(order.latitude), lng: parseFloat(order.longitude) });
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [map, order?.id, directions]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-5xl animate-bounce mb-4">🛵</div><p className="text-gray-500">Loading order...</p></div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4">❌</div><p className="text-gray-500">Order not found</p></div>
    </div>
  );

  const stepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const stepInfo = STEP_INFO[order.status] || STEP_INFO.PLACED;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className={`transition-all duration-500 ${flashUpdate ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white px-4 py-6`}>
        <div className="max-w-lg mx-auto">
          <Link to="/customer" className="text-white/80 text-sm hover:text-white mb-3 inline-block">← Back to shops</Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">Order #{order.id}</h1>
              <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
                <span>🏪 {order.shopName}</span>
                <span className="opacity-50">|</span>
                <span>📞 {order.shopPhone}</span>
              </div>
              <div className="text-[10px] text-white/60 mt-0.5 max-w-[200px] truncate">{order.shopAddress}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl">{stepInfo.icon}</div>
              <div className="text-sm font-bold mt-1">{stepInfo.label}</div>
            </div>
          </div>
          {flashUpdate && (
            <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 text-sm font-bold animate-slide-up">
              🔔 Status updated: {order.status}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">
        {/* Live Map Tracking */}
        {!isCancelled && order.status !== 'DELIVERED' && isLoaded && order.latitude && order.shopLat && order.riderName && (
          <div className="mb-4 rounded-2xl overflow-hidden border-2 border-orange-100 shadow-md h-[240px] relative bg-white transition-all duration-700">
            <GoogleMap
              onLoad={onLoad}
              mapContainerStyle={MAP_CONTAINER_STYLE}
              zoom={14}
              center={{ lat: parseFloat(order.shopLat), lng: parseFloat(order.shopLng) }}
              options={{
                disableDefaultUI: true,
                clickableIcons: false,
                styles: [
                  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
                  { featureType: 'landscape', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
                  { featureType: 'administrative', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
                ]
              }}
            >
              {directions && (
                <DirectionsRenderer 
                  directions={directions} 
                  options={{ 
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: '#2563EB',
                      strokeWeight: 5,
                      strokeOpacity: 0.8
                    }
                  }} 
                />
              )}
              
              {/* Rider Marker (Very Clear Small Scooty) */}
              {order.riderName && order.status === 'PICKED_UP' && (
                <Marker 
                  position={{ lat: parseFloat(order.shopLat), lng: parseFloat(order.shopLng) }} 
                  icon={{
                    url: 'https://cdn-icons-png.flaticon.com/512/3198/3198336.png', // Clear Scooty Icon
                    scaledSize: new window.google.maps.Size(32, 32),
                    anchor: new window.google.maps.Point(16, 16)
                  }}
                />
              )}
            </GoogleMap>
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-orange-200 text-[10px] font-black text-orange-600 shadow-sm">
              {order.status === 'PICKED_UP' ? 'RIDER IS ON THE WAY 🛵' : 'LIVE ROUTE 🛣️'}
            </div>
            {directions && (
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded-xl text-white text-[10px] font-black shadow-lg">
                ⏱️ ARRIVING IN {directions.routes[0].legs[0].duration.text.toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Rider Card (Swiggy Style) */}
        {order.riderName && order.status !== 'DELIVERED' && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border-2 border-orange-50 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-3xl shadow-inner">🛵</div>
                <div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Your Delivery Partner</div>
                  <div className="font-black text-gray-800 text-lg">{order.riderName}</div>
                  <div className={`flex items-center gap-1 ${order.status === 'PICKED_UP' ? 'text-green-600' : 'text-blue-600'} text-[10px] font-bold`}>
                    <span className={`w-1.5 h-1.5 ${order.status === 'PICKED_UP' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'} rounded-full`}></span> 
                    {order.status === 'PICKED_UP' ? 'OUT FOR DELIVERY' : 'ASSIGNED TO YOUR ORDER'}
                  </div>
                </div>
              </div>
              <a 
                href={`tel:${order.riderPhone}`} 
                className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-200 transition-all active:scale-90"
              >
                📞
              </a>
            </div>
          </div>
        )}

        {/* Progress tracker */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <h2 className="font-black text-gray-800 mb-5">📡 Live Tracking</h2>
            <div className="relative">
              {/* Progress line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100"></div>
              <div
                className="absolute left-5 top-0 w-0.5 bg-gradient-to-b from-orange-400 to-red-400 transition-all duration-1000"
                style={{ height: `${Math.min(100, (stepIndex / (STEPS.length - 1)) * 100)}%` }}
              ></div>

              <div className="space-y-6">
                {STEPS.map((step, i) => {
                  const info = STEP_INFO[step];
                  const isDone = i <= stepIndex;
                  const isCurrent = i === stepIndex;
                  return (
                    <div key={step} className="flex items-start gap-4 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500 ${
                        isDone ? 'bg-gradient-to-br from-orange-400 to-red-400 shadow-lg shadow-orange-200' : 'bg-gray-100'
                      } ${isCurrent ? 'ring-4 ring-orange-200 scale-110' : ''}`}>
                        <span className={`text-lg ${isDone ? '' : 'grayscale opacity-40'}`}>{info.icon}</span>
                      </div>
                      <div className="pt-1.5 flex-1">
                        <div className={`font-bold text-sm ${isDone ? 'text-gray-900' : 'text-gray-300'}`}>
                          {info.label}
                          {isCurrent && <span className="ml-2 text-xs font-normal text-orange-500 animate-pulse">● NOW</span>}
                        </div>
                        {isDone && <div className="text-gray-400 text-xs mt-0.5">{info.desc}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-4 text-center">
            <div className="text-4xl mb-2">❌</div>
            <h3 className="font-black text-red-700">Order Cancelled</h3>
            <p className="text-red-500 text-sm mt-1">Sorry, this order was cancelled by the shop.</p>
            <Link to="/customer" className="mt-4 inline-block bg-red-500 text-white px-6 py-2 rounded-xl font-bold text-sm">
              Order Again →
            </Link>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="font-black text-gray-800 mb-4">🧾 Order Summary</h2>
          <div className="space-y-2 mb-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">• {item.quantityGrams}g {item.name}</span>
                <span className="font-semibold text-gray-800">₹{parseFloat(item.price).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>₹{(order.totalAmount - (order.deliveryFee || 0) - (order.serviceFee || 9)).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery Fee</span>
              <span>₹{parseFloat(order.deliveryFee || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Service Fee</span>
              <span>₹{parseFloat(order.serviceFee || 9).toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-black text-base pt-2 border-t">
              <span>Total Paid</span>
              <span className="text-orange-600">₹{parseFloat(order.totalAmount || 0).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-black text-gray-800 mb-3">📍 Delivery Address</h2>
          <p className="text-gray-600 text-sm">{order.deliveryAddress}</p>
          <div className="mt-3 pt-3 border-t text-xs text-gray-400">
            Ordered on {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Actions */}
        {(order.status === 'PLACED' || order.status === 'ACCEPTED') && (
          <div className="mt-6 mb-4 flex justify-center">
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="w-full px-6 py-4 border border-red-200 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 disabled:opacity-50 transition-colors shadow-sm text-lg"
            >
              {cancelling ? '⏳ Cancelling...' : '❌ Cancel Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
