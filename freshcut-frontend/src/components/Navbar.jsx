import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

const navLinks = {
  CUSTOMER: [
    { to: '/customer', label: '🏠 Home' },
    { to: '/customer/orders', label: '📋 Orders' },
  ],
  BUTCHER: [
    { to: '/butcher', label: '📊 Dashboard' },
    { to: '/butcher/menu', label: '🍖 Menu' },
    { to: '/butcher/shop', label: '🏪 My Shop' },
  ],
  RIDER: [
    { to: '/rider', label: '🛵 Dashboard' },
  ],
  ADMIN: [
    { to: '/admin', label: '📊 Overview' },
    { to: '/admin/shops', label: '🏪 Shops' },
    { to: '/admin/riders', label: '🛵 Riders' },
  ],
};

const roleColors = {
  CUSTOMER: 'from-orange-500 to-red-500',
  BUTCHER: 'from-green-600 to-emerald-500',
  RIDER: 'from-blue-600 to-indigo-500',
  ADMIN: 'from-purple-600 to-violet-500',
};

const roleBadge = {
  CUSTOMER: 'bg-orange-100 text-orange-700',
  BUTCHER: 'bg-green-100 text-green-700',
  RIDER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = user ? (navLinks[user.role] || []) : [];
  const gradient = user ? roleColors[user.role] : 'from-orange-500 to-red-500';

  return (
    <nav className={`bg-gradient-to-r ${gradient} text-white shadow-lg sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🔪</span>
            <span className="text-xl font-black tracking-tight">
              Fresh<span className="opacity-75">Cut</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    location.pathname === link.to
                      ? 'bg-white/20 shadow-inner'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleBadge[user.role]} bg-white`}>
                    {user.role}
                  </span>
                  <span className="text-sm font-medium opacity-90">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all hidden md:block"
                >
                  Logout
                </button>
                {/* Mobile menu button */}
                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 bg-white/20 rounded-lg">
                  {menuOpen ? '✖' : '☰'}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold hover:opacity-80 transition hidden md:block">Login</Link>
                <Link to="/register" className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Nav Links */}
        {user && menuOpen && (
          <div className="md:hidden py-3 border-t border-white/20 animate-slide-down">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleBadge[user.role]} bg-white`}>
                  {user.role}
                </span>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              {links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-base font-bold transition-all ${
                    location.pathname === link.to ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-lg text-base font-bold text-red-100 bg-red-500/20 mt-2"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
