import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrderHistory } from '../../api/customer';

const STATUS_COLOR = {
  PLACED:    'bg-yellow-100 text-yellow-700',
  ACCEPTED:  'bg-blue-100 text-blue-700',
  PREPARING: 'bg-indigo-100 text-indigo-700',
  READY:     'bg-purple-100 text-purple-700',
  PICKED_UP: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_ICON = {
  PLACED: '📋', ACCEPTED: '✅', PREPARING: '🔪',
  READY: '📦', PICKED_UP: '🛵', DELIVERED: '🎉', CANCELLED: '❌',
};

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getOrderHistory()
      .then(res => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-5xl animate-bounce">🥩</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/customer')} className="text-white/80 hover:text-white text-xl">←</button>
          <div>
            <h1 className="text-xl font-black">My Orders</h1>
            <p className="text-orange-100 text-sm">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5">
        {orders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="font-black text-gray-700 text-xl">No orders yet</h3>
            <p className="text-gray-400 mt-2 mb-6">Place your first FreshCut order!</p>
            <button
              onClick={() => navigate('/customer')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-3 rounded-2xl transition-all"
            >
              Browse Shops 🏪
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all active:scale-99"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-gray-900">Order #{order.id}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                        {STATUS_ICON[order.status]} {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">🏪 {order.shopName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-gray-900 text-xl">₹{order.totalAmount}</div>
                    <div className="text-xs text-green-600 font-bold mt-0.5">COD</div>
                  </div>
                </div>

                {/* Items preview */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>• {item.quantityGrams}g {item.name}</span>
                      <span className="font-medium">₹{parseFloat(item.price).toFixed(0)}</span>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div className="text-gray-400 text-xs mt-1">+{order.items.length - 3} more items</div>
                  )}
                </div>

                <div className="mt-3 text-xs text-orange-500 font-bold text-right">
                  {order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
                    ? 'Tap to track →'
                    : 'View details →'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
