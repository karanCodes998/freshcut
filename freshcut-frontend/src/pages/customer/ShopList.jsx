import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getShops, getAddresses, saveAddress, deleteAddress } from '../../api/customer';

const CATEGORIES = ['All', '🐔 Chicken', '🐑 Mutton', '🐟 Fish'];

const ADDR_ICONS = { Home: '🏠', Work: '💼', Other: '📍' };

const EMPTY_FORM = { name: 'Home', street: '', area: '', city: '', latitude: null, longitude: null };

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function getComponent(components, types) {
  for (const type of types) {
    const found = components.find(c => c.types.includes(type));
    if (found) return found.long_name;
  }
  return '';
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return { street: '', area: '', city: '' };
    const comps = data.results[0].address_components;
    const streetNum = getComponent(comps, ['street_number']);
    const streetName = getComponent(comps, ['route']);
    const street = [streetNum, streetName].filter(Boolean).join(' ');
    const area = getComponent(comps, ['sublocality_level_1', 'sublocality', 'neighborhood', 'administrative_area_level_3']);
    const city = getComponent(comps, ['locality', 'administrative_area_level_2']);
    return { street, area, city };
  } catch (err) {
    console.error('Geocoding error:', err);
    return { street: '', area: '', city: '' };
  }
}

export default function ShopList() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  /* ── fetch saved addresses on mount ── */
  useEffect(() => {
    fetchAddresses();
  }, []);

  /* ── re-fetch shops whenever selected address changes ── */
  useEffect(() => {
    if (selectedAddress) {
      localStorage.setItem('freshcut_selected_location', JSON.stringify(selectedAddress));
    }
    const lat = selectedAddress?.latitude ?? null;
    const lng = selectedAddress?.longitude ?? null;
    setLoading(true);
    getShops(lat, lng)
      .then(res => setShops(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAddress]);

  const fetchAddresses = async () => {
    try {
      const res = await getAddresses();
      setAddresses(res.data);
      
      const stored = localStorage.getItem('freshcut_selected_location');
      if (stored) {
        setSelectedAddress(JSON.parse(stored));
      } else {
        const def = res.data.find(a => a.isDefault);
        if (def) {
          setSelectedAddress(def);
        } else {
          // If no stored location and no default saved address, auto-detect silently
          handleUseCurrentLocation(true);
        }
      }
    } catch (err) {
      console.error(err);
      const stored = localStorage.getItem('freshcut_selected_location');
      if (stored) {
        setSelectedAddress(JSON.parse(stored));
      } else {
        handleUseCurrentLocation(true);
      }
    }
  };

  /* ── use browser geolocation + reverse geocode for quick selection ── */
  const handleUseCurrentLocation = useCallback((isSilent = false) => {
    if (!navigator.geolocation) {
      if (!isSilent) alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeocoding(true);
        const geo = await reverseGeocode(latitude, longitude);
        setGeocoding(false);
        setLocating(false);
        
        setSelectedAddress({
          id: 'temp_current',
          name: 'Current Location',
          area: geo.area || geo.city || 'Unknown Area',
          addressLine: geo.street || 'Detected Location',
          latitude,
          longitude,
        });
        setShowModal(false);
      },
      (err) => {
        setLocating(false);
        if (!isSilent) {
          if (err.code === 1) alert('Location permission denied. Please allow location access.');
          else alert('Could not detect location. Try entering manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* ── use browser geolocation + reverse geocode for add address form ── */
  const detectAndGeocode = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocating(false);
        setGeocoding(true);
        const geo = await reverseGeocode(latitude, longitude);
        setGeocoding(false);
        setForm(prev => ({
          ...prev,
          latitude,
          longitude,
          street: prev.street || geo.street,
          area: prev.area || geo.area,
          city: prev.city || geo.city,
        }));
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setLocationError('Location permission denied. Please allow location access.');
        else setLocationError('Could not detect location. Try entering manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* ── save new address ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      const payload = {
        name: form.name,
        addressLine: [form.street, form.area, form.city].filter(Boolean).join(', '),
        area: form.area || form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        isDefault: addresses.length === 0,
      };
      const res = await saveAddress(payload);
      const updated = [...addresses, res.data];
      setAddresses(updated);
      setSelectedAddress(res.data);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      setShowModal(false);
    } catch {
      alert('Failed to save address. Please try again.');
    } finally {
      setSavingAddr(false);
    }
  };

  /* ── delete an address ── */
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteAddress(id);
      const updated = addresses.filter(a => a.id !== id);
      setAddresses(updated);
      if (selectedAddress?.id === id) {
        setSelectedAddress(updated[0] || null);
      }
    } catch {
      alert('Failed to delete address.');
    }
  };

  /* ── filter shops by search & category ── */
  const filtered = shops.filter(s => {
    const name = (s.shopName || '').toLowerCase();
    const area = (s.area || '').toLowerCase();
    const q = search.toLowerCase();
    if (!name.includes(q) && !area.includes(q)) return false;
    if (category === 'All') return true;
    const isFish = name.includes('fish') || name.includes('sea');
    const isChicken = name.includes('chicken') || name.includes('poultry');
    const isMutton = name.includes('mutton') || name.includes('goat') || name.includes('lamb');
    if (category === '🐔 Chicken') return isChicken || (!isFish && !isMutton);
    if (category === '🐑 Mutton') return isMutton || (!isFish && !isChicken);
    if (category === '🐟 Fish') return isFish;
    return true;
  });

  const hasLocation = selectedAddress?.latitude && selectedAddress?.longitude;

  return (
    <div className="min-h-screen bg-gray-50">



      {/* ── HERO ── */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-red-600 text-white pb-10 pt-4 px-4">
        {/* Top Header inside Hero */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
          <div
            className="flex items-center gap-2 cursor-pointer bg-black/20 hover:bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors max-w-[200px]"
            onClick={() => setShowModal(true)}
          >
            <span className="text-sm">📍</span>
            <span className="font-bold text-sm truncate">
              {selectedAddress ? `${selectedAddress.area || selectedAddress.name}` : 'Set Location'}
            </span>
            <span className="text-xs opacity-70">▼</span>
          </div>
          <Link to="/customer/orders" className="text-2xl hover:scale-110 transition-transform bg-black/20 hover:bg-black/30 w-10 h-10 flex items-center justify-center rounded-full">
            📜
          </Link>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-2">🔪 FreshCut</h1>
          <p className="text-orange-100 text-base mb-6">Premium fresh meat, delivered to your door</p>
          <div className="relative max-w-xl mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shops or areas..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-gray-900 text-sm font-medium shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-200"
            />
          </div>
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="bg-white shadow-sm sticky top-[56px] z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0 ${
                category === cat
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {hasLocation && (
          <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 text-blue-700 text-sm">
            <span className="text-lg">📍</span>
            <span>Showing shops within <b>20 km</b> of <b>{selectedAddress.area || selectedAddress.name}</b></span>
          </div>
        )}

        <h2 className="text-xl font-black text-gray-800 mb-4">
          {hasLocation ? `${filtered.length} Shops Near You` : `All Shops`}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-gray-600">No shops found nearby</h3>
            <p className="text-gray-400 mt-2">
              {hasLocation ? 'No shops within 20km of your location. Try changing your address.' : 'Set your location to see nearby shops.'}
            </p>
            <button
              onClick={() => { setShowModal(true); setShowAddForm(true); }}
              className="mt-5 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all"
            >
              📍 Set My Location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(shop => (
              <Link
                key={shop.id}
                to={`/customer/shops/${shop.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 group"
              >
                <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">🥩</div>
                  {shop.distanceKm != null && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-black px-2 py-0.5 rounded-lg backdrop-blur-sm">
                      {shop.distanceKm < 1
                        ? `${Math.round(shop.distanceKm * 1000)} m away`
                        : `${shop.distanceKm.toFixed(1)} km away`}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    OPEN
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-black text-gray-900 text-base leading-tight">{shop.shopName}</h3>
                    <div className="flex items-center gap-0.5 bg-green-50 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                      <span className="text-green-600 font-bold text-xs">⭐ 4.5</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mb-3">{shop.area || 'Local Area'} · Fresh Meat</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-2">
                    <span>🕐 25–35 min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          ADDRESS MODAL
      ══════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setShowAddForm(false); setLocationError(''); }}
          />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl overflow-y-auto max-h-[90vh]">

            {/* Header */}
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
              <h3 className="text-xl font-black text-gray-900">
                {showAddForm ? 'Add New Address' : 'Choose Location'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setShowAddForm(false); setLocationError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">

              {!showAddForm ? (
                <>
                  {/* Quick: Use Current Location */}
                  <button
                    onClick={handleUseCurrentLocation}
                    disabled={locating || geocoding}
                    className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-2xl transition-all font-bold text-blue-700 disabled:opacity-50"
                  >
                    <span className="text-2xl">🎯</span>
                    <div className="text-left flex-1">
                      <div className="font-black">Use My Current Location</div>
                      <div className="text-xs font-normal text-blue-500">
                        {(locating || geocoding) ? 'Detecting...' : "We'll auto-detect your area"}
                      </div>
                    </div>
                    {(locating || geocoding) && <span className="animate-spin text-xl">🔄</span>}
                  </button>

                  {/* Saved Addresses */}
                  {addresses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Saved Addresses</p>
                      {addresses.map(addr => (
                        <div
                          key={addr.id}
                          onClick={() => { setSelectedAddress(addr); setShowModal(false); setShowAddForm(false); }}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            selectedAddress?.id === addr.id
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl">{ADDR_ICONS[addr.name] || '📍'}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-800 text-sm">{addr.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">{addr.addressLine}</div>
                              {addr.latitude && (
                                <div className="text-[10px] text-green-600 font-semibold mt-0.5">📍 GPS location saved</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {selectedAddress?.id === addr.id && (
                              <span className="text-orange-500 font-black text-lg">✓</span>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, addr.id)}
                              className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add manually */}
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl transition-all"
                  >
                    <span className="text-xl">➕</span>
                    <span className="font-bold text-gray-600 text-sm">Add address manually</span>
                  </button>
                </>
              ) : (
                /* ── ADD ADDRESS FORM ── */
                <form onSubmit={handleSave} className="space-y-4">

                  {/* Type selector */}
                  <div className="flex gap-2">
                    {['Home', 'Work', 'Other'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, name: t }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          form.name === t ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ADDR_ICONS[t]} {t}
                      </button>
                    ))}
                  </div>

                  {/* Current Location button */}
                  <button
                    type="button"
                    onClick={detectAndGeocode}
                    disabled={locating || geocoding}
                    className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                      form.latitude
                        ? 'bg-green-100 text-green-700 border-2 border-green-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-60`}
                  >
                    {locating && <span className="animate-spin">⌛</span>}
                    {geocoding && <span className="animate-spin">🔄</span>}
                    {locating ? 'Getting your GPS...'
                      : geocoding ? 'Fetching address from GPS...'
                      : form.latitude ? '✅ GPS Location Captured — tap to refresh'
                      : '🎯 Auto-detect my location'}
                  </button>

                  {locationError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium">
                      ⚠️ {locationError}
                    </div>
                  )}

                  {/* Street / Flat */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">🏠 Street / Flat / Building</label>
                    <input
                      required
                      placeholder="e.g. 12B, Nehru Street, Flat 3"
                      className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                      value={form.street}
                      onChange={e => setForm(prev => ({ ...prev, street: e.target.value }))}
                    />
                  </div>

                  {/* Area / Locality */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">📌 Area / Locality</label>
                    <input
                      required
                      placeholder="e.g. Salt Lake, Sector V"
                      className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                      value={form.area}
                      onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">🏙️ City</label>
                    <input
                      required
                      placeholder="e.g. Kolkata"
                      className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                      value={form.city}
                      onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setLocationError(''); }}
                      className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={savingAddr}
                      className="flex-1 py-3.5 bg-orange-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all disabled:opacity-60"
                    >
                      {savingAddr ? '⌛ Saving...' : 'Save & Deliver Here →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
