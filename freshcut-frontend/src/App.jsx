import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalNotifications from './components/GlobalNotifications';
import Help from './pages/Help';

// Customer
import ShopList from './pages/customer/ShopList';
import ShopMenu from './pages/customer/ShopMenu';
import Checkout from './pages/customer/Checkout';
import OrderTracking from './pages/customer/OrderTracking';
import OrderHistory from './pages/customer/OrderHistory';

// Butcher
import ButcherDashboard from './pages/butcher/Dashboard';

// Rider
import RiderDashboard from './pages/rider/Dashboard';

// Admin
import AdminDashboard from './pages/admin/Dashboard';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roleRoutes = { CUSTOMER: '/customer', BUTCHER: '/butcher', RIDER: '/rider', ADMIN: '/admin' };
  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <GlobalNotifications />
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/help" element={<Help />} />

          {/* Customer */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']} />}>
            <Route path="/customer" element={<ShopList />} />
            <Route path="/customer/shops/:id" element={<ShopMenu />} />
            <Route path="/customer/checkout" element={<Checkout />} />
            <Route path="/customer/orders" element={<OrderHistory />} />
            <Route path="/customer/orders/:id" element={<OrderTracking />} />
          </Route>

          {/* Butcher */}
          <Route element={<ProtectedRoute allowedRoles={['BUTCHER', 'ADMIN']} />}>
            <Route path="/butcher" element={<ButcherDashboard />} />
            <Route path="/butcher/menu" element={<ButcherDashboard />} />
            <Route path="/butcher/shop" element={<ButcherDashboard />} />
          </Route>

          {/* Rider */}
          <Route element={<ProtectedRoute allowedRoles={['RIDER', 'ADMIN']} />}>
            <Route path="/rider" element={<RiderDashboard />} />
            <Route path="/rider/earnings" element={<RiderDashboard />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/shops" element={<AdminDashboard />} />
            <Route path="/admin/riders" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
