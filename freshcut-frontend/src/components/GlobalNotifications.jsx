import { useEffect } from 'react';
import { useWebSocket, triggerNotification } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';

export default function GlobalNotifications() {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!connected || !user) return;

    let subs = [];

    // 1. Butcher Notifications (New Orders)
    if (user.role === 'BUTCHER' && user.shopId) {
      const sub = subscribe(`/topic/butcher/${user.shopId}`, (order) => {
        triggerNotification(
          "🥩 New Order Received!",
          `Order #${order.id} for ₹${order.totalAmount} is waiting for your confirmation.`
        );
      });
      if (sub) subs.push(sub);
    }

    // 2. Rider Notifications (New Pool Orders)
    if (user.role === 'RIDER') {
      const sub = subscribe(`/topic/riders`, (order) => {
        triggerNotification(
          "🛵 New Delivery Opportunity!",
          `A new order is ready for pickup at ${order.shopName}. Tap to accept!`
        );
      });
      if (sub) subs.push(sub);
    }

    // 3. Customer Notifications (Order Updates)
    if (user.role === 'CUSTOMER') {
      const sub = subscribe(`/topic/customer/${user.id}`, (update) => {
        const statusMessages = {
          ACCEPTED: "Your order has been accepted! ✅",
          PREPARING: "Butcher is preparing your meat... 🔪",
          READY: "Your order is packed and ready! 📦",
          PICKED_UP: "Rider is on the way to you! 🛵",
          DELIVERED: "Order delivered! Enjoy your fresh cut! 🎉",
          CANCELLED: "Sorry, your order was cancelled. ❌"
        };
        
        triggerNotification(
          "🛒 Order Update",
          statusMessages[update.status] || `Order #${update.id} is now ${update.status}`
        );
      });
      if (sub) subs.push(sub);
    }

    return () => subs.forEach(s => s.unsubscribe());
  }, [connected, user?.id, user?.role, user?.shopId]);

  return null; // This component doesn't render anything, it just listens
}
