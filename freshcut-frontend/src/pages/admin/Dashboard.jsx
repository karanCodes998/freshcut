import { useState, useEffect, useCallback } from 'react';
import { getLiveOrders, getAllOrders, getAllShops, toggleShop, getAllUsers, deleteUser, updateUserRole, deleteOrder, deleteShop } from '../../api/admin';

const STATUS_COLOR = {
  PLACED:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  ACCEPTED:  'bg-blue-100 text-blue-700 border-blue-200',
  PREPARING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  READY:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  PICKED_UP: 'bg-purple-100 text-purple-700 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const ROLE_COLORS = {
  CUSTOMER: 'bg-orange-100 text-orange-700',
  BUTCHER:  'bg-green-100 text-green-700',
  RIDER:    'bg-blue-100 text-blue-700',
  ADMIN:    'bg-purple-100 text-purple-700',
};

const ROLE_ICONS = { CUSTOMER: '🛒', BUTCHER: '🏪', RIDER: '🛵', ADMIN: '⚙️' };

function Toast({ message, type }) {
  return (
    <div className={`fixed top-4 right-4 z-[999] px-5 py-3 rounded-xl shadow-xl text-sm font-bold animate-bounce-in flex items-center gap-2 ${
      type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`}>
      {type === 'error' ? '⚠️' : '✅'} {message}
    </div>
  );
}

export default function AdminDashboard() {
  const [liveOrders, setLiveOrders] = useState([]);
  const [allOrders, setAllOrders]   = useState([]);
  const [shops, setShops]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [tab, setTab]               = useState('overview');
  const [loading, setLoading]       = useState(true);
  const [userFilter, setUserFilter] = useState('ALL');
  const [toast, setToast]           = useState(null);
  const [processing, setProcessing] = useState({}); // tracks loading per item
  const [expandedOrder, setExpandedOrder] = useState(null); // for history tab

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [liveRes, allRes, shopsRes, usersRes] = await Promise.all([
        getLiveOrders(), getAllOrders(), getAllShops(), getAllUsers()
      ]);
      setLiveOrders(liveRes.data);
      setAllOrders(allRes.data);
      setShops(shopsRes.data);
      setUsers(usersRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Optimistic delete: remove from UI instantly, rollback if fails ───────
  const handleDeleteUser = async (id, name) => {
    setProcessing(p => ({ ...p, [id]: 'deleting' }));
    const prev = users;
    setUsers(u => u.filter(x => x.id !== id)); // instant UI update
    try {
      await deleteUser(id);
      showToast(`"${name}" deleted`);
    } catch (err) {
      setUsers(prev); // rollback
      const msg = err.response?.data?.message || err.response?.data || 'Cannot delete — user has active orders';
      showToast(msg, 'error');
    } finally {
      setProcessing(p => ({ ...p, [id]: null }));
    }
  };

  // ─── Optimistic role change ───────────────────────────────────────────────
  const handleRoleChange = async (id, newRole) => {
    setProcessing(p => ({ ...p, [id]: 'role' }));
    setUsers(u => u.map(x => x.id === id ? { ...x, role: newRole } : x)); // instant
    try {
      await updateUserRole(id, newRole);
      showToast(`Role updated to ${newRole}`);
    } catch (err) {
      showToast('Failed to update role', 'error');
      fetchAll(); // re-sync from server
    } finally {
      setProcessing(p => ({ ...p, [id]: null }));
    }
  };

  // ─── Optimistic shop toggle ───────────────────────────────────────────────
  const handleToggleShop = async (shopId, currentState) => {
    setProcessing(p => ({ ...p, ['shop_' + shopId]: true }));
    setShops(s => s.map(x => x.id === shopId ? { ...x, isActive: !currentState } : x)); // instant
    try {
      await toggleShop(shopId);
      showToast(`Shop ${!currentState ? 'activated' : 'deactivated'}`);
    } catch (err) {
      setShops(s => s.map(x => x.id === shopId ? { ...x, isActive: currentState } : x)); // rollback
      showToast('Failed to update shop', 'error');
    } finally {
      setProcessing(p => ({ ...p, ['shop_' + shopId]: false }));
    }
  };

  // ─── Optimistic order delete ──────────────────────────────────────────────
  const handleDeleteOrder = async (id) => {
    setProcessing(p => ({ ...p, ['order_' + id]: 'deleting' }));
    
    const prevLive = liveOrders;
    const prevAll = allOrders;
    setLiveOrders(o => o.filter(x => x.id !== id));
    setAllOrders(o => o.filter(x => x.id !== id));
    
    try {
      await deleteOrder(id);
      showToast(`Order #${id} deleted`);
    } catch (err) {
      setLiveOrders(prevLive);
      setAllOrders(prevAll);
      console.error("Order delete error: ", err);
      showToast(err.response?.data?.message || err.response?.data?.error || 'Failed to delete order', 'error');
    } finally {
      setProcessing(p => ({ ...p, ['order_' + id]: null }));
    }
  };

  // ─── Optimistic shop delete ───────────────────────────────────────────────
  const handleDeleteShop = async (id, name) => {
    setProcessing(p => ({ ...p, ['shop_' + id]: 'deleting' }));
    
    const prevShops = shops;
    setShops(s => s.filter(x => x.id !== id));
    
    try {
      await deleteShop(id);
      showToast(`Shop "${name}" deleted`);
      fetchAll(); // refresh orders to remove cascading deletes
    } catch (err) {
      setShops(prevShops);
      console.error("Shop delete error: ", err);
      showToast(err.response?.data?.message || err.response?.data?.error || 'Failed to delete shop', 'error');
    } finally {
      setProcessing(p => ({ ...p, ['shop_' + id]: null }));
    }
  };

  const stats = {
    liveOrders:  liveOrders.length,
    totalOrders: allOrders.length,
    revenue:     allOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.totalAmount || 0), 0).toFixed(0),
    activeShops: shops.filter(s => s.isActive).length,
    totalUsers:  users.length,
    customers:   users.filter(u => u.role === 'CUSTOMER').length,
    butchers:    users.filter(u => u.role === 'BUTCHER').length,
    riders:      users.filter(u => u.role === 'RIDER').length,
  };

  const filteredUsers = userFilter === 'ALL' ? users : users.filter(u => u.role === userFilter);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-50">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-spin">⚙️</div>
        <p className="text-gray-500 font-semibold text-lg">Loading Admin Panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-700 via-violet-700 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">⚙️ FreshCut Admin</h1>
              <p className="text-purple-300 text-sm mt-0.5">Platform Management Console</p>
            </div>
            <button onClick={fetchAll} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
              🔄 Sync
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🔔', label: 'Live Orders',     value: stats.liveOrders,      color: stats.liveOrders > 0 ? 'bg-yellow-400/20 border-yellow-400/30' : 'bg-white/10' },
              { icon: '💰', label: 'Revenue (COD)',   value: `₹${stats.revenue}`,   color: 'bg-white/10' },
              { icon: '🏪', label: 'Active Shops',    value: stats.activeShops,     color: 'bg-white/10' },
              { icon: '👥', label: 'Total Users',     value: stats.totalUsers,      color: 'bg-white/10' },
            ].map(s => (
              <div key={s.label} className={`${s.color} border border-white/10 rounded-2xl p-4 backdrop-blur-sm`}>
                <div className="text-3xl font-black">{s.value}</div>
                <div className="text-purple-200 text-xs mt-1 flex items-center gap-1">
                  {s.icon} {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* User type breakdown */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['🛒', 'Customers', stats.customers], ['🏪', 'Butchers', stats.butchers], ['🛵', 'Riders', stats.riders]].map(([icon, label, val]) => (
              <div key={label} className="bg-white/8 rounded-xl p-2.5 text-center border border-white/10">
                <div className="font-black text-lg">{icon} {val}</div>
                <div className="text-purple-300 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto">
          {[
            { key: 'overview', label: `🔔 Live Orders${stats.liveOrders > 0 ? ` (${stats.liveOrders})` : ''}` },
            { key: 'history',  label: `📜 All Orders (${stats.totalOrders})` },
            { key: 'users',    label: `👥 Users (${stats.totalUsers})` },
            { key: 'shops',    label: `🏪 Shops (${shops.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                tab === t.key ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ─── LIVE ORDERS ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          liveOrders.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="font-black text-gray-700 text-xl">All Clear!</h3>
              <p className="text-gray-400 mt-1">No live orders right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-lg">#{order.id}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[order.status]}`}>{order.status}</span>
                        <span className="text-xs bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-full border border-green-100">COD</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center">👤</span>
                          <span className="font-bold">{order.contactName || order.customerName}</span>
                          <span className="text-gray-400">·</span>
                          <a href={`tel:${order.contactPhone || order.customerPhone}`} className="text-blue-600 font-bold">{order.contactPhone || order.customerPhone}</a>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center">🏪</span>
                          <span className="font-bold">{order.shopName}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">{order.butcherName}</span>
                          <span className="text-gray-400">·</span>
                          <a href={`tel:${order.shopPhone}`} className="text-blue-600 font-bold">{order.shopPhone}</a>
                        </div>
                        {order.riderName && (
                          <div className="bg-blue-50 text-blue-700 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2 mt-1">
                            <span className="text-base mt-0.5">🛵</span>
                            <div className="text-[11px] leading-tight">
                              <div className="font-black">RIDER ASSIGNED</div>
                              <div className="mt-0.5 font-bold">{order.riderName} · <a href={`tel:${order.riderPhone}`} className="underline">{order.riderPhone}</a></div>
                              <div className="mt-0.5 opacity-80">UPI: <span className="bg-blue-100 px-1 rounded">{order.riderUpiId || 'Not set'}</span></div>
                            </div>
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400 flex items-start gap-2 pt-1">
                          <span className="w-5 text-center">📍</span>
                          <span className="italic">{order.deliveryAddress}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-gray-900 text-2xl">₹{order.totalAmount}</div>
                      <div className="text-gray-400 text-xs mb-2">{new Date(order.createdAt).toLocaleTimeString()}</div>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={processing['order_' + order.id] === 'deleting'}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md transition-colors border border-red-100"
                      >
                        {processing['order_' + order.id] === 'deleting' ? '⏳' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-gray-600">
                        <span>• {item.quantityGrams}g {item.name}</span>
                        <span className="font-semibold">₹{parseFloat(item.price).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ─── ALL ORDERS ──────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <span className="font-black text-gray-800">Order History ({allOrders.length})</span>
              <span className="text-sm text-gray-500 font-medium">Delivered Revenue: ₹{stats.revenue}</span>
            </div>
            <div className="divide-y max-h-[620px] overflow-y-auto">
              {allOrders.length === 0
                ? <p className="text-center py-12 text-gray-400">No orders yet</p>
                : allOrders.map(order => (
                  <div key={order.id} className="border-b last:border-b-0">
                    <div 
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-600 text-sm w-10">#{order.id}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status]}`}>{order.status}</span>
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{order.contactName || order.customerName}</div>
                          <div className="text-[11px] text-gray-400">{order.shopName} · {new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-black text-gray-800">₹{order.totalAmount}</div>
                        <div className={`text-xs transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`}>▼</div>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="px-5 py-4 bg-gray-50 border-t border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
                        {/* Customer */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="text-[10px] font-black text-gray-400 uppercase mb-2">👤 Customer Info</div>
                          <div className="font-bold text-sm text-gray-800">{order.contactName || order.customerName}</div>
                          <div className="text-blue-600 font-bold text-xs mt-1">📞 {order.contactPhone || order.customerPhone}</div>
                          <div className="text-[10px] text-gray-500 mt-2 line-clamp-2 italic">📍 {order.deliveryAddress}</div>
                        </div>

                        {/* Butcher */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="text-[10px] font-black text-gray-400 uppercase mb-2">🏪 Butcher Info</div>
                          <div className="font-bold text-sm text-gray-800">{order.shopName}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{order.butcherName}</div>
                          <div className="text-blue-600 font-bold text-xs mt-1">📞 {order.shopPhone}</div>
                        </div>

                        {/* Rider */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="text-[10px] font-black text-gray-400 uppercase mb-2">🛵 Rider Info</div>
                          {order.riderName ? (
                            <>
                              <div className="font-bold text-sm text-gray-800">{order.riderName}</div>
                              <div className="text-blue-600 font-bold text-xs mt-1">📞 {order.riderPhone}</div>
                              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded mt-2 font-mono text-[10px] border border-blue-100 flex justify-between items-center">
                                <span>UPI: {order.riderUpiId || 'Not Set'}</span>
                                <button onClick={(e) => {e.stopPropagation(); navigator.clipboard.writeText(order.riderUpiId)}} className="hover:text-blue-900 text-[9px]">📋</button>
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400 italic mt-2">No rider assigned yet</div>
                          )}
                        </div>

                        {/* Action Bar */}
                        <div className="md:col-span-3 flex justify-end">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                            disabled={processing['order_' + order.id] === 'deleting'}
                            className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded-lg border border-red-100"
                          >
                            {processing['order_' + order.id] === 'deleting' ? '⏳ Deleting...' : '🗑️ Permanently Delete Order'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ─── USERS ───────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            {/* Role filter */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {['ALL', 'CUSTOMER', 'BUTCHER', 'RIDER', 'ADMIN'].map(role => (
                <button key={role} onClick={() => setUserFilter(role)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    userFilter === role
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}>
                  {role === 'ALL'
                    ? `All (${users.length})`
                    : `${ROLE_ICONS[role]} ${role} (${users.filter(u => u.role === role).length})`}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <span className="font-black text-gray-800">{filteredUsers.length} accounts</span>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredUsers.length === 0
                  ? <p className="text-center py-12 text-gray-400">No accounts in this category</p>
                  : filteredUsers.map(user => (
                    <div key={user.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-base flex-shrink-0 ${ROLE_COLORS[user.role]}`}>
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">📱 {user.phone}</div>
                          {user.email && <div className="text-xs text-gray-400">{user.email}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role dropdown */}
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          disabled={processing[user.id] === 'role'}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300 transition-opacity ${
                            processing[user.id] ? 'opacity-50' : ''
                          } ${ROLE_COLORS[user.role]}`}
                        >
                          {['CUSTOMER', 'BUTCHER', 'RIDER', 'ADMIN'].map(r => (
                            <option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>
                          ))}
                        </select>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={!!processing[user.id]}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            processing[user.id] === 'deleting'
                              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                              : 'border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 active:scale-95'
                          }`}
                        >
                          {processing[user.id] === 'deleting' ? '⏳' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── SHOPS ───────────────────────────────────────────────────────── */}
        {tab === 'shops' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.length === 0
              ? <div className="col-span-3 text-center py-16 bg-white rounded-2xl text-gray-400">No shops registered yet</div>
              : shops.map(shop => (
                <div key={shop.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-lg truncate">{shop.shopName}</h3>
                      <div className="text-gray-500 text-sm mt-0.5">📍 {shop.area}</div>
                      <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{shop.address}</div>
                    </div>
                    <span className={`flex-shrink-0 ml-2 text-xs font-bold px-2.5 py-1 rounded-full ${
                      shop.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {shop.isActive ? '🟢 Live' : '🔴 Off'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <div className="font-black text-orange-700 text-lg">₹{shop.deliveryFee || 40}</div>
                      <div className="text-orange-500 text-xs">Delivery Fee</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="font-black text-blue-700 text-lg">{shop.deliveryRadiusKm || 10} km</div>
                      <div className="text-blue-500 text-xs">Radius</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-2.5 mb-4 text-[10px] font-mono text-gray-500 flex justify-between">
                    <span>LAT: {shop.latitude?.toFixed(4) || 'N/A'}</span>
                    <span>LNG: {shop.longitude?.toFixed(4) || 'N/A'}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleShop(shop.id, shop.isActive)}
                      disabled={processing['shop_' + shop.id]}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2 active:scale-95 disabled:opacity-60 ${
                        shop.isActive
                          ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {processing['shop_' + shop.id] && processing['shop_' + shop.id] !== 'deleting'
                        ? '⏳...'
                        : shop.isActive ? '🔴 Deactivate' : '🟢 Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteShop(shop.id, shop.shopName)}
                      disabled={processing['shop_' + shop.id]}
                      className="px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 border-red-200 text-red-600 hover:bg-red-50 active:scale-95 disabled:opacity-60"
                      title="Permanently Delete Shop"
                    >
                      {processing['shop_' + shop.id] === 'deleting' ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
