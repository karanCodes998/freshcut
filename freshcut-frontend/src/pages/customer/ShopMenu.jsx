import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShopMenu, getShops } from '../../api/customer';

export default function ShopMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getShopMenu(id),
      getShops()
    ]).then(([menuRes, shopsRes]) => {
      setItems(menuRes.data);
      setShop(shopsRes.data.find(s => s.id === parseInt(id)));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateCart = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartCount = Object.keys(cart).length;
  const total = Object.keys(cart).reduce((sum, itemId) => {
    const item = items.find(i => i.id === parseInt(itemId));
    return item ? sum + (item.pricePerKg * cart[itemId]) / 1000 : sum;
  }, 0);

  const handleCheckout = () => {
    navigate('/customer/checkout', {
      state: {
        shopId: parseInt(id),
        shopName: shop?.shopName,
        deliveryFee: shop?.deliveryFee || 40,
        shopLat: shop?.latitude,
        shopLng: shop?.longitude,
        cart,
        items,
      }
    });
  };

  const grouped = items.reduce((acc, item) => {
    const cat = 'Meat Items';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl animate-bounce mb-4">🥩</div>
        <p className="text-gray-500 font-medium">Loading menu...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Shop Header */}
      <div className="bg-white shadow-sm">
        <div className="h-48 bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 relative">
          <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-40">🥩</div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-2xl font-black">{shop?.shopName || 'Butcher Shop'}</h1>
            <div className="flex items-center gap-3 text-sm opacity-90 mt-1">
              <span>⭐ 4.5 (200+)</span>
              <span>•</span>
              <span>🕐 25-30 min</span>
              <span>•</span>
              <span>📍 {shop?.area}</span>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div className="flex border-t divide-x text-center text-sm py-3">
          <div className="flex-1 px-4">
            <div className="font-bold text-gray-800">Dynamic</div>
            <div className="text-gray-400 text-xs">Delivery Fee</div>
          </div>
          <div className="flex-1 px-4">
            <div className="font-bold text-gray-800">25 min</div>
            <div className="text-gray-400 text-xs">Delivery Time</div>
          </div>
          <div className="flex-1 px-4">
            <div className="font-bold text-green-600">OPEN</div>
            <div className="text-gray-400 text-xs">Status</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {Object.keys(grouped).map(category => (
          <div key={category}>
            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-orange-500 rounded-full inline-block"></span>
              {category}
            </h2>

            {grouped[category].map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex gap-4">
                {/* Image */}
                <div className="w-28 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-100 to-red-50 flex items-center justify-center relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🥩</span>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400">OUT OF STOCK</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{item.name}</h3>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                      <p className="text-orange-600 font-bold mt-2">₹{item.pricePerKg}<span className="text-gray-400 font-normal text-xs">/kg</span></p>
                    </div>
                  </div>

                  {/* Add button */}
                  <div className="mt-3 flex justify-end">
                    {!item.isAvailable ? (
                      <span className="text-xs text-gray-400 font-medium">Not Available</span>
                    ) : cart[item.id] ? (
                      <div className="flex items-center bg-orange-50 border border-orange-200 rounded-xl overflow-hidden">
                        <button onClick={() => updateCart(item.id, -250)} className="w-9 h-9 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-100 transition-colors text-lg">−</button>
                        <div className="px-3 text-center min-w-[64px]">
                          <div className="font-bold text-orange-700 text-sm">{cart[item.id]}g</div>
                          <div className="text-orange-400 text-xs">₹{((item.pricePerKg * cart[item.id]) / 1000).toFixed(0)}</div>
                        </div>
                        <button onClick={() => updateCart(item.id, 250)} className="w-9 h-9 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-100 transition-colors text-lg">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateCart(item.id, 500)}
                        className="border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white font-bold px-6 py-2 rounded-xl transition-all text-sm"
                      >
                        + ADD
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => { setCartOpen(!cartOpen); }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-2xl shadow-orange-300 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/20 rounded-lg px-2 py-1 text-sm">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
                <span>View Cart</span>
              </div>
              <div className="text-right">
                <div>₹{total.toFixed(0)}</div>
                <div className="text-xs opacity-75">plus delivery</div>
              </div>
            </button>

            {cartOpen && (
              <div className="bg-white rounded-2xl shadow-2xl mt-3 p-5 animate-slide-up border border-orange-100">
                <h3 className="font-black text-gray-800 text-lg mb-4">Your Cart</h3>
                <div className="space-y-3 mb-4">
                  {Object.keys(cart).map(itemId => {
                    const item = items.find(i => i.id === parseInt(itemId));
                    if (!item) return null;
                    return (
                      <div key={itemId} className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{item.name}</div>
                          <div className="text-gray-400 text-xs">{cart[itemId]}g</div>
                        </div>
                        <div className="font-bold text-gray-800">₹{((item.pricePerKg * cart[itemId]) / 1000).toFixed(0)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{total.toFixed(0)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Delivery</span><span>Calculated at checkout</span></div>
                  <div className="flex justify-between font-black text-lg pt-2 border-t"><span>Total</span><span className="text-orange-600">₹{total.toFixed(0)} + Delivery</span></div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-orange-200"
                >
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
