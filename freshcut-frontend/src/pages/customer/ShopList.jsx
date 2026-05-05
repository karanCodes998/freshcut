import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getShops } from '../../api/customer';

const CATEGORIES = ['All', '🐔 Chicken', '🐑 Mutton', '🐟 Fish'];

export default function ShopList() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    getShops()
      .then(res => setShops(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = shops.filter(s => {
    const safeShopName = s.shopName || '';
    const safeArea = s.area || '';
    const matchesSearch = safeShopName.toLowerCase().includes(search.toLowerCase()) ||
                          safeArea.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (category === 'All') return true;
    
    // Since backend doesn't have categories yet, we use a simple heuristic based on shop name
    const name = safeShopName.toLowerCase();
    const isFishShop = name.includes('fish') || name.includes('sea');
    const isChicken = name.includes('chicken') || name.includes('poultry');
    const isMutton = name.includes('mutton') || name.includes('goat') || name.includes('lamb');
    
    // Default fallback: if no specific meat is in the name, assume they sell standard Chicken & Mutton
    const hasChicken = isChicken || (!isFishShop && !isMutton);
    const hasMutton = isMutton || (!isFishShop && !isChicken);
    
    if (category === '🐔 Chicken') return hasChicken;
    if (category === '🐑 Mutton') return hasMutton;
    if (category === '🐟 Fish') return isFishShop || name.includes('meat'); // Some general meat shops sell fish too
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-red-600 text-white py-12 px-4 relative">
        <div className="absolute top-4 right-4 z-10">
          <Link to="/customer/orders" className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-sm flex items-center gap-2">
            📜 My Orders
          </Link>
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-3">🔪 FreshCut</h1>
          <p className="text-orange-100 text-lg mb-8">Premium fresh meat, delivered to your door</p>
          <div className="relative max-w-xl mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shops or areas..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-base font-medium shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-200"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-3 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all flex-shrink-0 ${
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

      {/* Offers Banner */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🚀', title: '30 min delivery', sub: 'Ultra-fast delivery', bg: 'from-blue-50 to-indigo-50 border-blue-100' },
            { icon: '✅', title: 'Fresh & Hygienic', sub: 'Certified butcher shops', bg: 'from-green-50 to-emerald-50 border-green-100' },
            { icon: '💰', title: 'Best Prices', sub: 'No hidden charges', bg: 'from-orange-50 to-amber-50 border-orange-100' },
          ].map(item => (
            <div key={item.title} className={`flex items-center gap-4 bg-gradient-to-r ${item.bg} border rounded-2xl p-4`}>
              <span className="text-3xl">{item.icon}</span>
              <div>
                <div className="font-bold text-gray-800">{item.title}</div>
                <div className="text-sm text-gray-500">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Shop Grid */}
        <h2 className="text-2xl font-black text-gray-800 mb-5">
          {filtered.length} Shops Near You
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-44 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-gray-600">No shops found</h3>
            <p className="text-gray-400 mt-2">Try a different search or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(shop => (
              <Link
                key={shop.id}
                to={`/customer/shops/${shop.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover border border-gray-100 group"
              >
                {/* Shop Image */}
                <div className="relative h-44 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-7xl">🥩</div>
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    OPEN
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-black text-gray-900 text-lg leading-tight">{shop.shopName}</h3>
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                      <span className="text-green-600 font-bold text-sm">⭐ 4.5</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">
                    {[
                      ((shop.shopName || '').toLowerCase().includes('chicken') || (!(shop.shopName || '').toLowerCase().includes('fish') && !(shop.shopName || '').toLowerCase().includes('mutton'))) ? 'Chicken' : null,
                      ((shop.shopName || '').toLowerCase().includes('mutton') || (!(shop.shopName || '').toLowerCase().includes('fish') && !(shop.shopName || '').toLowerCase().includes('chicken'))) ? 'Mutton' : null,
                      ((shop.shopName || '').toLowerCase().includes('fish') || (shop.shopName || '').toLowerCase().includes('meat')) ? 'Fish' : null
                    ].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <span>📍</span>
                      <span>{shop.area || 'Local Area'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                      <span>🕐 25-30 min</span>
                      <span className="font-semibold text-gray-700">Dynamic delivery</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{shop.address?.substring(0, 35)}...</span>
                    <span className="text-orange-500 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
