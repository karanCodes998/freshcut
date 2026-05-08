import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi, requestPasswordReset, resetPassword } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const roleRoutes = { CUSTOMER: '/customer', BUTCHER: '/butcher', RIDER: '/rider', ADMIN: '/admin' };

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login' or 'forgot'
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const { data } = await loginApi({ phone, password });
      login(data, data.token);
      navigate(roleRoutes[data.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid phone or password');
    } finally { setLoading(false); }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await requestPasswordReset({ phone: forgotPhone });
      setOtp(data.otp); // Developer Auto-Fill: Capture OTP from response
      setForgotStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request reset. Check your phone number.');
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await resetPassword({ phone: forgotPhone, otp, newPassword });
      setSuccess('Password reset successfully! You can now login.');
      setView('login');
      setForgotStep(1);
      setForgotPhone(''); setOtp(''); setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔪</div>
          <h1 className="text-3xl font-black text-gray-900">
            {view === 'login' ? 'Welcome back!' : 'Reset Password'}
          </h1>
          <p className="text-gray-500 mt-1">
            {view === 'login' ? 'Sign in to your FreshCut account' : 'Enter your details to recover access'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl mb-5 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-2xl mb-5 text-sm font-medium flex items-center gap-2">
              <span>✅</span>{success}
            </div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">📱 Phone Number</label>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="e.g. 9876543210" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">🔒 Password</label>
                  <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-orange-600 hover:underline">Forgot Password?</button>
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="••••••••" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 text-base mt-2">
                {loading ? '⏳ Signing in...' : '🚀 Sign In'}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-slide-up">
              {forgotStep === 1 ? (
                <form onSubmit={handleRequestReset} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📱 Enter Registered Phone</label>
                    <input type="tel" required value={forgotPhone} onChange={e => setForgotPhone(e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="9876543210" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
                    {loading ? '⏳ Checking...' : 'Next Step →'}
                  </button>
                  <button type="button" onClick={() => setView('login')} className="w-full text-center text-sm font-bold text-gray-500 hover:text-gray-700">
                    Cancel and go back
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReset} className="space-y-5">
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-[10px] text-blue-700 font-bold mb-2">
                    ℹ️ Check your device for the OTP code.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🔢 Enter OTP</label>
                    <input type="text" required value={otp} onChange={e => setOtp(e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="123456" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🔒 New Password</label>
                    <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="Create a strong password" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-green-500 text-white font-black py-4 rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-100">
                    {loading ? '⏳ Updating...' : '✅ Reset Password'}
                  </button>
                  <button type="button" onClick={() => setForgotStep(1)} className="w-full text-center text-sm font-bold text-gray-500 hover:text-gray-700">
                    Go back to phone entry
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-600 font-bold hover:underline">Sign Up →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
