import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { placeOrder } from '../../api/customer';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

const LIBRARIES = ['places'];
const MAP_OPTIONS = {
  disableDefaultUI: true,
  clickableIcons: false,
  scrollwheel: true,
};
const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 }; // Mumbai default

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopId, cart, items, shopName, deliveryFee } = location.state || {};

  const [form, setForm] = useState({
    contactName: '',
    contactPhone: '',
    deliveryAddress: '',
    locality: '',
    latitude: null,
    longitude: null,
  });
  const [distanceInfo, setDistanceInfo] = useState({ distance: 0, duration: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);

  // Debug log to catch issues
  console.log('Checkout Render:', { form, distanceInfo, shopId, cartCount: cart ? Object.keys(cart).length : 0 });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  if (!shopId || !cart) {
    navigate('/customer');
    return null;
  }

  const cartItems = (cart && items) ? Object.keys(cart).map(id => ({
    item: items.find(i => i.id === parseInt(id)),
    grams: cart[id],
  })).filter(x => x && x.item) : [];

  const subtotal = cartItems.reduce((s, { item, grams }) => s + (parseFloat(item.pricePerKg || 0) * parseInt(grams || 0)) / 1000, 0) || 0;
  
  // Dynamic Delivery Fee: 10 (base) + 6 per km
  const deliveryFeeValue = distanceInfo.distance > 0 
    ? 10 + (distanceInfo.distance * 6)
    : parseFloat(deliveryFee || 40) || 40;
    
  const serviceFeeValue = 9;
  const total = (subtotal + deliveryFeeValue + serviceFeeValue) || 0;

  const handlePlaceOrder = async () => {
    if (!form.contactName.trim()) { setError('Please enter your name'); return; }
    if (!form.contactPhone.trim() || form.contactPhone.length < 10) { setError('Please enter a valid 10-digit phone number'); return; }
    if (!form.locality.trim()) { setError('Please enter your Area / Locality'); return; }
    if (!form.deliveryAddress.trim()) { setError('Please enter full delivery address'); return; }
    if (!form.latitude) { setError('Please select a precise location from the address suggestions'); return; }

    setPlacing(true);
    setError('');
    try {
      const orderItems = cartItems.map(({ item, grams }) => ({
        meatItemId: item.id,
        quantityGrams: grams,
      }));
      const fullAddress = form.locality.trim() 
        ? `${form.deliveryAddress}, ${form.locality}`
        : form.deliveryAddress;
        
      const res = await placeOrder({
        shopId,
        deliveryAddress: fullAddress,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        latitude: form.latitude,
        longitude: form.longitude,
        deliveryFee: deliveryFeeValue, // Send calculated fee
        items: orderItems,
      });
      navigate(`/customer/orders/${res.data.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order. Try again.');
    } finally {
      setPlacing(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address;
              setForm(prev => ({ ...prev, deliveryAddress: address, latitude, longitude }));
              
              // Calculate distance to shop
              const shopLat = parseFloat(location.state?.shopLat);
              const shopLng = parseFloat(location.state?.shopLng);
              if (!isNaN(shopLat) && !isNaN(shopLng)) {
                const service = new window.google.maps.DistanceMatrixService();
                service.getDistanceMatrix({
                  origins: [{ lat: shopLat, lng: shopLng }],
                  destinations: [{ lat: latitude, lng: longitude }],
                  travelMode: window.google.maps.TravelMode.DRIVING,
                }, (response, status) => {
                  if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
                    const element = response.rows[0].elements[0];
                    setDistanceInfo({ distance: element.distance.value / 1000, duration: element.duration.text });
                  }
                });
              }
            }
          });
        }
      },
      (error) => {
        alert("Error getting location: " + error.message);
      }
    );
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      try {
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        if (isNaN(lat) || isNaN(lng)) return;

        const address = place.formatted_address || place.name;
        setForm(prev => ({ ...prev, deliveryAddress: address, latitude: lat, longitude: lng }));

        // Calculate distance if shop location exists and google maps is available
        const shopLat = parseFloat(location.state?.shopLat);
        const shopLng = parseFloat(location.state?.shopLng);

        if (!isNaN(shopLat) && !isNaN(shopLng) && window.google) {
          const service = new window.google.maps.DistanceMatrixService();
          service.getDistanceMatrix({
            origins: [{ lat: shopLat, lng: shopLng }],
            destinations: [{ lat, lng }],
            travelMode: window.google.maps.TravelMode.DRIVING,
          }, (response, status) => {
            try {
              if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
                const element = response.rows[0].elements[0];
                const dist = (element.distance?.value || 0) / 1000; // to KM
                const dur = element.duration?.text || '30 mins';
                setDistanceInfo({ distance: dist, duration: dur });
              }
            } catch (err) {
              console.error("Distance Matrix parse error:", err);
            }
          });
        }
      } catch (err) {
        console.error("Maps error:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white text-xl">←</button>
          <div>
            <h1 className="text-xl font-black">Checkout</h1>
            <p className="text-orange-100 text-sm">{shopName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
            Order Summary
          </h2>
          <div className="space-y-3 mb-4">
            {cartItems.map(({ item, grams }) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : <span className="text-xl">🥩</span>}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">{item.name}</div>
                  <div className="text-gray-400 text-xs">{grams}g × ₹{item.pricePerKg}/kg</div>
                </div>
                <div className="font-bold text-gray-800">₹{(((parseFloat(item.pricePerKg || 0) * parseInt(grams || 0)) / 1000) || 0).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery Fee {distanceInfo.distance > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-1">({distanceInfo.distance.toFixed(1)} km)</span>}</span>
              <span>₹{deliveryFeeValue.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Service Fee</span>
              <span>₹{serviceFeeValue}</span>
            </div>
            <div className="flex justify-between font-black text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-orange-600">₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-black text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
            Payment Method
          </h2>
          <div className="flex items-center gap-4 bg-green-50 border-2 border-green-300 rounded-2xl p-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">💵</div>
            <div className="flex-1">
              <div className="font-black text-green-800">Cash on Delivery (COD)</div>
              <div className="text-green-600 text-sm mt-0.5">Pay ₹{total.toFixed(0)} when your order arrives</div>
            </div>
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>
          </div>
          <p className="text-gray-400 text-xs mt-3 text-center">No online payment required. Keep cash ready.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              Delivery Details
            </h2>
            <button 
              onClick={handleCurrentLocation}
              className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200 hover:bg-orange-100 transition-all flex items-center gap-1"
            >
              🎯 USE CURRENT LOCATION
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Your Name *</label>
              <input
                value={form.contactName}
                onChange={e => setForm({ ...form, contactName: e.target.value })}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Phone Number *</label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600">🇮🇳 +91</div>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.contactPhone}
                  onChange={e => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, '') })}
                  className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                  placeholder="9876543210"
                />
              </div>
              <p className="text-gray-400 text-xs mt-1">Rider will call on this number</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Area / Locality *</label>
              <input
                value={form.locality}
                onChange={e => setForm({ ...form, locality: e.target.value })}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                placeholder="e.g. Bandra West, Andheri East..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Full Delivery Address *</label>
              {isLoaded ? (
                <div className="space-y-3">
                  <Autocomplete
                    onLoad={setAutocomplete}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <input
                      type="text"
                      value={form.deliveryAddress}
                      onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Search for your building, street, or area..."
                    />
                  </Autocomplete>
                  {!form.latitude && (
                    <button 
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng }))}
                      className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-[10px] font-bold hover:border-orange-300 hover:text-orange-500 transition-all"
                    >
                      📍 OR PIN LOCATION MANUALLY ON MAP
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={form.deliveryAddress}
                  onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Loading Maps..."
                />
              )}
              {form.latitude && form.longitude && !isNaN(parseFloat(form.latitude)) && !isNaN(parseFloat(form.longitude)) && (
                <div className="mt-3 rounded-2xl overflow-hidden border-2 border-gray-100 h-48 relative">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }}
                    zoom={16}
                    options={MAP_OPTIONS}
                    onClick={(e) => {
                      const lat = e.latLng.lat();
                      const lng = e.latLng.lng();
                      setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                      if (window.google) {
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                          if (status === "OK" && results[0]) {
                            setForm(prev => ({ ...prev, deliveryAddress: results[0].formatted_address }));
                          }
                        });
                      }
                    }}
                  >
                    <Marker position={{ lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }} draggable
                      onDragEnd={(e) => {
                        const lat = e.latLng.lat();
                        const lng = e.latLng.lng();
                        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                      }} />
                  </GoogleMap>
                  <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded text-[10px] font-bold text-orange-600 shadow-sm">
                    📍 DRAG PIN OR CLICK MAP TO REFINE
                  </div>
                </div>
              )}
              <p className="text-gray-400 text-[10px] mt-2 italic">Select from the suggestions for accurate delivery pricing</p>
            </div>
          </div>
        </div>

        {/* WhatsApp notice */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <div className="font-bold text-green-800 text-sm">WhatsApp Confirmation</div>
            <div className="text-green-600 text-xs mt-0.5">You'll receive an order confirmation and updates on WhatsApp at the number above.</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Place Order */}
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-orange-200 text-lg"
        >
          {placing ? '⏳ Placing Order...' : `🛵 Place Order — ₹${total.toFixed(0)} COD`}
        </button>

        <p className="text-center text-gray-400 text-xs pb-4">
          By placing order you agree to pay ₹{total.toFixed(0)} cash on delivery
        </p>
      </div>
    </div>
  );
}
