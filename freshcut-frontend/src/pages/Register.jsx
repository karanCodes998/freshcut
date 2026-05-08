import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const roleRoutes = { CUSTOMER: '/customer', BUTCHER: '/butcher', RIDER: '/rider', ADMIN: '/admin' };

const ROLES = [
  { value: 'CUSTOMER', label: '🛒 Customer', desc: 'Order fresh meat delivered to you' },
  { value: 'BUTCHER', label: '🏪 Butcher Shop', desc: 'Sell fresh meat to customers' },
  { value: 'RIDER', label: '🛵 Delivery Rider', desc: 'Earn by delivering orders' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'CUSTOMER', upiId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.phone.replace(/\D/g,'').length < 10) {
      setError('Phone number must be at least 10 digits.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const { data } = await registerApi(form);
      login(data, data.token);
      navigate(roleRoutes[data.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔪</div>
          <h1 className="text-3xl font-black text-gray-900">Join FreshCut</h1>
          <p className="text-gray-500 mt-1">Create your account to get started</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl mb-5 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">I am a...</label>
              <div className="grid grid-cols-1 gap-2">
                {ROLES.map(role => (
                  <button type="button" key={role.value}
                    onClick={() => setForm({ ...form, role: role.value })}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                      form.role === role.value
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}>
                    <span className="text-xl">{role.label.split(' ')[0]}</span>
                    <div>
                      <div className={`font-bold text-sm ${form.role === role.value ? 'text-orange-700' : 'text-gray-800'}`}>
                        {role.label.substring(2)}
                      </div>
                      <div className="text-gray-400 text-xs">{role.desc}</div>
                    </div>
                    {form.role === role.value && <span className="ml-auto text-orange-500">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">👤 Full Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                placeholder="John Doe" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📱 Phone Number</label>
              <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                placeholder="9876543210" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🔒 Password</label>
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                placeholder="Create a strong password" />
            </div>

            {form.role === 'RIDER' && (
              <div className="animate-slide-up">
                <label className="block text-sm font-bold text-gray-700 mb-2">💸 UPI ID / Number <span className="text-gray-400 font-normal">(for payouts)</span></label>
                <input type="text" required value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })}
                  className="w-full border-2 border-blue-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-400 transition-colors bg-blue-50 focus:bg-white"
                  placeholder="e.g. 9876543210@upi" />
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 text-base">
              {loading ? '⏳ Creating account...' : '🚀 Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 font-bold hover:underline">Sign In →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
