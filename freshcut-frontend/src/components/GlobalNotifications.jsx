import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';

// Global notification trigger (outside react context if needed)
let externalTrigger = null;

export const showSwiggyNotification = (title, body, icon = '🔔', type = 'default') => {
  if (externalTrigger) {
    externalTrigger(title, body, icon, type);
  }
};

export default function GlobalNotifications() {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((title, body, icon = '🔔', type = 'default') => {
    const id = Date.now();
    const newNotif = { id, title, body, icon, type };
    setNotifications(prev => [...prev, newNotif]);

    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Sound
    try {
      const audio = new Audio('/alert.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (_) {}

    // Auto-remove after 6 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    externalTrigger = addNotification;
    return () => { externalTrigger = null; };
  }, [addNotification]);

  useEffect(() => {
    if (!connected || !user) return;

    let subs = [];

    // 1. Butcher Notifications
    if (user.role === 'BUTCHER' && user.shopId) {
      const sub = subscribe(`/topic/butcher/${user.shopId}`, (order) => {
        addNotification(
          "🥩 New Order Received!",
          `Order #${order.id} for ₹${order.totalAmount} is waiting.`,
          '🔪',
          'butcher'
        );
      });
      if (sub) subs.push(sub);
    }

    // 2. Rider Notifications
    if (user.role === 'RIDER') {
      const sub = subscribe(`/topic/riders`, (order) => {
        addNotification(
          "🛵 New Order Near You!",
          `Pickup at ${order.shopName}. Tap to accept!`,
          '🛵',
          'rider'
        );
      });
      if (sub) subs.push(sub);
    }

    // 3. Customer Notifications
    if (user.role === 'CUSTOMER') {
      const sub = subscribe(`/topic/customer/${user.id}`, (update) => {
        const statusMap = {
          ACCEPTED:  { title: "Accepted ✅", msg: "Butcher is preparing your order!", icon: '🥩' },
          PREPARING: { title: "Preparing 🔪", msg: "Your meat is being cut right now.", icon: '🔪' },
          READY:     { title: "Ready! 📦", msg: "Packed and waiting for the rider.", icon: '📦' },
          PICKED_UP: { title: "On the way! 🛵", msg: "Rider has picked up your order.", icon: '🛵' },
          DELIVERED: { title: "Delivered! 🎉", msg: "Enjoy your fresh cut from FreshCut!", icon: '🍖' },
          CANCELLED: { title: "Cancelled ❌", msg: "Your order was unfortunately cancelled.", icon: '🚫' },
        };
        const info = statusMap[update.status] || { title: "Order Update", msg: `Order status: ${update.status}`, icon: '📋' };
        addNotification(info.title, info.msg, info.icon, 'customer');
      });
      if (sub) subs.push(sub);
    }

    return () => subs.forEach(s => s.unsubscribe());
  }, [connected, user?.id, user?.role, user?.shopId, addNotification, subscribe]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] p-4 pointer-events-none flex flex-col items-center gap-3">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 p-4 pointer-events-auto animate-notification-slide flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer"
          onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
        >
          {/* Swiggy Style Gradient Edge */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
            n.type === 'butcher' ? 'bg-green-500' : 
            n.type === 'rider' ? 'bg-blue-500' : 
            n.type === 'customer' ? 'bg-orange-500' : 'bg-purple-500'
          }`}></div>

          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner ${
            n.type === 'butcher' ? 'bg-green-50' : 
            n.type === 'rider' ? 'bg-blue-50' : 
            n.type === 'customer' ? 'bg-orange-50' : 'bg-purple-50'
          }`}>
            {n.icon}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h4 className="font-black text-gray-900 text-base leading-tight mb-0.5">{n.title}</h4>
            <p className="text-gray-500 text-xs font-bold leading-tight line-clamp-2">{n.body}</p>
          </div>

          <button className="text-gray-300 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
