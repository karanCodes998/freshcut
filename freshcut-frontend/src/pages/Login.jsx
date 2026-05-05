import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const roleRoutes = { CUSTOMER: '/customer', BUTCHER: '/butcher', RIDER: '/rider', ADMIN: '/admin' };

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await loginApi({ phone, password });
      login(data, data.token);
      navigate(roleRoutes[data.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid phone or password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔪</div>
          <h1 className="text-3xl font-black text-gray-900">Welcome back!</h1>
          <p className="text-gray-500 mt-1">Sign in to your FreshCut account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl mb-5 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📱 Phone Number</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                placeholder="e.g. 9876543210" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🔒 Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 text-base mt-2">
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-600 font-bold hover:underline">Sign Up →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
